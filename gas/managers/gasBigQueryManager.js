/**
 * @file gasBigQueryManager.js
 * @description Provides methods to manage BigQuery resources such as datasets and tables.
 * This module supports creating datasets and tables, inserting rows, and deleting data based on queries.
 *
 * Usage Example:
 * const manager = gasBigQueryManager({ projectId: 'my-project', datasetId: 'my_dataset', tableId: 'my_table' });
 * manager.createDataset();
 * manager.createTable('my_table', schemaDefinition);
 * manager.insertRows([{ id: 'row1', value: 123 }, { id: 'row2', value: 456 }]);
 * manager.deleteRows("id = 'row1'");
 */

/* global BigQuery, console */

const gasBigQueryManager = (params = {}) => {
  const {
    projectId,
    datasetId,
    tableId
  } = params;

  if (!projectId || !datasetId) {
    throw new Error("gasBigQueryManager: projectId and datasetId are required.");
  }

  /**
   * Creates a BigQuery dataset if it doesn't already exist.
   * Logs a warning if the dataset already exists (HTTP 409).
   * @throws {Error} If dataset creation fails for reasons other than already existing.
   */
  const createDataset = () => {
    const datasetResource = {
      datasetReference: {
        datasetId,
        projectId
      }
    };

    try {
      BigQuery.Datasets.insert(datasetResource, projectId);
      console.info(`Dataset "${datasetId}" created successfully.`);
    } catch (error) {
      handleGoogleJsonResponseException(error, `Dataset "${datasetId}"`);
    }
  };

  /**
   * Creates a BigQuery table with the given schema.
   * Logs a warning if the table already exists (HTTP 409).
   * @param {string} tId - The ID of the table to create.
   * @param {Array<Object>} schema - The schema definition for the table.
   * @throws {Error} If the table creation fails for reasons other than already existing.
   */
  const createTable = (tId, schema) => {
    if (!tId || !schema) {
      throw new Error("gasBigQueryManager.createTable: tId and schema are required.");
    }

    const tableResource = {
      tableReference: {
        projectId,
        datasetId,
        tableId: tId
      },
      schema: {
        fields: schema
      }
    };

    try {
      BigQuery.Tables.insert(tableResource, projectId, datasetId);
      console.info(`Table "${tId}" created successfully in dataset "${datasetId}".`);
    } catch (error) {
      handleGoogleJsonResponseException(error, `Table "${tId}" in dataset "${datasetId}"`);
    }
  };

  /**
   * Inserts multiple rows into a BigQuery table.
   * @param {Array<Object>} rows - Array of row objects to insert.
   * @throws {Error} If the insertion fails or if tableId is not set.
   */
  const insertRows = (rows) => {
    if (!tableId) {
      throw new Error("gasBigQueryManager.insertRows: tableId is not set. Unable to insert rows.");
    }

    if (!Array.isArray(rows)) {
      throw new Error("gasBigQueryManager.insertRows: Rows must be an array of objects.");
    }

    const insertAllData = {
      rows: rows.map(row => ({ json: row }))
    };

    try {
      const response = BigQuery.Tabledata.insertAll(insertAllData, projectId, datasetId, tableId);

      if (response.insertErrors && response.insertErrors.length > 0) {
        console.error(`Insert Errors: ${JSON.stringify(response.insertErrors)}`);
        throw new Error(`Errors occurred while inserting rows: ${JSON.stringify(response.insertErrors)}`);
      }

      console.info(`Successfully inserted ${rows.length} rows into ${projectId}.${datasetId}.${tableId}.`);
    } catch (error) {
      console.error(`Error inserting rows: ${error.message}`);
      throw error;
    }
  };

  /**
   * Deletes rows from a BigQuery table based on a query.
   * @param {string} whereClause - The WHERE clause to identify rows to delete.
   * @throws {Error} If the deletion fails or if tableId is not set.
   */
  const deleteRows = (whereClause) => {
    if (!tableId) {
      throw new Error("gasBigQueryManager.deleteRows: tableId is not set. Unable to delete rows.");
    }

    if (!whereClause) {
      throw new Error("gasBigQueryManager.deleteRows: WHERE clause is required to delete rows.");
    }

    const deleteQuery = `
      DELETE FROM \`${projectId}.${datasetId}.${tableId}\`
      WHERE ${whereClause};
    `;

    const request = {
      query: deleteQuery,
      useLegacySql: false
    };

    try {
      const queryResults = BigQuery.Jobs.query(request, projectId);

      if (!queryResults.jobComplete) {
        throw new Error("Delete query did not complete successfully.");
      }

      console.info(`Rows deleted successfully from ${projectId}.${datasetId}.${tableId} where ${whereClause}.`);
    } catch (error) {
      console.error(`Error deleting rows: ${error.message}`);
      throw error;
    }
  };

  /**
   * Handles GoogleJsonResponseException errors thrown by BigQuery operations.
   * Logs a warning if the resource already exists (HTTP 409),
   * otherwise re-throws the error.
   *
   * @param {Error} error - The error thrown.
   * @param {string} resourceDescription - Description of the resource (e.g., "Dataset my_dataset").
   */
  const handleGoogleJsonResponseException = (error, resourceDescription) => {
    if (error.name === 'GoogleJsonResponseException' && error.details) {
      const statusCode = error.details.code;
      const message = error.details.message;

      if (statusCode === 409) {
        console.warn(`${resourceDescription} already exists.`);
        return;
      }

      console.error(`BigQuery Error (Code: ${statusCode}): ${message}`);
      throw error;
    } else {
      console.error(`Unexpected error: ${error.message}`);
      throw error;
    }
  };

  return Object.freeze({
    createDataset,
    createTable,
    insertRows,
    deleteRows
  });
};

