/**
 * File query module
 *
 * Provides:
 * - Direct querying of Parquet, CSV, JSON files
 * - Drag-drop support for SQL generation
 * - File context menu commands
 */

export {
  previewFile,
  describeFile,
  newQueryForFile,
  copyFileQuery,
  insertFileQuery,
  previewFileWithOptions,
  importFileToTable,
} from './commands';

export { FileQueryDropProvider } from './drop-provider';

export {
  SUPPORTED_EXTENSIONS,
  isSupportedFile,
  isSupportedExtension,
  getFileType,
  getFileTypeName,
  generateSelectQuery,
  generateDescribeQuery,
  generateCountQuery,
  escapeFilePath,
} from './utils';
