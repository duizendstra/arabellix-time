/* global CacheService, SpreadsheetApp, BigQuery, console */

/**
 * @file gasProjectInfoManager.js
 * @description Manages project-related data stored in a Google Sheet and synchronizes it with BigQuery.
 * This module provides methods for fetching, transforming, and maintaining project information,
 * ensuring consistency and supporting advanced reporting and querying capabilities.
 */

/**
 * The `gasProjectInfoManager` is responsible for managing project-related data stored in a Google Sheet
 * and syncing it with BigQuery. It provides caching for improved performance and utility methods to transform,
 * retrieve, and keep project information up-to-date in BigQuery.
 *
 * The Google Sheet is expected to have the following header structure:
 * Code, Client, Project, Task, Default, From, To, Rate, Description, Comments, Company size, Categories.
 *
 * - The `Code` uniquely identifies the task with all the associated data.
 * - The template sheet ID is `15bpKYmmfzFUqsbviv83rvMJGxwGlZD7JQ6tOklymDwQ`.
 * - Calculated fields `record_date_time` and `modified_time` are added during syncing to BigQuery.
 *
 * @param {Object} params - Configuration parameters.
 * @param {string} params.spreadsheetId - The ID of the Google Spreadsheet.
 * @param {string} [params.sheetName="Projects"] - The name of the sheet containing project data.
 * @param {string} [params.cacheKey="projectInfo"] - The key used for caching.
 * @param {number} [params.cacheExpiry=3600] - Cache expiration time in seconds (default: 1 hour).
 * @param {Object} params.bigQueryManager - Instance of the BigQuery manager for syncing data.
 * @returns {Object} - Methods for interacting with project data.
 */
const gasProjectInfoManager = (params = {}) => {
  const {
    spreadsheetId,
    sheetName = "Projects",
    cacheKey = "projectInfo",
    cacheExpiry = 3600,
    bigQueryManager
  } = params;

  if (!spreadsheetId) {
    throw new Error("spreadsheetId is required");
  }

  if (!bigQueryManager) {
    throw new Error("bigQueryManager is required for syncing data to BigQuery");
  }

  /**
   * Clears the cache for project data.
   */
  const clearCache = () => {
    const cache = CacheService.getUserCache();
    cache.remove(cacheKey);
    console.log('Cache cleared successfully.');
  };

  /**
   * Fetches data from the cache.
   * @returns {Array|null} - Cached data or null if not available.
   */
  const fetchFromCache = () => {
    const cache = CacheService.getUserCache();
    const cachedData = cache.get(cacheKey);
    return cachedData ? JSON.parse(cachedData) : null;
  };

  /**
   * Fetches data from the Google Sheet.
   * @returns {Array} - Data from the sheet excluding the header row.
   */
  const fetchFromSpreadsheet = () => {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    const dataRange = sheet.getDataRange();
    return dataRange.getValues().slice(1); // Exclude header row
  };

  /**
   * Caches the provided data.
   * @param {Array} data - The data to cache.
   */
  const cacheData = (data) => {
    const cache = CacheService.getUserCache();
    cache.put(cacheKey, JSON.stringify(data), cacheExpiry);
  };

  /**
   * Fetches project data, either from cache or the spreadsheet.
   * @returns {Array} - The project data.
   */
  const fetchData = () => {
    let projectInfo = fetchFromCache();

    if (projectInfo) {
      console.log('Data fetched from cache');
    } else {
      projectInfo = fetchFromSpreadsheet();
      cacheData(projectInfo);
      console.log('Data fetched from spreadsheet and cached');
    }

    return projectInfo;
  };

  /**
   * Transforms project data into a nested structure.
   * @returns {Object} - Nested structure of clients, projects, and tasks.
   */
  const getNestedStructure = () => {
    const data = fetchData();
    const nestedStructure = {};

    data.forEach(([code, client, project, task, is_default, start, end, rate, description, comments]) => {
      if (!nestedStructure[client]) {
        nestedStructure[client] = {};
      }
      if (!nestedStructure[client][project]) {
        nestedStructure[client][project] = [];
      }
      nestedStructure[client][project].push({
        code,
        task,
        is_default,
        start,
        end,
        rate,
        description,
        comments
      });
    });

    return nestedStructure;
  };

  /**
   * Retrieves active projects and tasks filtered by their start and end dates.
   * Includes the 'code' field as well.
   * @returns {Object} - A tree of active projects and tasks.
   */
  const getActiveProjectsTree = () => {
    const data = fetchData();
    const nestedStructure = {};
    const today = new Date().setHours(0, 0, 0, 0);

    data.forEach(([code, client, project, task, is_default, start, end, rate, description, comments]) => {
      const startDate = start ? new Date(start).setHours(0, 0, 0, 0) : today;
      const endDate = end ? new Date(end).setHours(0, 0, 0, 0) : today;

      if (startDate <= today && endDate >= today) {
        if (!nestedStructure[client]) {
          nestedStructure[client] = {};
        }
        if (!nestedStructure[client][project]) {
          nestedStructure[client][project] = [];
        }
        nestedStructure[client][project].push({
          code,           // Include code here
          task,
          is_default,
          start,
          end,
          rate,
          description,
          comments
        });
      }
    });

    return nestedStructure;
  };

  /**
   * Retrieves a list of active clients based on project dates.
   * @returns {Array} - Unique list of active clients.
   */
  const getActiveClients = () => {
    const data = fetchData();
    const today = new Date().setHours(0, 0, 0, 0);

    const clients = data
      .filter(([, client, , , , start, end]) => {
        const startDate = start ? new Date(start).setHours(0, 0, 0, 0) : today;
        const endDate = end ? new Date(end).setHours(0, 0, 0, 0) : today;
        return startDate <= today && endDate >= today && client;
      })
      .map(([, client]) => client);

    return [...new Set(clients)];
  };

  /**
   * Retrieves all unique clients from the project data.
   * @returns {Array} - Unique list of all clients.
   */
  const getClients = () => {
    const data = fetchData();
    return [...new Set(data.map(([, client]) => client))];
  };

  /**
   * Retrieves all unique projects from the project data.
   * @returns {Array} - Unique list of all projects.
   */
  const getProjects = () => {
    const data = fetchData();
    return [...new Set(data.map(([, , project]) => project))];
  };

  /**
   * Retrieves a list of active projects based on project dates.
   * @returns {Array} - Unique list of active projects.
   */
  const getActiveProjects = () => {
    const data = fetchData();
    const today = new Date().setHours(0, 0, 0, 0);

    const projects = data
      .filter(([, , project, , , start, end]) => {
        const startDate = start ? new Date(start).setHours(0, 0, 0, 0) : today;
        const endDate = end ? new Date(end).setHours(0, 0, 0, 0) : today;
        return startDate <= today && endDate >= today && project;
      })
      .map(([, , project]) => project);

    return [...new Set(projects)];
  };

  /**
   * Retrieves all unique tasks from the project data, including the code.
   * @returns {Array} - Unique list of all tasks with code and details.
   */
  const getTasks = () => {
    const data = fetchData();
    return data.map(([code, , , task, , , , rate, description, comments]) => ({
      code,
      task,
      rate,
      description,
      comments
    }));
  };

  /**
   * Retrieves a list of active tasks based on project dates.
   * @returns {Array} - Unique list of active tasks with their code and details.
   */
  const getActiveTasks = () => {
    const data = fetchData();
    const today = new Date().setHours(0, 0, 0, 0);

    return data
      .filter(([code, , , task, , start, end, rate, description, comments]) => {
        const startDate = start ? new Date(start).setHours(0, 0, 0, 0) : today;
        const endDate = end ? new Date(end).setHours(0, 0, 0, 0) : today;
        return startDate <= today && endDate >= today && task;
      })
      .map(([code, , , task, , , , rate, description, comments]) => ({
        code,
        task,
        rate,
        description,
        comments
      }));
  };

  /**
   * Syncs project data from the Google Sheet to the BigQuery `projects` table.
   * Adds calculated fields `record_date_time` and `modified_time` during the sync.
   * Clears the cache before syncing.
   * @throws {Error} If syncing fails.
   */
  const syncToBigQuery = () => {
    clearCache();
    const data = fetchData();
    const currentTime = new Date().toISOString();

    const rows = data.map(([code, client, project, task, is_default, start, end, rate, description, comments, budgetedHours, companySize, categories], index) => {
      const row = {
        record_date_time: currentTime,
        id: code ? String(code).trim() : null,
        client: client ? String(client).trim() : null,
        project: project ? String(project).trim() : null,
        task: task ? String(task).trim() : null,
        default: is_default === true || is_default === false ? is_default : null,
        from: start ? new Date(start).toISOString().replace('T', ' ').split('.')[0] : null,
        to: end ? new Date(end).toISOString().replace('T', ' ').split('.')[0] : null,
        rate: typeof rate === 'number' ? rate : parseFloat(rate) || null,
        description: description ? String(description).trim() : null,
        comments: comments ? String(comments).trim() : null,
        budgeted_hours: typeof budgetedHours === 'number' ? budgetedHours : parseFloat(budgetedHours) || null,
        company_size: companySize ? String(companySize).trim() : null,
        categories: categories ? categories.split(',').map(tag => tag.trim()) : [],
        modified_time: currentTime
      };

      // Validate the row against mandatory fields
      const mandatoryFields = ['record_date_time', 'id', 'client', 'project', 'task', 'from', 'to'];
      mandatoryFields.forEach((field) => {
        if (row[field] === null || row[field] === undefined) {
          throw new Error(`Row ${index + 1}: Missing mandatory field "${field}".`);
        }
      });

      return row;
    });

    try {
      bigQueryManager.insertRows(rows);
      console.log(`Successfully synced ${rows.length} rows to BigQuery.`);
    } catch (error) {
      console.error(`Error syncing data to BigQuery: ${error.message}`);
      throw error;
    }
  };

  return Object.freeze({
    fetchData,           // Fetches data from cache or spreadsheet
    getNestedStructure,  // Generates a nested structure of clients, projects, and tasks
    getActiveProjectsTree, // Retrieves a tree of active projects and tasks (with code included)
    getClients,          // Retrieves all unique clients
    getActiveClients,    // Retrieves active clients based on project dates
    getProjects,         // Retrieves all unique projects
    getActiveProjects,   // Retrieves active projects based on project dates
    getTasks,            // Retrieves all unique tasks with code
    getActiveTasks,      // Retrieves active tasks with code
    clearCache,          // Clears the cache
    syncToBigQuery       // Syncs data to BigQuery
  });
};
