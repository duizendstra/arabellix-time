/* global Calendar, console, Session */

/**
 * @file gasCalendarManager.js
 * @description Provides methods to manage Google Calendar resources such as calendars and events.
 * This module supports:
 * - Creating new calendars (if not provided) with a given name.
 * - Creating events with specified details.
 * - Updating existing events.
 * - Retrieving event information.
 * - Storing and updating extended properties for metadata.
 *
 * If the calendar already exists (HTTP 409), it logs a warning and treats the operation as successful,
 * returning the existing calendar's ID.
 *
 * Requires the Google Calendar Advanced Service to be enabled in your Apps Script project.
 *
 * @OnlyCurrentDoc
 */

/**
 * gasCalendarManager
 *
 * Responsible for:
 * - Creating a new Google Calendar with the specified name if needed.
 * - Creating events in a specified Google Calendar.
 * - Updating existing events' details and extended properties.
 * - Retrieving event information by event ID.
 *
 * @param {Object} params - Parameters for initializing the calendar manager.
 * @param {string} [params.calendarId] - The ID of the calendar to manage (optional).
 * @param {string} [params.calendarName] - The name of a calendar to create if needed.
 * @param {Object} [params.logManager=console] - Logger for debugging (defaults to console).
 * @returns {Object} An object with methods to manage calendar events and create a new calendar.
 */
const gasCalendarManager = (params = {}) => {
  const {
    calendarId = null,
    calendarName,
    logManager = console
  } = params;

  let activeCalendarId = calendarId;

  /**
   * Create a new event in the calendar using the Calendar advanced service.
   *
   * The 'description' field is used as both the event summary and the event's description,
   * ensuring that the event's details are fully captured and can be synchronized to BigQuery.
   *
   * @param {Object} eventDetails - Details of the event to create.
   * @param {Date} eventDetails.startTime - Event start time (Date object).
   * @param {Date} eventDetails.endTime - Event end time (Date object).
   * @param {string} [eventDetails.description='Untitled Event'] - Used as both event summary and description.
   * @param {string} [eventDetails.location=''] - Event location.
   * @param {string} [eventDetails.client=''] - Client metadata.
   * @param {string} [eventDetails.project=''] - Project metadata.
   * @param {string} [eventDetails.task=''] - Task metadata.
   * @param {string} [eventDetails.code=''] - Code metadata.
   * @param {string} [eventDetails.rate=''] - Rate metadata.
   * @param {string} [eventDetails.comments=''] - Comments metadata.
   * @param {string} [eventDetails.companySize=''] - Company size metadata.
   * @param {Array} [eventDetails.categories=[]] - Categories as an array.
   * @param {string} [eventDetails.originalTitle=''] - Original title from the UI.
   * @returns {string} The ID of the created event.
   * @throws {Error} If startTime/endTime are missing or invalid, or if no calendarId is set.
   */
  const createEvent = (eventDetails) => {
    if (!activeCalendarId) {
      throw new Error('gasCalendarManager: calendarId is required to create an event.');
    }

    const {
      startTime,
      endTime,
      description = 'Untitled Event',
      location = '',
      client = '',
      project = '',
      task = '',
      code = '',
      rate = '',
      comments = '',
      companySize = '',
      categories = [],
      originalTitle = ''
    } = eventDetails;

    validateEventTimes(startTime, endTime);

    const eventResource = {
      summary: description,
      description: description,
      location,
      start: { dateTime: startTime.toISOString(), timeZone: 'UTC' },
      end: { dateTime: endTime.toISOString(), timeZone: 'UTC' },
      extendedProperties: {
        shared: {
          Code: code,
          Client: client,
          Project: project,
          Task: task,
          Rate: rate,
          Comments: comments,
          CompanySize: companySize,
          Categories: JSON.stringify(categories),
          OriginalTitle: originalTitle
        }
      }
    };

    const event = Calendar.Events.insert(eventResource, activeCalendarId);
    logManager.info(`gasCalendarManager: Created event '${description}' with ID: ${event.id}`);
    return event.id;
  };

  /**
   * Update an existing event with new details.
   *
   * @param {string} eventId - The ID of the event to update.
   * @param {Object} updates - Updated event fields.
   * @throws {Error} If the event cannot be found, times are invalid, or if no calendarId is set.
   */
  const updateEvent = (eventId, updates) => {
    if (!activeCalendarId) {
      throw new Error('gasCalendarManager: calendarId is required to update an event.');
    }

    const event = getEvent(eventId);
    if (!event) {
      throw new Error(`gasCalendarManager.updateEvent: Event not found for ID: ${eventId}`);
    }

    const resource = {};

    if (updates.startTime && updates.endTime) {
      validateEventTimes(updates.startTime, updates.endTime);
      resource.start = { dateTime: updates.startTime.toISOString(), timeZone: 'UTC' };
      resource.end = { dateTime: updates.endTime.toISOString(), timeZone: 'UTC' };
    } else if (updates.startTime || updates.endTime) {
      throw new Error("gasCalendarManager.updateEvent: Both startTime and endTime must be provided to update event times.");
    }

    if (updates.description !== undefined) {
      resource.summary = updates.description;
    }

    if (updates.location !== undefined) {
      resource.location = updates.location;
    }

    const sharedProps = (event.extendedProperties && event.extendedProperties.shared) || {};
    const code = updates.code !== undefined ? updates.code : sharedProps.Code || '';
    const client = updates.client !== undefined ? updates.client : sharedProps.Client || '';
    const project = updates.project !== undefined ? updates.project : sharedProps.Project || '';
    const task = updates.task !== undefined ? updates.task : sharedProps.Task || '';
    const rate = updates.rate !== undefined ? updates.rate : sharedProps.Rate || '';
    const comments = updates.comments !== undefined ? updates.comments : sharedProps.Comments || '';
    const companySize = updates.companySize !== undefined ? updates.companySize : sharedProps.CompanySize || '';
    const categories = updates.categories !== undefined ? JSON.stringify(updates.categories) : (sharedProps.Categories || JSON.stringify([]));
    const originalTitle = updates.originalTitle !== undefined ? updates.originalTitle : sharedProps.OriginalTitle || '';

    resource.extendedProperties = {
      shared: {
        Code: code,
        Client: client,
        Project: project,
        Task: task,
        Rate: rate,
        Comments: comments,
        CompanySize: companySize,
        Categories: categories,
        OriginalTitle: originalTitle
      }
    };

    const updatedEvent = Calendar.Events.patch(resource, activeCalendarId, eventId);
    logManager.info(`gasCalendarManager: Updated event with ID: ${updatedEvent.id}`);
  };

  /**
   * Creates a Google Calendar with the specified name.
   * If the calendar already exists (HTTP 409), logs a warning and returns the existing calendar's ID.
   *
   * @returns {string} The ID of the newly created or existing calendar.
   * @throws {Error} If calendarName is not provided or other errors occur.
   */
  const createCalendar = () => {
    if (!calendarName) {
      throw new Error('calendarName is required to create a new calendar');
    }

    try {
      const userTimeZone = Session.getScriptTimeZone();
      const calendarResource = {
        summary: calendarName,
        timeZone: userTimeZone
      };

      const newCalendar = Calendar.Calendars.insert(calendarResource);
      activeCalendarId = newCalendar.id;
      logManager.info(`Calendar "${calendarName}" created successfully with ID: ${newCalendar.id}`);
      return newCalendar.id;
    } catch (error) {
      // Handle GoogleJsonResponseException for calendar creation
      if (error.name === 'GoogleJsonResponseException' && error.details) {
        const statusCode = error.details.code;
        const message = error.details.message;

        if (statusCode === 409) {
          // Calendar already exists
          logManager.warn(`Calendar "${calendarName}" already exists. Retrieving existing calendar ID.`);
          const existingCalendars = Calendar.CalendarList.list().items || [];
          const found = existingCalendars.find(cal => cal.summary.toLowerCase() === calendarName.toLowerCase());

          if (found) {
            activeCalendarId = found.id;
            return found.id;
          }

          // If for some reason we can't find it now, this is unexpected.
          logManager.error(`Calendar already exists but cannot find it by name: ${calendarName}.`);
          throw new Error(`Calendar "${calendarName}" already exists, but could not retrieve its ID.`);
        }

        logManager.error(`Calendar creation error (Code: ${statusCode}): ${message}`);
        throw error;
      } else {
        logManager.error(`Unexpected error creating calendar: ${error.message}`);
        throw error;
      }
    }
  };

  /**
   * Retrieve an event by its ID.
   *
   * @param {string} eventId - The event ID.
   * @returns {Object|null} The event object if found, otherwise null.
   */
  const getEvent = (eventId) => {
    if (!activeCalendarId) {
      throw new Error('gasCalendarManager: calendarId is required to get an event.');
    }

    try {
      return Calendar.Events.get(activeCalendarId, eventId);
    } catch (e) {
      logManager.warn(`gasCalendarManager.getEvent failed for ID: ${eventId}, error: ${e}`);
      return null;
    }
  };

  /**
   * Validates that the event start time is before the end time.
   *
   * @param {Date} start - The start time.
   * @param {Date} end - The end time.
   * @throws {Error} If times are invalid or start >= end.
   */
  const validateEventTimes = (start, end) => {
    if (!(start instanceof Date) || !(end instanceof Date)) {
      throw new Error("gasCalendarManager: startTime and endTime must be valid Date objects.");
    }
    if (start >= end) {
      throw new Error("gasCalendarManager: Event start time must be before end time.");
    }
  };

  return Object.freeze({
    createEvent,
    updateEvent,
    getEvent,
    createCalendar
  });
};
