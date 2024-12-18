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
const TIME_TABLE_SCHEMA = [
  { name: 'record_load_time', type: 'TIMESTAMP', mode: 'REQUIRED' },
  { name: 'id', type: 'STRING', mode: 'REQUIRED' },
  { name: 'summary', type: 'STRING', mode: 'NULLABLE' },
  { name: 'description', type: 'STRING', mode: 'NULLABLE' },
  { name: 'start', type: 'TIMESTAMP', mode: 'REQUIRED' },
  { name: 'end', type: 'TIMESTAMP', mode: 'NULLABLE' },
  { name: 'code', type: 'STRING', mode: 'NULLABLE' },
  { name: 'client', type: 'STRING', mode: 'NULLABLE' },
  { name: 'project', type: 'STRING', mode: 'NULLABLE' },
  { name: 'task', type: 'STRING', mode: 'NULLABLE' },
  { name: 'rate', type: 'STRING', mode: 'NULLABLE' },
  { name: 'comments', type: 'STRING', mode: 'NULLABLE' },
  { name: 'company_size', type: 'STRING', mode: 'NULLABLE' },
  { name: 'categories', type: 'STRING', mode: 'REPEATED' },
  { name: 'original_title', type: 'STRING', mode: 'NULLABLE' },
  { name: 'deleted', type: 'BOOL', mode: 'NULLABLE' },
  { name: 'ical_uid', type: 'STRING', mode: 'NULLABLE' },
  { name: 'creator_email', type: 'STRING', mode: 'NULLABLE' },
  { name: 'created_time', type: 'TIMESTAMP', mode: 'NULLABLE' },
  { name: 'modified_time', type: 'TIMESTAMP', mode: 'NULLABLE' }
];


  