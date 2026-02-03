import * as vscode from 'vscode';
import * as path from 'path';

import { ConnectionManager } from '../connection';
import { Logger } from '../utils/logger';
import { SUPPORTED_FILE_EXTENSIONS } from '../constants';

/**
 * Options for importing data.
 */
export interface ImportOptions {
  /** Source file path */
  filePath?: string;
  /** Source URL (for remote files) */
  url?: string;
  /** Target table name (will prompt if not provided) */
  tableName?: string;
  /** Whether to append to existing table instead of creating new */
  appendToExisting?: boolean;
  /** CSV-specific options */
  csvOptions?: {
    header?: boolean;
    delimiter?: string;
    quote?: string;
  };
}

/**
 * Result of an import operation.
 */
export interface ImportResult {
  success: boolean;
  tableName?: string;
  rowCount?: number;
  error?: string;
}

/**
 * Get the appropriate read function for a file type.
 */
function getReadFunction(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.parquet':
      return 'read_parquet';
    case '.csv':
    case '.tsv':
      return 'read_csv';
    case '.json':
    case '.jsonl':
    case '.ndjson':
      return 'read_json';
    default:
      return 'read_csv'; // Default to CSV
  }
}

/**
 * Escape a file path for use in SQL.
 */
function escapeFilePath(filePath: string): string {
  return filePath.replace(/'/g, "''");
}

/**
 * Sanitize a table name (remove special chars, ensure valid identifier).
 */
function sanitizeTableName(name: string): string {
  // Remove extension if present
  const baseName = path.basename(name, path.extname(name));
  // Replace non-alphanumeric chars with underscore
  let sanitized = baseName.replace(/[^a-zA-Z0-9_]/g, '_');
  // Ensure it starts with a letter or underscore
  if (/^[0-9]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }
  return sanitized.toLowerCase();
}

/**
 * Prompt user for a table name.
 */
async function promptForTableName(defaultName: string): Promise<string | undefined> {
  const tableName = await vscode.window.showInputBox({
    prompt: 'Enter table name',
    value: sanitizeTableName(defaultName),
    validateInput: (value) => {
      if (!value.trim()) {
        return 'Table name is required';
      }
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
        return 'Table name must start with a letter or underscore and contain only alphanumeric characters';
      }
      return undefined;
    },
  });
  return tableName;
}

/**
 * Show file picker for data files.
 */
export async function showImportFilePicker(): Promise<vscode.Uri | undefined> {
  const filters: Record<string, string[]> = {
    'Data Files': ['csv', 'tsv', 'parquet', 'json', 'jsonl', 'ndjson'],
    'CSV Files': ['csv', 'tsv'],
    'Parquet Files': ['parquet'],
    'JSON Files': ['json', 'jsonl', 'ndjson'],
    'All Files': ['*'],
  };

  const uris = await vscode.window.showOpenDialog({
    canSelectMany: false,
    canSelectFolders: false,
    filters,
    title: 'Select data file to import',
  });

  return uris?.[0];
}

/**
 * Import data from a file into a new table.
 * This is the centralized import function used by all import paths.
 */
export async function importDataFromFile(
  connectionManager: ConnectionManager,
  options: ImportOptions = {}
): Promise<ImportResult> {
  // Ensure connected
  if (!connectionManager.isConnected) {
    const connect = await vscode.window.showWarningMessage(
      'Not connected to a database. Create a connection first?',
      'Create Connection',
      'Cancel'
    );
    if (connect === 'Create Connection') {
      await vscode.commands.executeCommand('duckdb-powerhouse.createConnection');
      // Check if now connected
      if (!connectionManager.isConnected) {
        return { success: false, error: 'No database connection' };
      }
    } else {
      return { success: false, error: 'No database connection' };
    }
  }

  // Get file path
  let filePath = options.filePath;
  if (!filePath) {
    const uri = await showImportFilePicker();
    if (!uri) {
      return { success: false, error: 'No file selected' };
    }
    filePath = uri.fsPath;
  }

  // Validate file extension
  const ext = path.extname(filePath).toLowerCase();
  const supportedExts = SUPPORTED_FILE_EXTENSIONS as readonly string[];
  if (!supportedExts.includes(ext)) {
    return { success: false, error: `Unsupported file type: ${ext}` };
  }

  // Get table name
  let tableName = options.tableName;
  if (!tableName) {
    const defaultName = path.basename(filePath);
    tableName = await promptForTableName(defaultName);
    if (!tableName) {
      return { success: false, error: 'No table name provided' };
    }
  }

  // Build the SQL
  const readFunc = getReadFunction(filePath);
  const escapedPath = escapeFilePath(filePath);

  let sql: string;
  if (options.appendToExisting) {
    sql = `INSERT INTO "${tableName}" SELECT * FROM ${readFunc}('${escapedPath}')`;
  } else {
    sql = `CREATE TABLE "${tableName}" AS SELECT * FROM ${readFunc}('${escapedPath}')`;
  }

  // Execute
  try {
    Logger.info('Importing data', { filePath, tableName });

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Importing data to ${tableName}...`,
        cancellable: false,
      },
      async () => {
        await connectionManager.execute(sql);
      }
    );

    // Get row count
    const countResult = await connectionManager.execute(
      `SELECT COUNT(*) as count FROM "${tableName}"`
    );
    const rowCount = countResult[0]?.['count'] as number;

    // Refresh explorer
    await vscode.commands.executeCommand('duckdb-powerhouse.refreshExplorer');

    void vscode.window.showInformationMessage(
      `Imported ${rowCount.toLocaleString()} rows into table "${tableName}"`
    );

    return { success: true, tableName, rowCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.error('Import failed', { filePath, tableName, error: message });
    void vscode.window.showErrorMessage(`Import failed: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Import data from a URL into a new table.
 * DuckDB can read directly from HTTP/HTTPS URLs.
 */
export async function importDataFromUrl(
  connectionManager: ConnectionManager,
  options: { url?: string; tableName?: string } = {}
): Promise<ImportResult> {
  // Ensure connected
  if (!connectionManager.isConnected) {
    void vscode.window.showWarningMessage('Not connected to a database');
    return { success: false, error: 'No database connection' };
  }

  // Get URL
  let url = options.url;
  if (!url) {
    url = await vscode.window.showInputBox({
      prompt: 'Enter URL to import (CSV, Parquet, or JSON)',
      placeHolder: 'https://example.com/data.csv',
      validateInput: (value) => {
        if (!value.trim()) {
          return 'URL is required';
        }
        try {
          new URL(value);
          return undefined;
        } catch {
          return 'Invalid URL';
        }
      },
    });
    if (!url) {
      return { success: false, error: 'No URL provided' };
    }
  }

  // Determine file type from URL
  const urlPath = new URL(url).pathname;

  // Get table name
  let tableName = options.tableName;
  if (!tableName) {
    const defaultName = path.basename(urlPath) || 'imported_data';
    tableName = await promptForTableName(defaultName);
    if (!tableName) {
      return { success: false, error: 'No table name provided' };
    }
  }

  // Build the SQL
  const readFunc = getReadFunction(urlPath || '.csv');
  const sql = `CREATE TABLE "${tableName}" AS SELECT * FROM ${readFunc}('${url}')`;

  // Execute
  try {
    Logger.info('Importing from URL', { url, tableName });

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Importing data from URL to ${tableName}...`,
        cancellable: false,
      },
      async () => {
        await connectionManager.execute(sql);
      }
    );

    // Get row count
    const countResult = await connectionManager.execute(
      `SELECT COUNT(*) as count FROM "${tableName}"`
    );
    const rowCount = countResult[0]?.['count'] as number;

    // Refresh explorer
    await vscode.commands.executeCommand('duckdb-powerhouse.refreshExplorer');

    void vscode.window.showInformationMessage(
      `Imported ${rowCount.toLocaleString()} rows into table "${tableName}"`
    );

    return { success: true, tableName, rowCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.error('Import from URL failed', { url, tableName, error: message });
    void vscode.window.showErrorMessage(`Import failed: ${message}`);
    return { success: false, error: message };
  }
}
