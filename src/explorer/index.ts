/**
 * Data Explorer module
 *
 * Provides the sidebar tree view showing:
 * - Databases
 * - Schemas
 * - Tables
 * - Columns with types
 *
 * Implements VS Code TreeDataProvider interface.
 */

export { ExplorerProvider } from './provider';
export { SchemaLoader } from './schema-loader';
export {
  previewTable,
  copyTableName,
  copyColumnName,
  copySelectStatement,
  newQueryForTable,
  copySchemaName,
  showDatabaseProperties,
  dropTable,
  truncateTable,
  copyCreateTable,
  // Enhanced column actions
  insertColumnName,
  filterByColumn,
  sortByColumn,
  // Enhanced table actions
  showTableInfo,
  renameTable,
  generateInsertTemplate,
} from './actions';
export * from './nodes';
