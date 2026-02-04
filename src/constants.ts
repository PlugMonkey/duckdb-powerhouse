/**
 * Extension-wide constants
 */

/** Extension identifier used in commands and settings */
export const EXTENSION_ID = 'duckdb-powerhouse';

/** Display name shown in UI */
export const EXTENSION_NAME = 'DuckDB Powerhouse';

/** View IDs */
export const VIEWS = {
  EXPLORER: 'duckdbExplorer',
} as const;

/** Command IDs */
export const COMMANDS = {
  // Connection commands
  CREATE_CONNECTION: `${EXTENSION_ID}.createConnection`,
  DISCONNECT: `${EXTENSION_ID}.disconnect`,
  RECONNECT: `${EXTENSION_ID}.reconnect`,
  // Query execution commands
  RUN_QUERY: `${EXTENSION_ID}.runQuery`,
  RUN_SELECTED_QUERY: `${EXTENSION_ID}.runSelectedQuery`,
  EXPLAIN_QUERY: `${EXTENSION_ID}.explainQuery`,
  CANCEL_QUERY: `${EXTENSION_ID}.cancelQuery`,
  // Explorer commands
  REFRESH_EXPLORER: `${EXTENSION_ID}.refreshExplorer`,
  PREVIEW_TABLE: `${EXTENSION_ID}.previewTable`,
  COPY_TABLE_NAME: `${EXTENSION_ID}.copyTableName`,
  COPY_SELECT_STATEMENT: `${EXTENSION_ID}.copySelectStatement`,
  NEW_QUERY_FOR_TABLE: `${EXTENSION_ID}.newQueryForTable`,
  COPY_COLUMN_NAME: `${EXTENSION_ID}.copyColumnName`,
  // Schema commands
  REFRESH_SCHEMA: `${EXTENSION_ID}.refreshSchema`,
  COPY_SCHEMA_NAME: `${EXTENSION_ID}.copySchemaName`,
  // Table DDL commands
  DROP_TABLE: `${EXTENSION_ID}.dropTable`,
  TRUNCATE_TABLE: `${EXTENSION_ID}.truncateTable`,
  REFRESH_TABLE: `${EXTENSION_ID}.refreshTable`,
  COPY_CREATE_TABLE: `${EXTENSION_ID}.copyCreateTable`,
  // Database commands
  DATABASE_PROPERTIES: `${EXTENSION_ID}.databaseProperties`,
  // File query commands
  PREVIEW_FILE: `${EXTENSION_ID}.previewFile`,
  DESCRIBE_FILE: `${EXTENSION_ID}.describeFile`,
  NEW_QUERY_FOR_FILE: `${EXTENSION_ID}.newQueryForFile`,
  COPY_FILE_QUERY: `${EXTENSION_ID}.copyFileQuery`,
  PREVIEW_FILE_WITH_OPTIONS: `${EXTENSION_ID}.previewFileWithOptions`,
  IMPORT_FILE_TO_TABLE: `${EXTENSION_ID}.importFileToTable`,
  // Results panel commands
  CLEAR_RESULTS: `${EXTENSION_ID}.clearResults`,
  EXPORT_TSV: `${EXTENSION_ID}.exportTsv`,
  EXECUTE_RAW_SQL: `${EXTENSION_ID}.executeRawSql`,
  // Editor commands
  NEW_SQL_FILE: `${EXTENSION_ID}.newSqlFile`,
  // Data operations commands
  CREATE_TABLE_WIZARD: `${EXTENSION_ID}.createTableWizard`,
  IMPORT_DATA: `${EXTENSION_ID}.importData`,
  IMPORT_DATA_FROM_URL: `${EXTENSION_ID}.importDataFromUrl`,
  EXPORT_TABLE: `${EXTENSION_ID}.exportTable`,
  EXPORT_RESULTS: `${EXTENSION_ID}.exportResults`,
  COPY_TABLE_AS_CSV: `${EXTENSION_ID}.copyTableAsCsv`,
  COPY_TABLE_AS_JSON: `${EXTENSION_ID}.copyTableAsJson`,
  // Help commands
  OPEN_WALKTHROUGH: `${EXTENSION_ID}.openWalkthrough`,
  // Enhanced column commands
  INSERT_COLUMN_NAME: `${EXTENSION_ID}.insertColumnName`,
  FILTER_BY_COLUMN: `${EXTENSION_ID}.filterByColumn`,
  SORT_BY_COLUMN: `${EXTENSION_ID}.sortByColumn`,
  // Enhanced table commands
  SHOW_TABLE_INFO: `${EXTENSION_ID}.showTableInfo`,
  RENAME_TABLE: `${EXTENSION_ID}.renameTable`,
} as const;

/** Configuration keys (without extension prefix) */
export const CONFIG_KEYS = {
  MAX_RESULT_ROWS: 'maxResultRows',
  DUCKDB_PATH: 'duckdbPath',
  DEFAULT_RESULT_LIMIT: 'defaultResultLimit',
  AUTO_CONNECT: 'autoConnect',
  SHOW_ROW_NUMBERS: 'showRowNumbers',
  CONFIRM_LARGE_RESULTS: 'confirmLargeResults',
  QUERY_TIMEOUT: 'queryTimeout',
} as const;

/** Default values */
export const DEFAULTS = {
  MAX_RESULT_ROWS: 10000,
  DEFAULT_RESULT_LIMIT: 100,
  PREVIEW_LIMIT: 100,
} as const;

/** Supported file extensions for direct querying */
export const SUPPORTED_FILE_EXTENSIONS = ['.parquet', '.csv', '.tsv', '.json', '.jsonl', '.ndjson'] as const;
