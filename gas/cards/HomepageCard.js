/**
 * @file HomepageCard.js
 * @description Provides the primary UI for creating new calendar events. 
 * Allows the user to select date, client, project, task, and then create an event.
 * If the app is not initialized, redirects the user to the AdminCard.
 *
 * Behavior:
 * - Always show a dropdown for projects (even if one or multiple projects).
 * - Always show radio buttons for tasks (even if one or multiple tasks).
 * - The first project is always selected by default if multiple projects are available or if it's not set.
 * - The first task is always selected by default if multiple tasks are available or if it's not set.
 * - This logic also applies if the client or project changes, ensuring defaults are reapplied.
 */

/* global gasConfigManager, gasProjectInfoManager, gasBigQueryManager, gasCalendarManager, CardService, console, AdminCard */

const HomepageCard = (options = {}) => {
  console.log(`HomepageCard called with options: ${JSON.stringify(options)}`);

  const {
    parameters = {},
    formInput = {}
  } = options;

  const { event: actionEvent, code: paramCode = "", rate: paramRate = "" } = parameters;

  // Initialize configuration and check if app is ready
  const configManager = gasConfigManager();
  if (!configManager.isInitialized()) {
    console.log("App not initialized. Redirecting to AdminCard.");
    return AdminCard(options);
  }

  const { projectId, datasetId, spreadsheetId, calendarId } = configManager.getConfiguration();
  const projectInfoManager = gasProjectInfoManager({
    spreadsheetId,
    bigQueryManager: gasBigQueryManager({ projectId, datasetId, tableId: "projects" })
  });

  /** ------------------- State and Data Extraction ------------------- **/
  const eventTitle = formInput.eventTitle || "";
  const eventDescription = formInput.eventDescription || "";
  let client = formInput.Client;
  let project = formInput.Project;
  let task = formInput.Task;
  let taskDetails = { description: '', code: '', rate: '', comments: '', categories: '' };

  const nestedItems = projectInfoManager.getActiveProjectsTree();
  const companySize = formInput.companySize || taskDetails.companySize || "";

  /** ------------------- Event Handlers ------------------- **/
  const handleCreateEvent = () => {
    try {
      if (!calendarId) {
        throw new Error("No calendarId configured. Please run setup in AdminCard.");
      }

      const msSinceEpoch = formInput.eventDate && formInput.eventDate.msSinceEpoch
        ? parseInt(formInput.eventDate.msSinceEpoch, 10)
        : Date.now();
      const eventDate = new Date(msSinceEpoch);

      const now = new Date();
      const roundedStart = new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate(),
        now.getHours(),
        0, 0, 0
      );
      const oneHourLater = new Date(roundedStart.getTime() + 60 * 60 * 1000);

      const calendarManager = gasCalendarManager({ calendarId });

      const code = paramCode || "";
      const rate = paramRate || "";
      const comments = taskDetails.comments || "";
      const categoriesArray = taskDetails.categories ? [taskDetails.categories] : [];

      const newEventId = calendarManager.createEvent({
        title: eventTitle || "Untitled Event",
        startTime: roundedStart,
        endTime: oneHourLater,
        description: eventDescription || "Untitled Event",
        location: "",
        client,
        project,
        task,
        code,
        rate,
        comments,
        companySize,
        categories: categoriesArray,
        originalTitle: eventTitle
      });

      console.log(`Event created with ID: ${newEventId}`);
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText("Event created successfully!"))
        .build();
    } catch (error) {
      console.error(`Error creating event: ${error.message}`);
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText(`Failed to create event: ${error.message}`))
        .build();
    }
  };

  const handleInputChange = () => {
    return CardService.newActionResponseBuilder()
      .setNavigation(
        CardService.newNavigation().updateCard(buildUiCard())
      )
      .build();
  };

  /** ------------------- UI Builder Functions ------------------- **/
  const buildUiCard = () => {
    // Reapply default selections if needed
    // This ensures that when the card is rebuilt (e.g. after client/project change),
    // we always have the first project and first task selected if needed.
    applyDefaultSelections();

    const card = CardService.newCardBuilder()
      .setHeader(
        CardService.newCardHeader()
          .setTitle("New event")
          .setSubtitle("Manage your impact efficiently")
          .setImageUrl("https://duizendstra.com/images/arabellix_time_icon.png")
          .setImageStyle(CardService.ImageStyle.CIRCLE)
      );

    card.addSection(buildEventBasicsSection());
    card.addSection(buildWorkDetailsSection());

    if (task) {
      card.addSection(buildTaskDetailsSection());
    }

    card.addSection(buildEventActionsSection());

    return card.build();
  };

  /**
   * Ensures that if multiple projects exist and no project is selected, we pick the first one.
   * Similarly, if multiple tasks exist and no task is selected, we pick the first one.
   */
  const applyDefaultSelections = () => {
    const clientItems = projectInfoManager.getActiveClients();
    if (clientItems.length > 0 && !client) {
      client = clientItems[0];
    }

    if (client) {
      const selectedClient = nestedItems[client] || {};
      const projects = Object.keys(selectedClient);
      if (projects.length > 0) {
        // If no project selected or it doesn't exist, select first
        if (!project || !projects.includes(project)) {
          project = projects[0];
        }

        const tasks = selectedClient[project] || [];
        if (tasks.length > 0) {
          // If no task selected or it doesn't exist, select first
          if (!task || !tasks.find(t => t.task === task)) {
            task = tasks[0].task;
          }
          // Update taskDetails if a task is selected
          const selectedTask = tasks.find(t => t.task === task);
          if (selectedTask) {
            taskDetails = selectedTask;
          }
        }
      }
    }
  };

  const buildEventBasicsSection = () => {
    const section = CardService.newCardSection().setHeader('Event Basics');

    const dateInput = CardService.newDatePicker()
      .setFieldName('eventDate')
      .setTitle('Event Date')
      .setValueInMsSinceEpoch(new Date().getTime());
    section.addWidget(dateInput);

    const descriptionInput = CardService.newTextInput()
      .setFieldName('eventDescription')
      .setTitle('Description (This will become the Event Summary and description)')
      .setValue(eventDescription);
    section.addWidget(descriptionInput);

    const clientItems = projectInfoManager.getActiveClients();

    const clientInput = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName('Client')
      .setTitle('Client')
      .setOnChangeAction(
        CardService.newAction()
          .setFunctionName('HomepageCard')
          .setParameters({ event: "inputChangeClient" })
      );

    clientItems.forEach((clientItem) => {
      clientInput.addItem(clientItem, clientItem, clientItem === client);
    });
    section.addWidget(clientInput);

    if (clientItems.length === 0) {
      section.addWidget(
        CardService.newTextParagraph().setText("No active clients available. Please verify project data.")
      );
    }

    return section;
  };

  const buildWorkDetailsSection = () => {
    const section = CardService.newCardSection().setHeader('Work Details');

    if (client) {
      const selectedClient = nestedItems[client] || {};
      const projects = Object.keys(selectedClient);

      if (projects.length > 0) {
        // Projects dropdown
        const projectInput = CardService.newSelectionInput()
          .setType(CardService.SelectionInputType.DROPDOWN)
          .setTitle('Project')
          .setFieldName('Project')
          .setOnChangeAction(
            CardService.newAction()
              .setFunctionName('HomepageCard')
              .setParameters({ event: "inputChangeProject" })
          );

        projects.forEach((projectItem) => {
          projectInput.addItem(projectItem, projectItem, projectItem === project);
        });
        section.addWidget(projectInput);

        const tasks = selectedClient[project] || [];
        if (tasks.length > 0) {
          // Tasks radio buttons
          const taskInput = CardService.newSelectionInput()
            .setType(CardService.SelectionInputType.RADIO_BUTTON)
            .setTitle('Task')
            .setFieldName('Task')
            .setOnChangeAction(
              CardService.newAction()
                .setFunctionName('HomepageCard')
                .setParameters({ event: "inputChangeTask" })
            );

          tasks.forEach((t) => {
            taskInput.addItem(t.task, t.task, t.task === task);
          });
          section.addWidget(taskInput);

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

  const buildEventActionsSection = () => {
    const section = CardService.newCardSection().setHeader('Event Actions');

    const isButtonEnabled = !!(client && project && task);

    const newEventSaveButton = CardService.newTextButton()
      .setText('Create Event')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setDisabled(!isButtonEnabled)
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName("HomepageCard")
          .setParameters({
            event: "newEventSaveButton",
            code: taskDetails.code || ""
          })
      );

    if (!isButtonEnabled) {
      section.addWidget(
        CardService.newTextParagraph().setText(
          "Select client, project, and task to enable event creation."
        )
      );
    }

    section.addWidget(newEventSaveButton);
    return section;
  };

  /** ------------------- Event Handlers ------------------- **/
  const eventHandlers = {
    newEventSaveButton: handleCreateEvent,
    inputChangeClient: handleInputChange,
    inputChangeProject: handleInputChange,
    inputChangeTask: handleInputChange
  };

  return actionEvent && eventHandlers[actionEvent]
    ? eventHandlers[actionEvent]()
    : buildUiCard();
};
