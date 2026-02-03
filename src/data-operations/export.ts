import * as vscode from 'vscode';
import * as path from 'path';

import { ConnectionManager } from '../connection';
import { Logger } from '../utils/logger';

/**
 * Supported export formats.
 */
export type ExportFormat = 'csv' | 'parquet' | 'json';

/**
 * Options for exporting data.
 */
export interface ExportOptions {
  /** Target file path (will prompt if not provided) */
  filePath?: string;
  /** Export format */
  format?: ExportFormat;
  /** For CSV: include header row */
  includeHeader?: boolean;
  /** For CSV: delimiter character */
  delimiter?: string;
}

/**
 * Result of an export operation.
 */
export interface ExportResult {
  success: boolean;
  filePath?: string;
  rowCount?: number;
  error?: string;
}

/**
 * Format metadata for UI.
 */
interface FormatInfo {
  label: string;
  extension: string;
  description: string;
}

const FORMAT_INFO: Record<ExportFormat, FormatInfo> = {
  csv: { label: 'CSV', extension: 'csv', description: 'Comma-separated values' },
  parquet: { label: 'Parquet', extension: 'parquet', description: 'Columnar format, best for large datasets' },
  json: { label: 'JSON', extension: 'json', description: 'JSON array of objects' },
};

/**
 * Prompt user to select export format.
 */
export async function promptForExportFormat(): Promise<ExportFormat | undefined> {
  const items = Object.entries(FORMAT_INFO).map(([key, info]) => ({
    label: info.label,
    description: info.description,
    format: key as ExportFormat,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select export format',
    title: 'Export Format',
  });

  return selected?.format;
}

/**
 * Show save dialog for export.
 */
export async function showExportSaveDialog(
  defaultName: string,
  format: ExportFormat
): Promise<vscode.Uri | undefined> {
  const info = FORMAT_INFO[format];

  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(defaultName + '.' + info.extension),
    filters: {
      [info.label]: [info.extension],
    },
    title: `Export as ${info.label}`,
  });

  return uri;
}

/**
 * Build COPY command for export.
 */
function buildCopyCommand(
  source: string,
  filePath: string,
  format: ExportFormat,
  options: ExportOptions
): string {
  const escapedPath = filePath.replace(/'/g, "''");

  switch (format) {
    case 'csv': {
      const header = options.includeHeader !== false ? 'HEADER' : '';
      const delimiter = options.delimiter || ',';
      return `COPY ${source} TO '${escapedPath}' (FORMAT CSV, ${header}, DELIMITER '${delimiter}')`;
    }
    case 'parquet':
      return `COPY ${source} TO '${escapedPath}' (FORMAT PARQUET)`;
    case 'json':
      return `COPY ${source} TO '${escapedPath}' (FORMAT JSON, ARRAY true)`;
    default:
      return `COPY ${source} TO '${escapedPath}'`;
  }
}

/**
 * Export a table to a file.
 * This is the centralized export function for tables.
 */
export async function exportTableToFile(
  connectionManager: ConnectionManager,
  tableName: string,
  schemaName: string = 'main',
  options: ExportOptions = {}
): Promise<ExportResult> {
  // Ensure connected
  if (!connectionManager.isConnected) {
    void vscode.window.showWarningMessage('Not connected to a database');
    return { success: false, error: 'No database connection' };
  }

  // Get format
  let format = options.format;
  if (!format) {
    format = await promptForExportFormat();
    if (!format) {
      return { success: false, error: 'No format selected' };
    }
  }

  // Get file path
  let filePath = options.filePath;
  if (!filePath) {
    const uri = await showExportSaveDialog(tableName, format);
    if (!uri) {
      return { success: false, error: 'No file selected' };
    }
    filePath = uri.fsPath;
  }

  // Build qualified table name
  const qualifiedName = schemaName === 'main'
    ? `"${tableName}"`
    : `"${schemaName}"."${tableName}"`;

  // Build and execute COPY command
  const sql = buildCopyCommand(qualifiedName, filePath, format, options);

  try {
    Logger.info('Exporting table', { tableName, schemaName, filePath, format });

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Exporting ${tableName}...`,
        cancellable: false,
      },
      async () => {
        await connectionManager.execute(sql);
      }
    );

    // Get row count for confirmation
    const countResult = await connectionManager.execute(
      `SELECT COUNT(*) as count FROM ${qualifiedName}`
    );
    const rowCount = countResult[0]?.['count'] as number;

    const action = await vscode.window.showInformationMessage(
      `Exported ${rowCount.toLocaleString()} rows to ${path.basename(filePath)}`,
      'Open File',
      'Open Folder'
    );

    if (action === 'Open File') {
      await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(filePath));
    } else if (action === 'Open Folder') {
      await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(filePath));
    }

    return { success: true, filePath, rowCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.error('Export failed', { tableName, filePath, error: message });
    void vscode.window.showErrorMessage(`Export failed: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Export query results to a file.
 * Takes the SQL query and exports its results.
 */
export async function exportQueryResultsToFile(
  connectionManager: ConnectionManager,
  sql: string,
  options: ExportOptions = {}
): Promise<ExportResult> {
  // Ensure connected
  if (!connectionManager.isConnected) {
    void vscode.window.showWarningMessage('Not connected to a database');
    return { success: false, error: 'No database connection' };
  }

  // Get format
  let format = options.format;
  if (!format) {
    format = await promptForExportFormat();
    if (!format) {
      return { success: false, error: 'No format selected' };
    }
  }

  // Get file path
  let filePath = options.filePath;
  if (!filePath) {
    const uri = await showExportSaveDialog('query_results', format);
    if (!uri) {
      return { success: false, error: 'No file selected' };
    }
    filePath = uri.fsPath;
  }

  // Wrap query in COPY
  const wrappedSql = buildCopyCommand(`(${sql.replace(/;$/, '')})`, filePath, format, options);

  try {
    Logger.info('Exporting query results', { filePath, format });

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Exporting query results...',
        cancellable: false,
      },
      async () => {
        await connectionManager.execute(wrappedSql);
      }
    );

    const action = await vscode.window.showInformationMessage(
      `Exported results to ${path.basename(filePath)}`,
      'Open File',
      'Open Folder'
    );

    if (action === 'Open File') {
      await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(filePath));
    } else if (action === 'Open Folder') {
      await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(filePath));
    }

    return { success: true, filePath };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.error('Export query results failed', { filePath, error: message });
    void vscode.window.showErrorMessage(`Export failed: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Copy table data to clipboard in specified format.
 */
export async function copyTableToClipboard(
  connectionManager: ConnectionManager,
  tableName: string,
  schemaName: string = 'main',
  format: 'csv' | 'json' = 'csv',
  limit: number = 10000
): Promise<boolean> {
  // Ensure connected
  if (!connectionManager.isConnected) {
    void vscode.window.showWarningMessage('Not connected to a database');
    return false;
  }

  const qualifiedName = schemaName === 'main'
    ? `"${tableName}"`
    : `"${schemaName}"."${tableName}"`;

  try {
    const results = await connectionManager.execute(
      `SELECT * FROM ${qualifiedName} LIMIT ${limit}`
    );

    const firstRow = results[0];
    if (results.length === 0 || !firstRow) {
      void vscode.window.showInformationMessage('Table is empty');
      return true;
    }

    let text: string;
    if (format === 'json') {
      text = JSON.stringify(results, null, 2);
    } else {
      // CSV format
      const columns = Object.keys(firstRow);
      const header = columns.join(',');
      const rows = results.map(row =>
        columns.map(col => {
          const val: unknown = row[col];
          if (val === null || val === undefined) return '';
          const str = String(val);
          // Quote if contains comma, quote, or newline
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
          }
          return str;
        }).join(',')
      );
      text = [header, ...rows].join('\n');
    }

    await vscode.env.clipboard.writeText(text);

    const limitNote = results.length >= limit ? ` (limited to ${limit} rows)` : '';
    void vscode.window.showInformationMessage(
      `Copied ${results.length} rows as ${format.toUpperCase()}${limitNote}`
    );

    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.error('Copy to clipboard failed', { tableName, error: message });
    void vscode.window.showErrorMessage(`Copy failed: ${message}`);
    return false;
  }
}
