/**
 * @file ProjectSchema.js
 * @description Defines the schema for project-related data used in BigQuery.
 * This schema provides a structured and validated way to store and manage project metadata, 
 * ensuring consistency and supporting advanced reporting and querying capabilities.
 */

/**
 * The Project Schema defines the structure and metadata for storing project-related information
 * in BigQuery. Each field is designed to represent key attributes of a project, allowing for
 * detailed analysis and tracking. This schema supports optional and required fields,
 * flexible categorization, and proper handling of timestamps for audit purposes.
 * 
 * Fields:
 * - `record_date_time` (TIMESTAMP, REQUIRED): Timestamp of when the record was created.
 * - `id` (STRING, REQUIRED): Unique identifier for the project.
 * - `client` (STRING, REQUIRED): Name or identifier of the client associated with the project.
 * - `project` (STRING, REQUIRED): Name or identifier of the project. Ensure uniqueness.
 * - `task` (STRING, REQUIRED): Description or identifier of the task associated with the project.
 * - `default` (BOOLEAN, NULLABLE): Boolean flag indicating if the project is a default entry.
 * - `from` (TIMESTAMP, REQUIRED): Start timestamp for the project.
 * - `to` (TIMESTAMP, REQUIRED): End timestamp for the project; ongoing projects require a valid timestamp.
 * - `rate` (NUMERIC, NULLABLE): Financial rate associated with the project (e.g., hourly rate).
 * - `description` (STRING, NULLABLE): Additional details about the project.
 * - `comments` (STRING, NULLABLE): Free-form text for comments or remarks.
 * - `budgeted_hours` (NUMERIC, NULLABLE): Estimated hours allocated to the project.
 * - `company_size` (STRING, NULLABLE): Size of the client company in terms of employees or revenue.
 * - `categories` (REPEATED STRING, NULLABLE): List of categories or tags for flexible classification.
 * - `last_updated_time` (TIMESTAMP, NULLABLE): Timestamp of the last modification to the record.
 */
const PROJECT_TABLE_SCHEMA = [
    { 
      name: 'record_date_time', 
      type: 'TIMESTAMP', 
      mode: 'REQUIRED', 
      description: 'The timestamp when the record was created. Required for audit trails.' 
    },
    { 
      name: 'id', 
      type: 'STRING', 
      mode: 'REQUIRED', 
      description: 'A unique identifier for the project. Critical for identifying and querying projects.' 
    },
    { 
      name: 'client', 
      type: 'STRING', 
      mode: 'REQUIRED', 
      description: 'The name or identifier of the client associated with the project. Links projects to customers.' 
    },
    { 
      name: 'project', 
      type: 'STRING', 
      mode: 'REQUIRED', 
      description: 'The name or identifier of the project. Ensure it is unique for accurate identification.' 
    },
    { 
      name: 'task', 
      type: 'STRING', 
      mode: 'REQUIRED', 
      description: 'Description or identifier of the task within the project. Optional for more granular tracking.' 
    },
    { 
      name: 'default', 
      type: 'BOOLEAN', 
      mode: 'NULLABLE', 
      description: 'Flag indicating if this project is a default entry. Useful for configuration purposes.' 
    },
    { 
      name: 'from', 
      type: 'TIMESTAMP', 
      mode: 'REQUIRED', 
      description: 'The start date and time for the project. Marks the beginning of the project timeline.' 
    },
    { 
      name: 'to', 
      type: 'TIMESTAMP', 
      mode: 'REQUIRED', 
      description: 'The end date and time for the project. Ongoing projects require a valid timestamp.' 
    },
    { 
      name: 'rate', 
      type: 'NUMERIC', 
      mode: 'NULLABLE', 
      description: 'The financial rate associated with the project (e.g., hourly rate). Provides cost insights.' 
    },
    { 
      name: 'description', 
      type: 'STRING', 
      mode: 'NULLABLE', 
      description: 'Additional details or notes about the project. Useful for context or descriptions.' 
    },
    { 
      name: 'comments', 
      type: 'STRING', 
      mode: 'NULLABLE', 
      description: 'Free-form text for comments or remarks related to the project.' 
    },
    { 
      name: 'budgeted_hours', 
      type: 'NUMERIC', 
      mode: 'NULLABLE', 
      description: 'Estimated hours allocated for completing the project. Useful for planning and tracking.' 
    },
    { 
      name: 'company_size', 
      type: 'STRING', 
      mode: 'NULLABLE', 
      description: 'The size of the client company in terms of employees or revenue. Helps classify customers.' 
    },
    { 
      name: 'categories', 
      type: 'STRING', 
      mode: 'REPEATED', 
      description: 'List of categories or tags associated with the project. Supports flexible classification.' 
    },
    { 
      name: 'modified_time', 
      type: 'TIMESTAMP', 
      mode: 'NULLABLE', 
      description: 'The timestamp of the last modification made to the project record. Ensures data freshness.' 
    }
  ];
  