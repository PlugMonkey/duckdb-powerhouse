/**
 * Commands for querying data files.
 */

import * as vscode from 'vscode';

import { ConnectionManager } from '../connection';
import { queryResultEmitter, QueryExecutionResult } from '../editor/commands';
import { config } from '../utils/config';
import { Logger } from '../utils/logger';
import {
  generateSelectQuery,
  generateDescribeQuery,
  generateImportTableQuery,
  getFileTypeName,
  getFileType,
  isSupportedFile,
  generateSelectQueryWithOptions,
  CsvOptions,
} from './utils';

/** File size threshold (100MB) for showing warning */
const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024;

/**
 * Get file size in a human-readable format.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Preview data from a file (Parquet, CSV, JSON).
 */
export async function previewFile(
  uri: vscode.Uri,
  connectionManager: ConnectionManager
): Promise<void> {
  const filePath = uri.fsPath;

  if (!isSupportedFile(filePath)) {
    void vscode.window.showWarningMessage('Unsupported file type for preview');
    return;
  }

  // Check file size and warn for large files
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    if (stat.size > LARGE_FILE_THRESHOLD) {
      const proceed = await vscode.window.showWarningMessage(
        `This file is ${formatFileSize(stat.size)}. Loading may take a while. Continue?`,
        'Continue',
        'Cancel'
      );
      if (proceed !== 'Continue') {
        return;
      }
    }
  } catch {
    // Ignore stat errors, proceed with preview
  }

  // Ensure we have a connection
  if (!connectionManager.isConnected) {
    const action = await vscode.window.showWarningMessage(
      'Not connected to a database. Create an in-memory connection?',
      'Create Connection',
      'Cancel'
    );

    if (action === 'Create Connection') {
      await connectionManager.connectInMemory();
    } else {
      return;
    }
  }

  const fileTypeName = getFileTypeName(filePath);
  const limit = config.defaultResultLimit;
  const sql = generateSelectQuery(filePath, limit);

  Logger.info('Previewing file', { filePath, fileTypeName });

  const startTime = performance.now();

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Loading ${fileTypeName} file...`,
        cancellable: false,
      },
      async () => {
        const results = await connectionManager.execute(sql);
        const executionTimeMs = performance.now() - startTime;

        const columns = results.length > 0 ? Object.keys(results[0] ?? {}) : [];
        const rows: unknown[][] = results.map((row) =>
          columns.map((col): unknown => row[col])
        );

        const result: QueryExecutionResult = {
          sql,
          columns,
          rows,
          rowCount: results.length,
          executionTimeMs,
          truncated: results.length >= limit,
        };

        queryResultEmitter.fire(result);

        void vscode.window.showInformationMessage(
          `${fileTypeName} preview: ${results.length} rows in ${executionTimeMs.toFixed(0)}ms`
        );
      }
    );
  } catch (err) {
    const executionTimeMs = performance.now() - startTime;
    const message = err instanceof Error ? err.message : String(err);

    Logger.error('File preview failed', { filePath, error: message });

    const result: QueryExecutionResult = {
      sql,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs,
      truncated: false,
      error: message,
    };

    queryResultEmitter.fire(result);

    void vscode.window.showErrorMessage(`Failed to preview file: ${message}`);
  }
}

/**
 * Describe schema of a data file.
 */
export async function describeFile(
  uri: vscode.Uri,
  connectionManager: ConnectionManager
): Promise<void> {
  const filePath = uri.fsPath;

  if (!isSupportedFile(filePath)) {
    void vscode.window.showWarningMessage('Unsupported file type');
    return;
  }

  // Ensure we have a connection
  if (!connectionManager.isConnected) {
    const action = await vscode.window.showWarningMessage(
      'Not connected to a database. Create an in-memory connection?',
      'Create Connection',
      'Cancel'
    );

    if (action === 'Create Connection') {
      await connectionManager.connectInMemory();
    } else {
      return;
    }
  }

  const fileTypeName = getFileTypeName(filePath);
  const sql = generateDescribeQuery(filePath);

  Logger.info('Describing file', { filePath, fileTypeName });

  const startTime = performance.now();

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Analyzing ${fileTypeName} schema...`,
        cancellable: false,
      },
      async () => {
        const results = await connectionManager.execute(sql);
        const executionTimeMs = performance.now() - startTime;

        const columns = results.length > 0 ? Object.keys(results[0] ?? {}) : [];
        const rows: unknown[][] = results.map((row) =>
          columns.map((col): unknown => row[col])
        );

        const result: QueryExecutionResult = {
          sql,
          columns,
          rows,
          rowCount: results.length,
          executionTimeMs,
          truncated: false,
        };

        queryResultEmitter.fire(result);

        void vscode.window.showInformationMessage(
          `${fileTypeName} schema: ${results.length} columns`
        );
      }
    );
  } catch (err) {
    const executionTimeMs = performance.now() - startTime;
    const message = err instanceof Error ? err.message : String(err);

    Logger.error('File describe failed', { filePath, error: message });

    const result: QueryExecutionResult = {
      sql,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs,
      truncated: false,
      error: message,
    };

    queryResultEmitter.fire(result);

    void vscode.window.showErrorMessage(`Failed to describe file: ${message}`);
  }
}

/**
 * Open a new SQL editor with a query for the file.
 */
export async function newQueryForFile(uri: vscode.Uri): Promise<void> {
  const filePath = uri.fsPath;

  if (!isSupportedFile(filePath)) {
    void vscode.window.showWarningMessage('Unsupported file type');
    return;
  }

  const sql = generateSelectQuery(filePath);

  // Create a new untitled SQL document
  const doc = await vscode.workspace.openTextDocument({
    language: 'sql',
    content: sql,
  });

  await vscode.window.showTextDocument(doc);
}

/**
 * Copy the SELECT query for a file to clipboard.
 */
export async function copyFileQuery(uri: vscode.Uri): Promise<void> {
  const filePath = uri.fsPath;

  if (!isSupportedFile(filePath)) {
    void vscode.window.showWarningMessage('Unsupported file type');
    return;
  }

  const sql = generateSelectQuery(filePath);
  await vscode.env.clipboard.writeText(sql);

  void vscode.window.showInformationMessage('Query copied to clipboard');
}

/**
 * Insert file query at cursor position.
 * Used for drag-drop functionality.
 */
export function insertFileQuery(filePath: string): string {
  if (!isSupportedFile(filePath)) {
    return '';
  }

  return generateSelectQuery(filePath);
}

/**
 * Preview CSV file with custom delimiter options.
 */
export async function previewFileWithOptions(
  uri: vscode.Uri,
  connectionManager: ConnectionManager
): Promise<void> {
  const filePath = uri.fsPath;
  const fileType = getFileType(filePath);

  if (fileType !== 'csv') {
    void vscode.window.showWarningMessage('Custom options are only available for CSV/TSV files');
    return;
  }

  // Show delimiter options
  const delimiterChoice = await vscode.window.showQuickPick(
    [
      { label: 'Comma (,)', value: ',' },
      { label: 'Tab (\\t)', value: '\t' },
      { label: 'Semicolon (;)', value: ';' },
      { label: 'Pipe (|)', value: '|' },
      { label: 'Custom...', value: 'custom' },
    ],
    { placeHolder: 'Select CSV delimiter' }
  );

  if (!delimiterChoice) {
    return;
  }

  let delimiter = delimiterChoice.value;
  if (delimiter === 'custom') {
    const custom = await vscode.window.showInputBox({
      prompt: 'Enter custom delimiter character',
      placeHolder: ',',
    });
    if (!custom) return;
    delimiter = custom;
  }

  // Show encoding options
  const encodingChoice = await vscode.window.showQuickPick(
    [
      { label: 'UTF-8 (default)', value: '' },
      { label: 'Latin-1 (ISO-8859-1)', value: 'latin1' },
      { label: 'UTF-16', value: 'utf16' },
    ],
    { placeHolder: 'Select file encoding' }
  );

  if (!encodingChoice) {
    return;
  }

  const options: CsvOptions = {
    delimiter,
    encoding: encodingChoice.value || undefined,
  };

  // Ensure we have a connection
  if (!connectionManager.isConnected) {
    await connectionManager.connectInMemory();
  }

  const limit = config.defaultResultLimit;
  const sql = generateSelectQueryWithOptions(filePath, options, limit);

  Logger.info('Previewing CSV with options', { filePath, options });

  const startTime = performance.now();

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Loading CSV file...',
        cancellable: false,
      },
      async () => {
        const results = await connectionManager.execute(sql);
        const executionTimeMs = performance.now() - startTime;

        const columns = results.length > 0 ? Object.keys(results[0] ?? {}) : [];
        const rows: unknown[][] = results.map((row) =>
          columns.map((col): unknown => row[col])
        );

        const result: QueryExecutionResult = {
          sql,
          columns,
          rows,
          rowCount: results.length,
          executionTimeMs,
          truncated: results.length >= limit,
        };

        queryResultEmitter.fire(result);

        void vscode.window.showInformationMessage(
          `CSV preview: ${results.length} rows in ${executionTimeMs.toFixed(0)}ms`
        );
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.error('CSV preview with options failed', { filePath, error: message });
    void vscode.window.showErrorMessage(`Failed to preview file: ${message}`);
  }
}

/**
 * Import a data file into a new table.
 */
export async function importFileToTable(
  uri: vscode.Uri,
  connectionManager: ConnectionManager
): Promise<void> {
  const filePath = uri.fsPath;

  if (!isSupportedFile(filePath)) {
    void vscode.window.showWarningMessage('Unsupported file type for import');
    return;
  }

  // Ensure we have a connection
  if (!connectionManager.isConnected) {
    const action = await vscode.window.showWarningMessage(
      'Not connected to a database. Create an in-memory connection?',
      'Create Connection',
      'Cancel'
    );

    if (action === 'Create Connection') {
      await connectionManager.connectInMemory();
    } else {
      return;
    }
  }

  // Get table name from user
  const fileName = uri.fsPath.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '') ?? 'imported_data';
  const tableName = await vscode.window.showInputBox({
    prompt: 'Enter table name for imported data',
    value: fileName.replace(/[^a-zA-Z0-9_]/g, '_'),
    validateInput: (value) => {
      if (!value) return 'Table name is required';
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
        return 'Table name must start with a letter or underscore and contain only alphanumeric characters';
      }
      return null;
    },
  });

  if (!tableName) {
    return;
  }

  const fileTypeName = getFileTypeName(filePath);
  const sql = generateImportTableQuery(filePath, tableName);

  Logger.info('Importing file to table', { filePath, tableName });

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Importing ${fileTypeName} to table "${tableName}"...`,
        cancellable: false,
      },
      async () => {
        await connectionManager.execute(sql);

        void vscode.window.showInformationMessage(
          `Imported ${fileTypeName} file to table "${tableName}"`
        );

        // Refresh explorer to show new table
        void vscode.commands.executeCommand('duckdb-powerhouse.refreshExplorer');
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.error('Import to table failed', { filePath, tableName, error: message });
    void vscode.window.showErrorMessage(`Failed to import file: ${message}`);
  }
}
