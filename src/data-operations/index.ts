/**
 * Data Operations module
 *
 * Provides centralized functions for:
 * - Creating tables (wizard, from file, from URL, from query)
 * - Importing data (from files, URLs)
 * - Exporting data (tables, query results)
 *
 * All user-facing operations should use these functions to ensure
 * consistent behavior across different entry points (commands, menus, etc.)
 */

export { createTableWizard } from './create-table';
export type { ColumnDefinition, CreateTableResult } from './create-table';

export {
  importDataFromFile,
  importDataFromUrl,
  showImportFilePicker,
} from './import';
export type { ImportOptions, ImportResult } from './import';

export {
  exportTableToFile,
  exportQueryResultsToFile,
  copyTableToClipboard,
  promptForExportFormat,
  showExportSaveDialog,
} from './export';
export type { ExportFormat, ExportOptions, ExportResult } from './export';
