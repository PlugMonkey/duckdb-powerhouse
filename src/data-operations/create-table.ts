import * as vscode from 'vscode';

import { ConnectionManager } from '../connection';
import { Logger } from '../utils/logger';
import { importDataFromFile, importDataFromUrl } from './import';

/**
 * Column definition for table creation.
 */
export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
}

/**
 * Common DuckDB data types for quick selection.
 */
const COMMON_TYPES = [
  { label: 'INTEGER', description: 'Whole numbers' },
  { label: 'BIGINT', description: 'Large whole numbers' },
  { label: 'DOUBLE', description: 'Decimal numbers' },
  { label: 'VARCHAR', description: 'Text/strings' },
  { label: 'BOOLEAN', description: 'True/false values' },
  { label: 'DATE', description: 'Date (YYYY-MM-DD)' },
  { label: 'TIMESTAMP', description: 'Date and time' },
  { label: 'UUID', description: 'Unique identifier' },
  { label: 'JSON', description: 'JSON data' },
];

/**
 * Result of the create table wizard.
 */
export interface CreateTableResult {
  success: boolean;
  tableName?: string;
  method?: 'empty' | 'from-file' | 'from-url' | 'from-query';
  error?: string;
}

/**
 * Prompt for a valid table name.
 */
async function promptForTableName(title: string = 'Create Table'): Promise<string | undefined> {
  return vscode.window.showInputBox({
    prompt: 'Enter table name',
    title,
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
}

/**
 * Prompt for column definitions.
 */
async function promptForColumns(): Promise<ColumnDefinition[] | undefined> {
  const columns: ColumnDefinition[] = [];
  let addingColumns = true;

  while (addingColumns) {
    // Prompt for column name
    const columnName = await vscode.window.showInputBox({
      prompt: columns.length === 0
        ? 'Enter first column name (or press Escape to finish)'
        : `Enter column ${columns.length + 1} name (or press Escape to finish)`,
      title: 'Add Column',
      validateInput: (value) => {
        if (!value.trim() && columns.length === 0) {
          return 'At least one column is required';
        }
        if (value && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
          return 'Column name must start with a letter or underscore';
        }
        return undefined;
      },
    });

    // If empty and we have columns, we're done
    if (!columnName) {
      if (columns.length === 0) {
        return undefined; // Cancelled
      }
      addingColumns = false;
      continue;
    }

    // Prompt for data type
    const typeSelection = await vscode.window.showQuickPick(COMMON_TYPES, {
      placeHolder: 'Select data type',
      title: `Type for "${columnName}"`,
    });

    if (!typeSelection) {
      // Cancelled - but keep columns we have
      if (columns.length === 0) {
        return undefined;
      }
      addingColumns = false;
      continue;
    }

    // Ask about constraints
    const constraints = await vscode.window.showQuickPick(
      [
        { label: 'Nullable', description: 'Column can contain NULL values', picked: true },
        { label: 'NOT NULL', description: 'Column cannot contain NULL values' },
        { label: 'PRIMARY KEY', description: 'Unique identifier, NOT NULL' },
      ],
      {
        placeHolder: 'Select constraint',
        title: `Constraints for "${columnName}"`,
      }
    );

    columns.push({
      name: columnName,
      type: typeSelection.label,
      nullable: constraints?.label === 'Nullable',
      primaryKey: constraints?.label === 'PRIMARY KEY',
    });

    // Ask if user wants to add more columns
    const addMore = await vscode.window.showQuickPick(
      [
        { label: 'Add another column', value: true },
        { label: 'Done - create table', value: false },
      ],
      { placeHolder: `Added ${columns.length} column(s)` }
    );

    if (!addMore || !addMore.value) {
      addingColumns = false;
    }
  }

  return columns.length > 0 ? columns : undefined;
}

/**
 * Build CREATE TABLE SQL from column definitions.
 */
function buildCreateTableSql(tableName: string, columns: ColumnDefinition[]): string {
  const columnDefs = columns.map(col => {
    let def = `  "${col.name}" ${col.type}`;
    if (col.primaryKey) {
      def += ' PRIMARY KEY';
    } else if (!col.nullable) {
      def += ' NOT NULL';
    }
    return def;
  });

  return `CREATE TABLE "${tableName}" (\n${columnDefs.join(',\n')}\n);`;
}

/**
 * Create an empty table with the wizard.
 */
async function createEmptyTable(connectionManager: ConnectionManager): Promise<CreateTableResult> {
  // Get table name
  const tableName = await promptForTableName('Create Empty Table');
  if (!tableName) {
    return { success: false, error: 'Cancelled' };
  }

  // Get columns
  const columns = await promptForColumns();
  if (!columns) {
    return { success: false, error: 'Cancelled' };
  }

  // Build and execute SQL
  const sql = buildCreateTableSql(tableName, columns);

  try {
    Logger.info('Creating table', { tableName, columnCount: columns.length });

    await connectionManager.execute(sql);

    // Refresh explorer
    await vscode.commands.executeCommand('duckdb-powerhouse.refreshExplorer');

    void vscode.window.showInformationMessage(`Created table "${tableName}" with ${columns.length} column(s)`);

    return { success: true, tableName, method: 'empty' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.error('Create table failed', { tableName, error: message });
    void vscode.window.showErrorMessage(`Create table failed: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Create table from a file (delegates to import).
 */
async function createTableFromFile(connectionManager: ConnectionManager): Promise<CreateTableResult> {
  const result = await importDataFromFile(connectionManager);
  return {
    success: result.success,
    tableName: result.tableName,
    method: 'from-file',
    error: result.error,
  };
}

/**
 * Create table from a URL (delegates to import).
 */
async function createTableFromUrl(connectionManager: ConnectionManager): Promise<CreateTableResult> {
  const result = await importDataFromUrl(connectionManager);
  return {
    success: result.success,
    tableName: result.tableName,
    method: 'from-url',
    error: result.error,
  };
}

/**
 * Create table from a query (opens SQL file with template).
 */
async function createTableFromQuery(): Promise<CreateTableResult> {
  const tableName = await promptForTableName('Create Table from Query');
  if (!tableName) {
    return { success: false, error: 'Cancelled' };
  }

  const template = `-- Create table "${tableName}" from query results
CREATE TABLE "${tableName}" AS
SELECT
  column1,
  column2
FROM source_table
WHERE condition;
`;

  const doc = await vscode.workspace.openTextDocument({
    language: 'sql',
    content: template,
  });
  await vscode.window.showTextDocument(doc);

  return { success: true, tableName, method: 'from-query' };
}

/**
 * Main Create Table Wizard.
 * Presents options and delegates to the appropriate creation method.
 */
export async function createTableWizard(connectionManager: ConnectionManager): Promise<CreateTableResult> {
  // Ensure connected
  if (!connectionManager.isConnected) {
    const connect = await vscode.window.showWarningMessage(
      'Not connected to a database. Create a connection first?',
      'Create Connection',
      'Cancel'
    );
    if (connect === 'Create Connection') {
      await vscode.commands.executeCommand('duckdb-powerhouse.createConnection');
      if (!connectionManager.isConnected) {
        return { success: false, error: 'No database connection' };
      }
    } else {
      return { success: false, error: 'No database connection' };
    }
  }

  // Show options
  const option = await vscode.window.showQuickPick(
    [
      {
        label: '$(file) Import from File',
        description: 'Create table from CSV, Parquet, or JSON file',
        value: 'file',
      },
      {
        label: '$(globe) Import from URL',
        description: 'Create table from a remote file URL',
        value: 'url',
      },
      {
        label: '$(table) Empty Table',
        description: 'Define columns manually',
        value: 'empty',
      },
      {
        label: '$(code) From Query (CTAS)',
        description: 'Create table from SELECT query results',
        value: 'query',
      },
    ],
    {
      placeHolder: 'How would you like to create the table?',
      title: 'Create Table',
    }
  );

  if (!option) {
    return { success: false, error: 'Cancelled' };
  }

  switch (option.value) {
    case 'file':
      return createTableFromFile(connectionManager);
    case 'url':
      return createTableFromUrl(connectionManager);
    case 'empty':
      return createEmptyTable(connectionManager);
    case 'query':
      return createTableFromQuery();
    default:
      return { success: false, error: 'Unknown option' };
  }
}
