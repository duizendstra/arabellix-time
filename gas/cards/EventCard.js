/**
 * @file EventCard.js
 * @description Provides a UI for updating an existing event, using the layout and logic from HomepageCard.
 *
 * Changes:
 * - No date picker is shown (unlike HomepageCard, which shows a date).
 * - Uses a description input similar to HomepageCard's "Description" field.
 * - Implements single project/task logic as in HomepageCard:
 *   If there's only one project, select it automatically.
 *   If there's only one task, select it automatically.
 *
 * Behavior:
 * - If `parameters.event` is "inputChangeClient", "inputChangeProject", or "inputChangeTask", we update the card in place.
 * - If `parameters.action` is "update", we update the card.
 * - If `parameters.action` is "save" (i.e. "updateEvent"), we patch the event on Calendar.
 */

/* global gasConfigManager, gasProjectInfoManager, gasBigQueryManager, gasCalendarManager, CardService, console, AdminCard, Calendar */

const EventCard = (params = {}) => {
  const {
    logManager = console,
    parameters = {},
    formInput = {},
    calendar, // object with calendarId and id of the event
    ...rest
  } = params;

  const eventParam = parameters.event;    // e.g. 'inputChangeClient', 'inputChangeProject', 'inputChangeTask'
  const action = parameters.action;       // e.g. 'update', 'save'
  const eventId = calendar?.id;
  const calendarId = calendar?.calendarId;

  logManager.log(`EventCard called with event: ${eventParam}, action: ${action}, eventId: ${eventId}`);

  // Validate eventId and calendar
  if (!calendarId || !eventId) {
    logManager.error("Calendar information is incomplete or eventId is missing.");
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText("Error: Missing calendar information or eventId."))
      .build();
  }

  // Initialize configuration and check if app is ready
  const configManager = gasConfigManager();
  if (!configManager.isInitialized()) {
    logManager.log("App not initialized. Redirecting to AdminCard.");
    return AdminCard(params);
  }

  const { projectId, datasetId, spreadsheetId } = configManager.getConfiguration();
  const projectInfoManager = gasProjectInfoManager({
    spreadsheetId,
    bigQueryManager: gasBigQueryManager({ projectId, datasetId, tableId: "projects" })
  });

  // Fetch the existing event from Calendar
  let calendarEvent;
  try {
    calendarEvent = Calendar.Events.get(calendarId, eventId);
  } catch (error) {
    logManager.error(`Error fetching event: ${error.message}`);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(`Failed to load event: ${error.message}`))
      .build();
  }

  const extendedProperties = calendarEvent.extendedProperties?.shared || {};
  // Using eventDescription to match HomepageCard style (was eventTitle previously)
  let eventDescription = formInput.eventDescription || "";

  // Pre-populate from the existing event if first load (no eventParam)
  let client = formInput.Client;
  let project = formInput.Project;
  let task = formInput.Task;

  if (!eventParam) {
    // Set defaults from the existing event
    client = client || extendedProperties.Client || "";
    project = project || extendedProperties.Project || "";
    task = task || extendedProperties.Task || "";
    eventDescription = eventDescription || calendarEvent.summary || "";
  }

  // If user changed client, reset project
  if (eventParam === "inputChangeClient") {
    project = undefined;
    task = undefined; // also reset task since project changed
  }

  if (eventParam === "inputChangeProject") {
    task = undefined;
  }

  const nestedItems = projectInfoManager.getActiveProjectsTree();
  let taskDetails = { description: '', code: '', rate: '', comments: '', categories: '' };

  /** ------------------- Event Handlers ------------------- **/
  const handleUpdateEvent = () => {
    try {
      // Patch the event on save: summary and description = eventDescription
      const updatedEvent = {
        summary: eventDescription,
        description: eventDescription,
        extendedProperties: {
          shared: {
            "Client": client,
            "Project": project,
            "Task": task
          }
        }
      };

      Calendar.Events.patch(updatedEvent, calendarId, eventId);

      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification()
          .setText('Event Updated.')
          .setType(CardService.NotificationType.INFO))
        .setStateChanged(true)
        .build();
    } catch (error) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification()
          .setText(`An error occurred: ${error.message}`)
          .setType(CardService.NotificationType.ERROR))
        .build();
    }
  };

  // Update the card in place for input changes
  const handleInputChange = () => {
    return CardService.newActionResponseBuilder()
      .setNavigation(
        CardService.newNavigation().updateCard(buildUiCard())
      )
      .build();
  };

  /** ------------------- UI Builder Functions ------------------- **/
  const buildUiCard = () => {
    const card = CardService.newCardBuilder()
      .setHeader(
        CardService.newCardHeader()
          .setTitle("Update Event")
          .setSubtitle("Modify your event details")
          .setImageUrl("https://duizendstra.com/images/arabellix_time_icon.png")
          .setImageStyle(CardService.ImageStyle.CIRCLE)
      );

    card.addSection(buildDescriptionSection());
    card.addSection(buildClientProjectTaskSection());

    if (taskDetails && taskDetails.task) {
      card.addSection(buildTaskDetailsSection());
    }

    card.addSection(buildSaveEventSection());

    return card.build();
  };

  const buildDescriptionSection = () => {
    const section = CardService.newCardSection();

    // Description input (like HomepageCard)
    const descriptionInput = CardService.newTextInput()
      .setFieldName('eventDescription')
      .setTitle('Description (This will become the Event Summary and description)')
      .setValue(eventDescription);
    section.addWidget(descriptionInput);

    return section;
  };

  const buildClientProjectTaskSection = () => {
    const section = CardService.newCardSection();

    const clientItems = projectInfoManager.getClients();
    if (clientItems.length > 0 && !client) {
      client = clientItems[0];
    }

    const clientInput = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName('Client')
      .setTitle('Client')
      .setOnChangeAction(
        CardService.newAction()
          .setFunctionName('EventCard')
          .setParameters({ event: "inputChangeClient", action: "update" })
      );

    clientItems.forEach((clientItem) => {
      clientInput.addItem(clientItem, clientItem, clientItem === client);
    });
    section.addWidget(clientInput);

    if (clientItems.length === 0) {
      section.addWidget(CardService.newTextParagraph().setText("No active clients available. Please verify project data."));
      return section;
    }

    if (client) {
      const selectedClient = nestedItems[client] || {};
      const projects = Object.keys(selectedClient);

      // If only one project, select automatically
      if (projects.length === 1) {
        project = project || projects[0];
        section.addWidget(
          CardService.newDecoratedText()
            .setTopLabel('Project')
            .setText(project)
        );

        const tasks = selectedClient[project] || [];
        if (tasks.length === 1) {
          // Only one task, select automatically
          const singleTask = tasks[0];
          task = task || singleTask.task;
          taskDetails = singleTask;
          section.addWidget(
            CardService.newDecoratedText()
              .setTopLabel('Task')
              .setText(singleTask.task)
          );
        } else if (tasks.length > 1) {
          // Multiple tasks, show selection
          if (task && !tasks.find(t => t.task === task)) {
            task = null;
          }

          const taskInput = CardService.newSelectionInput()
            .setType(CardService.SelectionInputType.RADIO_BUTTON)
            .setTitle('Task')
            .setFieldName('Task')
            .setOnChangeAction(
              CardService.newAction()
                .setFunctionName('EventCard')
                .setParameters({ event: "inputChangeTask", action: "update" })
            );

          tasks.forEach((t) => {
            taskInput.addItem(t.task, t.task, t.task === task);
          });
          section.addWidget(taskInput);

          if (task) {
            const selectedTask = tasks.find(t => t.task === task);
            if (selectedTask) {
              taskDetails = selectedTask;
            }
          }
        } else {
          section.addWidget(CardService.newTextParagraph().setText("No tasks found for this project."));
        }
      } else if (projects.length > 1) {
        // Multiple projects
        project = project || projects[0];

        const projectInput = CardService.newSelectionInput()
          .setType(CardService.SelectionInputType.RADIO_BUTTON)
          .setTitle('Project')
          .setFieldName('Project')
          .setOnChangeAction(
            CardService.newAction()
              .setFunctionName('EventCard')
              .setParameters({ event: "inputChangeProject", action: "update" })
          );

        projects.forEach((projectItem) => {
          projectInput.addItem(projectItem, projectItem, projectItem === project);
        });
        section.addWidget(projectInput);

        const tasks = selectedClient[project] || [];
        if (tasks.length === 1) {
          // Only one task
          const singleTask = tasks[0];
          task = singleTask.task;
          taskDetails = singleTask;
          section.addWidget(
            CardService.newDecoratedText()
              .setTopLabel('Task')
              .setText(singleTask.task)
          );
        } else if (tasks.length > 1) {
          // Multiple tasks
          if (task && !tasks.find(t => t.task === task)) {
            task = null;
          }

          const taskInput = CardService.newSelectionInput()
            .setType(CardService.SelectionInputType.RADIO_BUTTON)
            .setTitle('Task')
            .setFieldName('Task')
            .setOnChangeAction(
              CardService.newAction()
                .setFunctionName('EventCard')
                .setParameters({ event: "inputChangeTask", action: "update" })
            );

          tasks.forEach((t) => {
            taskInput.addItem(t.task, t.task, t.task === task);
          });
          section.addWidget(taskInput);

          if (task) {
            const selectedTask = tasks.find(t => t.task === task);
            if (selectedTask) {
              taskDetails = selectedTask;
            }
          }
        } else {
          section.addWidget(CardService.newTextParagraph().setText("No tasks found for this project."));
        }
      } else {
        section.addWidget(CardService.newTextParagraph().setText("No projects found for this client."));
      }
    } else {
      section.addWidget(CardService.newTextParagraph().setText("Select a client to view projects."));
    }

    return section;
  };

  const buildTaskDetailsSection = () => {
    const section = CardService.newCardSection().setHeader('Task Details');

    section.addWidget(
      CardService.newDecoratedText()
        .setTopLabel("Rate")
        .setText(taskDetails.rate || "N/A")
    );

    section.addWidget(
      CardService.newDecoratedText()
        .setTopLabel("Comments")
        .setText(taskDetails.comments || "N/A")
    );

    section.addWidget(
      CardService.newDecoratedText()
        .setTopLabel("Categories")
        .setText(taskDetails.categories || "N/A")
    );

    return section;
  };

  const buildSaveEventSection = () => {
    const section = CardService.newCardSection().setHeader('Event Actions');

    const isButtonEnabled = !!(client && project && task);

    const saveButtonParams = { event: "updateEvent", action: "save" };
    const updateEventButton = CardService.newTextButton()
      .setText('Update Event')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setDisabled(!isButtonEnabled)
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName("EventCard")
          .setParameters(saveButtonParams)
      );

    if (!isButtonEnabled) {
      section.addWidget(
        CardService.newTextParagraph().setText(
          "Select client, project, and task to enable event updating."
        )
      );
    }

    section.addWidget(updateEventButton);
    return section;
  };

  /** ------------------- Event Handlers ------------------- **/
  const eventHandlers = {
    updateEvent: handleUpdateEvent,
    inputChangeClient: handleInputChange,
    inputChangeProject: handleInputChange,
    inputChangeTask: handleInputChange
  };

  // If an event is triggered, handle it, else build the UI.
  return actionEvent && eventHandlers[actionEvent]
    ? eventHandlers[actionEvent]()
    : buildUiCard();
};
