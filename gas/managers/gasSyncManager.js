/**
 * @OnlyCurrentDoc
 */

const gasSyncManager = (params = {}) => {
  const {
    projectId,
    datasetId,
    tableId = 'time',
    calendarId
  } = params;

  if (!projectId || !datasetId || !tableId || !calendarId) {
    throw new Error('projectId, datasetId, tableId, and calendarId are required');
  }

  /**
   * Main function to sync calendar events to BigQuery.
   */
  const syncCalendarToBigQuery = () => {
    const syncToken = getSyncToken();
    const events = fetchCalendarEvents(syncToken);

    if (events.length > 0) {
      const enrichedEvents = addTimestamp(events);
      insertEventsIntoBigQuery(enrichedEvents);
      updateSyncToken();
      console.info(`Synced ${enrichedEvents.length} events to BigQuery.`);
    } else {
      console.info('No new events to sync.');
    }
  };

  /**
   * Fetch events from Google Calendar.
   * @param {string|null} syncToken - The sync token for incremental updates.
   * @returns {Array<Object>} - List of calendar events.
   */
  const fetchCalendarEvents = (syncToken) => {
    const optionalArgs = {
      maxResults: 250,
      showDeleted: true,
      singleEvents: true,
      orderBy: 'startTime'
    };

    if (syncToken) {
      optionalArgs.syncToken = syncToken;
    }

    const response = Calendar.Events.list(calendarId, optionalArgs);
    const events = response.items || [];

    // Save the new sync token for future use
    if (response.nextSyncToken) {
      PropertiesService.getScriptProperties().setProperty('SYNC_TOKEN', response.nextSyncToken);
    }

    return events;
  };

  /**
   * Add current timestamp to each event.
   * @param {Array<Object>} events - List of events to enrich.
   * @returns {Array<Object>} - Enriched events with a timestamp.
   */
  const addTimestamp = (events) => {
    const currentTimestamp = new Date().toISOString();

    return events.map(event => {
      event.record_load_time = currentTimestamp;
      return event;
    });
  };

  /**
   * Parse the Categories field from JSON string to an array.
   * @param {string} categoriesJson - JSON string of categories.
   * @returns {Array<string>} - Parsed categories array or empty array if invalid.
   */
  const parseCategories = (categoriesJson) => {
    if (!categoriesJson) return [];
    try {
      const arr = JSON.parse(categoriesJson);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn('Failed to parse categories JSON:', e);
      return [];
    }
  };

  /**
   * Insert events into BigQuery.
   * Enhanced to include extended properties and additional fields: 
   * iCalUID, creator email, created_time, modified_time, 
   * as well as Code, Client, Project, Task, Rate, Comments, CompanySize, Categories, OriginalTitle, deleted.
   *
   * @param {Array<Object>} events - List of enriched events to insert.
   */
  const insertEventsIntoBigQuery = (events) => {
    const rows = events.map(event => {
      const sharedProps = event.extendedProperties && event.extendedProperties.shared 
        ? event.extendedProperties.shared 
        : {};

      return {
        json: {
          record_load_time: event.record_load_time,
          id: event.id,
          summary: event.summary || '',
          description: event.description || '',
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
          code: sharedProps.Code || '',
          client: sharedProps.Client || '',
          project: sharedProps.Project || '',
          task: sharedProps.Task || '',
          rate: sharedProps.Rate || '',
          comments: sharedProps.Comments || '',
          company_size: sharedProps.CompanySize || '',
          categories: parseCategories(sharedProps.Categories),
          original_title: sharedProps.OriginalTitle || '',
          deleted: event.status === 'cancelled',
          ical_uid: event.iCalUID || '',
          creator_email: (event.creator && event.creator.email) || '',
          created_time: event.created || '',
          modified_time: event.updated || ''
        }
      };
    });

    const insertAllData = { rows: rows };
    const response = BigQuery.Tabledata.insertAll(insertAllData, projectId, datasetId, tableId);

    if (response.insertErrors) {
      console.error('Errors occurred while inserting rows: ' + JSON.stringify(response.insertErrors));
    }
  };

  /**
   * Get the current sync token.
   * @returns {string|null} - The sync token or null if not available.
   */
  const getSyncToken = () => {
    return PropertiesService.getScriptProperties().getProperty('SYNC_TOKEN');
  };

  /**
   * Update the sync token (handled in fetchCalendarEvents).
   */
  const updateSyncToken = () => {
    // Sync token is updated in fetchCalendarEvents, no additional action needed here
  };

  /**
   * Reset the sync token to perform a full sync.
   */
  const resetSyncToken = () => {
    PropertiesService.getScriptProperties().deleteProperty('SYNC_TOKEN');
    console.info('Sync token has been reset. The next sync will perform a full sync.');
  };

  return Object.freeze({
    syncCalendarToBigQuery,
    fetchCalendarEvents,
    addTimestamp,
    insertEventsIntoBigQuery,
    getSyncToken,
    updateSyncToken,
    resetSyncToken
  });
};
