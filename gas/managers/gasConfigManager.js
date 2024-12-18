/* global BigQuery, Calendar, SpreadsheetApp, console */

/**
 * The gasConfigManager is responsible for managing application configuration, initialization,
 * and setup processes. It handles tasks such as saving and retrieving configurations,
 * initializing application resources like BigQuery datasets and tables, copying a template spreadsheet,
 * and resetting the app configuration.
 */
const gasConfigManager = (params = {}) => {
  const {
    defaultSpreadsheetId,
    defaultCalendarId
  } = params;

  const CONFIG_FLAG = 'IS_INITIALIZED';
  const TEMPLATE_SPREADSHEET_ID = '15bpKYmmfzFUqsbviv83rvMJGxwGlZD7JQ6tOklymDwQ';

  /**
   * Checks if the app is initialized by validating the initialization flag in User Properties.
   * @returns {boolean} - Returns true if the app is initialized.
   */
  const isInitialized = () => {
    const properties = PropertiesService.getUserProperties();
    const initialized = properties.getProperty(CONFIG_FLAG) === 'true';
    console.log(`ConfigManager: App is ${initialized ? 'initialized' : 'not initialized'}.`);
    return initialized;
  };

  /**
   * Marks the app as initialized by setting the initialization flag.
   * @param {boolean} flag - The flag value to set (true or false).
   */
  const setInitialized = (flag) => {
    const properties = PropertiesService.getUserProperties();
    properties.setProperty(CONFIG_FLAG, flag ? 'true' : 'false');
    console.log(`ConfigManager: App initialization flag set to ${flag}.`);
  };

  /**
   * Saves the required configurations (Spreadsheet ID, Calendar ID, Project ID, Dataset ID) into User Properties.
   * @param {Object} config - The configuration object containing `spreadsheetId`, `calendarId`, `projectId`, and `datasetId`.
   * @throws {Error} If required properties are missing.
   */
  const saveConfiguration = (config) => {
    const { spreadsheetId, calendarId, projectId, datasetId } = config;

    if (!spreadsheetId || !calendarId || !projectId || !datasetId) {
      throw new Error('Spreadsheet ID, Calendar ID, Project ID, and Dataset ID are required for initialization.');
    }

    try {
      const properties = PropertiesService.getUserProperties();
      properties.setProperties({
        SPREADSHEET_ID: spreadsheetId,
        CALENDAR_ID: calendarId,
        PROJECT_ID: projectId,
        DATASET_ID: datasetId
      });

      setInitialized(true); // Mark as initialized
      console.log('ConfigManager: Configuration saved successfully.');
    } catch (error) {
      console.error(`ConfigManager: Error saving configuration: ${error.message}`);
      throw error;
    }
  };

  /**
   * Retrieves the current configuration from User Properties.
   * @returns {Object} - The current configuration containing `spreadsheetId`, `calendarId`, `projectId`, and `datasetId`.
   */
  const getConfiguration = () => {
    const properties = PropertiesService.getUserProperties();
    const spreadsheetId = properties.getProperty('SPREADSHEET_ID') || defaultSpreadsheetId;
    const calendarId = properties.getProperty('CALENDAR_ID') || defaultCalendarId;
    const projectId = properties.getProperty('PROJECT_ID');
    const datasetId = properties.getProperty('DATASET_ID');

    if (!spreadsheetId || !calendarId || !projectId || !datasetId) {
      console.warn('ConfigManager: Configuration is incomplete.');
    }

    return { spreadsheetId, calendarId, projectId, datasetId };
  };

  /**
   * Creates a copy of the template Google Sheet with the given name.
   * @param {string} copyName - The name of the copied spreadsheet.
   * @returns {string} - The ID of the copied spreadsheet.
   * @throws {Error} If the sheet copying fails.
   */
  const createSheetCopy = (copyName = 'Arabellix Time Projects') => {
    try {
      const templateSpreadsheet = SpreadsheetApp.openById(TEMPLATE_SPREADSHEET_ID);
      const newSpreadsheet = templateSpreadsheet.copy(copyName);
      console.log(`Spreadsheet copied successfully with ID: ${newSpreadsheet.getId()}`);
      return newSpreadsheet.getId();
    } catch (error) {
      console.error(`ConfigManager: Error copying spreadsheet: ${error.message}`);
      throw error;
    }
  };

  /**
   * Completes the entire configuration process including creating datasets, tables, calendar, and a spreadsheet copy.
   * @param {Object} config - The configuration object containing `projectId`, `datasetId`, and `calendarName`.
   * @returns {Object} - Status and messages for the configuration process.
   */
  const configureApp = (config) => {
    const { projectId, datasetId = 'ara_time', calendarName = 'ara time' } = config;

    if (!projectId) {
      throw new Error('BigQuery Project ID is required.');
    }

    const messages = [];

    try {
      // Step 1: Create BigQuery Dataset
      const bigQueryManager = gasBigQueryManager({ projectId, datasetId });
      bigQueryManager.createDataset();
      messages.push(`Dataset "${datasetId}" created successfully.`);

      // Step 2: Create "time" Table
      bigQueryManager.createTable('time', TIME_TABLE_SCHEMA);
      messages.push('Table "time" created successfully.');

      // Step 3: Create "projects" Table
      bigQueryManager.createTable('projects', PROJECT_TABLE_SCHEMA);
      messages.push('Table "projects" created successfully.');

      // Step 4: Create Calendar
      const calendarManager = gasCalendarManager({ calendarName });
      const calendarId = calendarManager.createCalendar();
      messages.push(`Calendar "${calendarName}" created successfully with ID: ${calendarId}.`);

      // Step 5: Create Sheet Copy
      const spreadsheetId = createSheetCopy();
      messages.push('Spreadsheet copied successfully.');

      // Step 6: Save Configuration
      saveConfiguration({ projectId, datasetId, calendarName, spreadsheetId, calendarId });

      return { success: true, messages };
    } catch (error) {
      console.error(`ConfigManager: Configuration process failed: ${error.message}`);
      return { success: false, messages: [`Setup failed: ${error.message}`] };
    }
  };

  /**
   * Resets the initialization state by clearing only the properties managed by ConfigManager.
   * Ensures dependent services or states are also reset.
   * @throws {Error} If the reset fails.
   */
  const resetConfiguration = () => {
    try {
      const properties = PropertiesService.getUserProperties();
      const keysToDelete = ['SPREADSHEET_ID', 'CALENDAR_ID', 'PROJECT_ID', 'DATASET_ID', CONFIG_FLAG];
      keysToDelete.forEach(key => properties.deleteProperty(key));

      // Reset dependent states or services if applicable
      console.log('ConfigManager: Configuration reset successfully.');
    } catch (error) {
      console.error(`ConfigManager: Error resetting configuration: ${error.message}`);
      throw error;
    }
  };

  return Object.freeze({
    isInitialized, // Check if the app is initialized
    setInitialized, // Set or reset the initialization flag
    saveConfiguration, // Save configuration to User Properties
    getConfiguration, // Retrieve configuration from User Properties
    createSheetCopy, // Copy the template spreadsheet
    configureApp, // Complete the setup process
    resetConfiguration // Reset the app configuration
  });
};
