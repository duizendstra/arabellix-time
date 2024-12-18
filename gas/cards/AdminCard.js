/**
 * @file AdminCard.js
 * @description Provides an administrative interface card for synchronizing and configuring data 
 * between Google Calendar events, Google Sheets, and BigQuery.
 *
 * State Overview:
 * - If not initialized (no configuration saved), show the setup form.
 * - Once initialized, show synchronization and reset options.
 *
 * Events:
 * - 'setup': Initializes configuration.
 * - 'syncEvents': Synchronizes events from Calendar to BigQuery.
 * - 'syncProjectData': Synchronizes project data from Sheets to BigQuery.
 * - 'resetSync': Resets synchronization token for Calendar events.
 * - 'resetConfig': Resets all configuration, allowing a fresh setup.
 */

/* global gasConfigManager, gasSyncManager, gasBigQueryManager, gasProjectInfoManager, CardService, console */

/**
 * Creates and returns an Admin Tools card for a Google Workspace Add-on.
 *
 * @param {Object} [options={}] - Configuration options and parameters for the card.
 * @param {Object} [options.parameters={}] - Parameters containing state and event information.
 * @param {string} [options.parameters.event] - The current event/action to handle (e.g., 'syncEvents', 'setup').
 * @param {string} [options.parameters.state] - The current state of the card (e.g., 'initialized').
 * @param {Object} [options.formInput={}] - User input from the form fields (e.g., PROJECT_ID, DATASET_ID).
 * @returns {CardService.ActionResponse|CardService.Card} - Returns a card or an action response depending on the event handling.
 */
const AdminCard = (options = {}) => {
  console.log(`AdminCard called with options: ${JSON.stringify(options)}`);

  const {
    parameters = {},
    formInput = {}
  } = options;

  const { event: actionEvent, state: currentState } = parameters;
  console.log(`AdminCard event: ${actionEvent}, state: ${currentState}`);

  const configManager = gasConfigManager();
  const config = configManager.getConfiguration();

  let syncManager = null;
  if (configManager.isInitialized()) {
    syncManager = gasSyncManager({
      projectId: config.projectId,
      datasetId: config.datasetId,
      tableId: 'time',
      calendarId: config.calendarId,
    });
  } else {
    console.warn("Configuration is not initialized. SyncManager cannot be created.");
  }

  /** ------------------- Event Handlers ------------------- **/

  /**
   * Synchronize Calendar events to BigQuery.
   */
  const handleSyncEvents = () => {
    if (!syncManager) {
      return errorActionResponse("Unable to synchronize events because configuration is not initialized.");
    }

    try {
      syncManager.syncCalendarToBigQuery();
      return successActionResponse("Events synchronized successfully!");
    } catch (error) {
      console.error(`Error synchronizing events: ${error.message}`);
      return errorActionResponse(`Failed to synchronize events. Error: ${error.message}`);
    }
  };

  /**
   * Synchronize project data from the Google Sheet to BigQuery.
   * After syncing, clear the cache to ensure that subsequent requests fetch fresh project and client data.
   */
  const handleSyncProjectData = () => {
    if (!configManager.isInitialized()) {
      return errorActionResponse("Configuration not initialized. Cannot synchronize project data.");
    }

    try {
      const bigQueryManager = gasBigQueryManager({
        projectId: config.projectId,
        datasetId: config.datasetId,
        tableId: 'projects'
      });

      const projectDataManager = gasProjectInfoManager({
        spreadsheetId: config.spreadsheetId,
        sheetName: 'Projects',
        bigQueryManager
      });

      projectDataManager.syncToBigQuery();
      // Clear the cache after syncing to ensure fresh data is loaded next time
      projectDataManager.clearCache();

      return successActionResponse("Project data synchronized and cache cleared successfully!");
    } catch (error) {
      console.error(`Error synchronizing project data: ${error.message}`);
      return errorActionResponse(`Failed to synchronize project data. Error: ${error.message}`);
    }
  };

  /**
   * Resets the synchronization token.
   * Causes next sync to perform a full synchronization.
   */
  const handleResetSync = () => {
    if (!syncManager) {
      return errorActionResponse("No sync manager available. Ensure configuration is initialized before resetting sync.");
    }

    try {
      syncManager.resetSyncToken();
      return successActionResponse("Synchronization reset successfully! A full sync will occur next time.");
    } catch (error) {
      console.error(`Error resetting synchronization: ${error.message}`);
      return errorActionResponse(`Failed to reset synchronization. Error: ${error.message}`);
    }
  };

  /**
   * Resets the configuration settings.
   * Allows re-running the setup process.
   */
  const handleResetConfig = () => {
    try {
      configManager.resetConfiguration();
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText('Configuration reset successfully!'))
        .setNavigation(
          CardService.newNavigation().updateCard(
            AdminCard({ parameters: { state: null, event: null } })
          )
        )
        .build();
    } catch (error) {
      console.error(`Error resetting configuration: ${error.message}`);
      return errorActionResponse(`Failed to reset configuration. Error: ${error.message}`);
    }
  };

  /**
   * Handles initial setup of configuration settings.
   */
  const handleSetup = () => {
    const projectIdInput = formInput.PROJECT_ID && formInput.PROJECT_ID.trim();
    const datasetIdInput = (formInput.DATASET_ID && formInput.DATASET_ID.trim()) || 'ara_time';
    const calendarNameInput = (formInput.CALENDAR_NAME && formInput.CALENDAR_NAME.trim()) || 'ara time';

    if (!projectIdInput) {
      return errorActionResponse("Project ID is required to complete setup. Please provide a valid Project ID.");
    }

    const { success, messages } = configManager.configureApp({
      projectId: projectIdInput,
      datasetId: datasetIdInput,
      calendarName: calendarNameInput
    });

    const notificationText = success
      ? 'Setup completed successfully!'
      : `Setup failed:\n${messages.join('\n')}`;

    if (success) {
      console.log('Configuration setup completed successfully!');
      const updatedParams = { ...parameters, state: 'initialized', event: null };
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText(notificationText))
        .setNavigation(
          CardService.newNavigation().updateCard(AdminCard({ parameters: updatedParams }))
        )
        .build();
    }

    console.error('Configuration setup failed.');
    return errorActionResponse(notificationText);
  };

  /** ------------------- UI Builders ------------------- **/

  /**
   * Builds the main Admin UI card based on current state.
   */
  const buildAdminUiCard = () => {
    const card = CardService.newCardBuilder()
      .setHeader(
        CardService.newCardHeader()
          .setTitle('Admin Tools')
          .setSubtitle('Manage backend data synchronization and configuration')
          .setImageUrl('https://duizendstra.com/images/arabellix_time_icon.png')
          .setImageStyle(CardService.ImageStyle.CIRCLE)
      );

    if (!configManager.isInitialized()) {
      card.addSection(buildInitializationSection());
    } else {
      card.addSection(buildSynchronizationSection());
      card.addSection(buildResetSection());
    }

    return card.build();
  };

  /**
   * Builds the initialization (setup) section.
   */
  const buildInitializationSection = () => {
    const section = CardService.newCardSection().setHeader('App Setup');

    const projectIdInput = CardService.newTextInput()
      .setFieldName('PROJECT_ID')
      .setValue(formInput.PROJECT_ID || '')
      .setTitle('BigQuery Project ID')
      .setHint('Required: Your Google Cloud Project ID');

    const datasetIdInput = CardService.newTextInput()
      .setFieldName('DATASET_ID')
      .setValue(formInput.DATASET_ID || 'ara_time')
      .setTitle('BigQuery Dataset ID')
      .setHint('Default: "ara_time"');

    const calendarNameInput = CardService.newTextInput()
      .setFieldName('CALENDAR_NAME')
      .setValue(formInput.CALENDAR_NAME || 'ara time')
      .setTitle('Calendar Name')
      .setHint('Default: "ara time"');

    const setupButton = CardService.newTextButton()
      .setText('Setup')
      .setTextButtonStyle(CardService.TextButtonStyle.OUTLINED)
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName('AdminCard')
          .setParameters({ event: 'setup' })
      );

    section.addWidget(projectIdInput);
    section.addWidget(datasetIdInput);
    section.addWidget(calendarNameInput);
    section.addWidget(setupButton);

    return section;
  };

  /**
   * Builds the synchronization section, shown when initialized.
   */
  const buildSynchronizationSection = () => {
    const section = CardService.newCardSection().setHeader('Synchronization');

    section.addWidget(
      CardService.newTextParagraph().setText(
        'Use these options to synchronize your data:\n' +
        '- Calendar events: Pull events from Google Calendar into BigQuery.\n' +
        '- Projects sheet: Pull project data from Google Sheets into BigQuery.'
      )
    );

    section.addWidget(
      CardService.newTextButton()
        .setText('Calendar events')
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('AdminCard')
            .setParameters({ event: 'syncEvents' })
        )
    );

    section.addWidget(
      CardService.newTextButton()
        .setText('Projects sheet')
        .setTextButtonStyle(CardService.TextButtonStyle.OUTLINED)
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('AdminCard')
            .setParameters({ event: 'syncProjectData' })
        )
    );

    return section;
  };

  /**
   * Builds the reset section, shown when initialized.
   */
  const buildResetSection = () => {
    const section = CardService.newCardSection().setHeader('Reset');

    section.addWidget(
      CardService.newTextParagraph().setText(
        'Reset Actions:\n' +
        '- Reset Synchronization: Clears the sync token, causing a full sync next time.\n' +
        '- Reset Configuration: Allows re-running setup. Existing dataset/tables remain. A new spreadsheet and calendar may be created if needed.'
      )
    );

    section.addWidget(
      CardService.newTextButton()
        .setText('Reset synchronization')
        .setTextButtonStyle(CardService.TextButtonStyle.OUTLINED)
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('AdminCard')
            .setParameters({ event: 'resetSync' })
        )
    );

    section.addWidget(
      CardService.newTextButton()
        .setText('Reset configuration')
        .setTextButtonStyle(CardService.TextButtonStyle.OUTLINED)
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('AdminCard')
            .setParameters({ event: 'resetConfig' })
        )
    );

    return section;
  };

  /** ------------------- Utility Functions ------------------- **/

  /**
   * Returns a success ActionResponse that also updates the card.
   * @param {string} message
   */
  const successActionResponse = (message) => {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(message))
      .setNavigation(
        CardService.newNavigation().updateCard(
          AdminCard({ ...options, parameters: { state: currentState, event: null } })
        )
      )
      .build();
  };

  /**
   * Returns an error ActionResponse with a notification.
   * Does not update the card to avoid losing the current state/input.
   * @param {string} errorMsg
   */
  const errorActionResponse = (errorMsg) => {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText(errorMsg)
      )
      .build();
  };

  /** ------------------- Main Execution ------------------- **/

  const eventHandlers = {
    syncEvents: handleSyncEvents,
    syncProjectData: handleSyncProjectData,
    resetSync: handleResetSync,
    resetConfig: handleResetConfig,
    setup: handleSetup,
  };

  // If there's an event, handle it. Otherwise, return the default UI.
  return (actionEvent && eventHandlers[actionEvent])
    ? eventHandlers[actionEvent]()
    : buildAdminUiCard();
};
