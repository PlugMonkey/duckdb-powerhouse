import * as vscode from 'vscode';

import { ConnectionManager } from '../connection';
import { DEFAULTS } from '../constants';
import { Logger } from '../utils/logger';
import { queryResultEmitter, QueryExecutionResult } from '../editor/commands';
import { TableNode, ColumnNode, SchemaNode, DatabaseNode } from './nodes';

/**
 * Preview table data with a SELECT query.
 * Uses the same Results Panel as regular queries for consistent UX.
 */
export async function previewTable(
  table: TableNode,
  connectionManager: ConnectionManager
): Promise<void> {
  if (!connectionManager.isConnected) {
    void vscode.window.showWarningMessage('Not connected to a database');
    return;
  }

  const sql = `SELECT * FROM ${table.qualifiedName} LIMIT ${DEFAULTS.PREVIEW_LIMIT}`;
  const startTime = performance.now();

  try {
    Logger.info('Preview table', { table: table.qualifiedName });

    const results = await connectionManager.execute(sql);
    const executionTimeMs = performance.now() - startTime;

    // Convert results to display format (same as query execution)
    const columns = results.length > 0 ? Object.keys(results[0] ?? {}) : [];
    const rows: unknown[][] = results.map((row) =>
      columns.map((col): unknown => row[col])
    );

    Logger.debug('Preview data prepared', {
      table: table.qualifiedName,
      columnCount: columns.length,
      rowCount: results.length,
      timeMs: executionTimeMs.toFixed(2),
    });

    const result: QueryExecutionResult = {
      sql,
      columns,
      rows,
      rowCount: results.length,
      executionTimeMs,
      truncated: results.length >= DEFAULTS.PREVIEW_LIMIT,
      limitApplied: true,
    };

    // Emit to Results Panel (same as running a query)
    Logger.info('Firing query result event', {
      sql: sql.slice(0, 50),
      rowCount: result.rowCount,
      columnCount: result.columns.length,
    });
    queryResultEmitter.fire(result);

    if (results.length === 0) {
      void vscode.window.showInformationMessage(`Table ${table.name} is empty`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.error('Preview failed', { table: table.qualifiedName, error: message });

    // Show error in Results Panel too
    const result: QueryExecutionResult = {
      sql,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: performance.now() - startTime,
      truncated: false,
      error: message,
    };
    queryResultEmitter.fire(result);

    void vscode.window.showErrorMessage(`Preview failed: ${message}`);
  }
}

/**
 * Copy table name to clipboard.
 */
export async function copyTableName(table: TableNode): Promise<void> {
  await vscode.env.clipboard.writeText(table.qualifiedName);
  void vscode.window.showInformationMessage(`Copied: ${table.qualifiedName}`);
}

/**
 * Copy column name to clipboard.
 */
export async function copyColumnName(column: ColumnNode): Promise<void> {
  await vscode.env.clipboard.writeText(`"${column.name}"`);
  void vscode.window.showInformationMessage(`Copied: "${column.name}"`);
}

/**
 * Generate and copy SELECT statement for a table.
 */
export async function copySelectStatement(
  table: TableNode,
  connectionManager: ConnectionManager
): Promise<void> {
  if (!connectionManager.isConnected) {
    void vscode.window.showWarningMessage('Not connected to a database');
    return;
  }

  const sql = `SELECT * FROM ${table.qualifiedName} LIMIT ${DEFAULTS.DEFAULT_RESULT_LIMIT};`;
  await vscode.env.clipboard.writeText(sql);
  void vscode.window.showInformationMessage('SELECT statement copied to clipboard');
}

/**
 * Insert a new SQL file with a SELECT statement for the table.
 */
export async function newQueryForTable(table: TableNode): Promise<void> {
  const sql = `-- Query for ${table.qualifiedName}\nSELECT *\nFROM ${table.qualifiedName}\nLIMIT ${DEFAULTS.DEFAULT_RESULT_LIMIT};\n`;

  const doc = await vscode.workspace.openTextDocument({
    content: sql,
    language: 'sql',
  });

  await vscode.window.showTextDocument(doc);
}

// ======================
// Schema Actions
// ======================

/**
 * Copy schema name to clipboard.
 */
export async function copySchemaName(schema: SchemaNode): Promise<void> {
  await vscode.env.clipboard.writeText(`"${schema.name}"`);
  void vscode.window.showInformationMessage(`Copied: "${schema.name}"`);
}

// ======================
// Database Actions
// ======================

/**
 * Show database properties in an information message.
 */
export async function showDatabaseProperties(
  database: DatabaseNode,
  connectionManager: ConnectionManager
): Promise<void> {
  if (!connectionManager.isConnected) {
    void vscode.window.showWarningMessage('Not connected to a database');
    return;
  }

  try {
    // Get database version and settings
    const versionResult = await connectionManager.execute('SELECT version() as version');
    const version = (versionResult[0]?.version as string | undefined) ?? 'Unknown';

    const memoryResult = await connectionManager.execute(
      "SELECT current_setting('memory_limit') as memory_limit"
    );
    const memoryLimit = (memoryResult[0]?.memory_limit as string | undefined) ?? 'Unknown';

    const threadsResult = await connectionManager.execute(
      "SELECT current_setting('threads') as threads"
    );
    const threads = (threadsResult[0]?.threads as string | undefined) ?? 'Unknown';

    const config = connectionManager.currentConfig;
    const type = config?.type === 'memory' ? 'In-Memory' : 'File';
    const path = config?.path ?? 'N/A';

    const message = `
**${database.name}**

Type: ${type}
Path: ${path}
DuckDB Version: ${version}
Memory Limit: ${memoryLimit}
Threads: ${threads}
    `.trim();

    void vscode.window.showInformationMessage(message, { modal: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    Logger.error('Failed to get database properties', err);
    void vscode.window.showErrorMessage(`Failed to get database properties: ${error}`);
  }
}

// ======================
// Table DDL Actions
// ======================

/**
 * Drop a table with confirmation dialog.
 */
export async function dropTable(
  table: TableNode,
  connectionManager: ConnectionManager
): Promise<void> {
  if (!connectionManager.isConnected) {
    void vscode.window.showWarningMessage('Not connected to a database');
    return;
  }

  // Confirmation dialog
  const confirm = await vscode.window.showWarningMessage(
    `Are you sure you want to drop table "${table.name}"?\n\nThis action cannot be undone.`,
    { modal: true },
    'Drop Table'
  );

  if (confirm !== 'Drop Table') {
    return;
  }

  try {
    const sql = `DROP TABLE ${table.qualifiedName}`;
    await connectionManager.execute(sql);
    Logger.info('Table dropped', { table: table.qualifiedName });
    void vscode.window.showInformationMessage(`Table "${table.name}" has been dropped`);

    // Trigger explorer refresh
    void vscode.commands.executeCommand('duckdb-powerhouse.refreshExplorer');
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    Logger.error('Failed to drop table', { table: table.qualifiedName, error });
    void vscode.window.showErrorMessage(`Failed to drop table: ${error}`);
  }
}

/**
 * Truncate a table with confirmation dialog.
 */
export async function truncateTable(
  table: TableNode,
  connectionManager: ConnectionManager
): Promise<void> {
  if (!connectionManager.isConnected) {
    void vscode.window.showWarningMessage('Not connected to a database');
    return;
  }

  // Confirmation dialog
  const confirm = await vscode.window.showWarningMessage(
    `Are you sure you want to truncate table "${table.name}"?\n\nThis will delete all rows. This action cannot be undone.`,
    { modal: true },
    'Truncate Table'
  );

  if (confirm !== 'Truncate Table') {
    return;
  }

  try {
    // DuckDB uses DELETE FROM for truncate
    const sql = `DELETE FROM ${table.qualifiedName}`;
    await connectionManager.execute(sql);
    Logger.info('Table truncated', { table: table.qualifiedName });
    void vscode.window.showInformationMessage(`Table "${table.name}" has been truncated`);

    // Trigger explorer refresh
    void vscode.commands.executeCommand('duckdb-powerhouse.refreshExplorer');
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    Logger.error('Failed to truncate table', { table: table.qualifiedName, error });
    void vscode.window.showErrorMessage(`Failed to truncate table: ${error}`);
  }
}

/**
 * Copy CREATE TABLE statement for a table.
 */
export async function copyCreateTable(
  table: TableNode,
  connectionManager: ConnectionManager
): Promise<void> {
  if (!connectionManager.isConnected) {
    void vscode.window.showWarningMessage('Not connected to a database');
    return;
  }

  try {
    // DuckDB has a function to generate CREATE TABLE statement
    const sql = `SELECT sql FROM duckdb_tables() WHERE schema_name = '${table.schemaName}' AND table_name = '${table.name}'`;
    const result = await connectionManager.execute(sql);

    if (result.length > 0 && result[0]?.sql) {
      await vscode.env.clipboard.writeText(result[0].sql as string);
      void vscode.window.showInformationMessage('CREATE TABLE statement copied to clipboard');
    } else {
      void vscode.window.showWarningMessage('Could not generate CREATE TABLE statement');
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    Logger.error('Failed to get CREATE TABLE', { table: table.qualifiedName, error });
    void vscode.window.showErrorMessage(`Failed to get CREATE TABLE: ${error}`);
  }
}

// ======================
// Enhanced Column Actions
// ======================

/**
 * Insert column name at cursor position in active SQL editor.
 */
export async function insertColumnName(column: ColumnNode): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'sql') {
    // Open new SQL file with the column reference
    const doc = await vscode.workspace.openTextDocument({
      language: 'sql',
      content: `"${column.name}"`,
    });
    await vscode.window.showTextDocument(doc);
    return;
  }

  // Insert at cursor
  await editor.edit((editBuilder) => {
    editBuilder.insert(editor.selection.active, `"${column.name}"`);
  });
}

/**
 * Generate a filter query for the column.
 */
export async function filterByColumn(
  column: ColumnNode,
  connectionManager: ConnectionManager
): Promise<void> {
  // Prompt for filter value
  const value = await vscode.window.showInputBox({
    prompt: `Filter ${column.tableName} where ${column.name} equals:`,
    placeHolder: 'Enter value to filter by',
  });

  if (value === undefined) return;

  const qualifiedTable = column.schemaName === 'main'
    ? `"${column.tableName}"`
    : `"${column.schemaName}"."${column.tableName}"`;

  // Determine if we need quotes based on type
  const isStringType = column.dataType.toUpperCase().includes('VARCHAR') ||
    column.dataType.toUpperCase().includes('TEXT') ||
    column.dataType.toUpperCase().includes('CHAR');

  const filterValue = isStringType ? `'${value.replace(/'/g, "''")}'` : value;

  const sql = `-- Filter ${column.tableName} by ${column.name}
SELECT *
FROM ${qualifiedTable}
WHERE "${column.name}" = ${filterValue}
LIMIT 100;
`;

  const doc = await vscode.workspace.openTextDocument({
    language: 'sql',
    content: sql,
  });
  await vscode.window.showTextDocument(doc);

  // Auto-run if connected
  if (connectionManager.isConnected) {
    void vscode.commands.executeCommand('duckdb-powerhouse.runQuery');
  }
}

/**
 * Generate a sorted query for the column.
 */
export async function sortByColumn(column: ColumnNode): Promise<void> {
  const direction = await vscode.window.showQuickPick(
    [
      { label: 'Ascending (A-Z, 1-9)', value: 'ASC' },
      { label: 'Descending (Z-A, 9-1)', value: 'DESC' },
    ],
    { placeHolder: `Sort ${column.tableName} by ${column.name}` }
  );

  if (!direction) return;

  const qualifiedTable = column.schemaName === 'main'
    ? `"${column.tableName}"`
    : `"${column.schemaName}"."${column.tableName}"`;

  const sql = `-- Sort ${column.tableName} by ${column.name}
SELECT *
FROM ${qualifiedTable}
ORDER BY "${column.name}" ${direction.value}
LIMIT 100;
`;

  const doc = await vscode.workspace.openTextDocument({
    language: 'sql',
    content: sql,
  });
  await vscode.window.showTextDocument(doc);
}

// ======================
// Enhanced Table Actions
// ======================

/**
 * Show detailed table information.
 */
export async function showTableInfo(
  table: TableNode,
  connectionManager: ConnectionManager
): Promise<void> {
  if (!connectionManager.isConnected) {
    void vscode.window.showWarningMessage('Not connected to a database');
    return;
  }

  try {
    // Get row count
    const countResult = await connectionManager.execute(
      `SELECT COUNT(*) as count FROM ${table.qualifiedName}`
    );
    const rowCount = (countResult[0]?.count as number) ?? 0;

    // Get column count
    const columnsResult = await connectionManager.execute(`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_schema = '${table.schemaName}' AND table_name = '${table.name}'
    `);
    const columnCount = (columnsResult[0]?.count as number) ?? 0;

    // Get table size estimate
    const sizeResult = await connectionManager.execute(`
      SELECT estimated_size
      FROM duckdb_tables()
      WHERE schema_name = '${table.schemaName}' AND table_name = '${table.name}'
    `);
    const estimatedSize = sizeResult[0]?.estimated_size as number | null;

    // Format size
    let sizeStr = 'Unknown';
    if (estimatedSize !== null && estimatedSize !== undefined) {
      if (estimatedSize < 1024) {
        sizeStr = `${estimatedSize} rows`;
      } else if (estimatedSize < 1024 * 1024) {
        sizeStr = `~${(estimatedSize / 1024).toFixed(1)}K rows`;
      } else {
        sizeStr = `~${(estimatedSize / (1024 * 1024)).toFixed(1)}M rows`;
      }
    }

    // Show info panel
    const panel = vscode.window.createOutputChannel(`Table Info: ${table.name}`, 'markdown');
    panel.clear();
    panel.appendLine(`# ${table.qualifiedName}`);
    panel.appendLine('');
    panel.appendLine(`| Property | Value |`);
    panel.appendLine(`|----------|-------|`);
    panel.appendLine(`| **Rows** | ${rowCount.toLocaleString()} |`);
    panel.appendLine(`| **Columns** | ${columnCount} |`);
    panel.appendLine(`| **Estimated Size** | ${sizeStr} |`);
    panel.appendLine(`| **Schema** | ${table.schemaName} |`);
    panel.appendLine('');
    panel.appendLine('## Columns');
    panel.appendLine('');

    // Get column details
    const columns = await connectionManager.execute(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = '${table.schemaName}' AND table_name = '${table.name}'
      ORDER BY ordinal_position
    `);

    panel.appendLine('| Column | Type | Nullable |');
    panel.appendLine('|--------|------|----------|');
    for (const col of columns) {
      const nullable = col.is_nullable === 'YES' ? 'Yes' : 'No';
      panel.appendLine(`| ${col.column_name} | \`${col.data_type}\` | ${nullable} |`);
    }

    panel.show();
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    Logger.error('Failed to get table info', { table: table.qualifiedName, error });
    void vscode.window.showErrorMessage(`Failed to get table info: ${error}`);
  }
}

/**
 * Rename a table.
 */
export async function renameTable(
  table: TableNode,
  connectionManager: ConnectionManager
): Promise<void> {
  if (!connectionManager.isConnected) {
    void vscode.window.showWarningMessage('Not connected to a database');
    return;
  }

  const newName = await vscode.window.showInputBox({
    prompt: `Rename table "${table.name}" to:`,
    value: table.name,
    validateInput: (value) => {
      if (!value.trim()) return 'Table name is required';
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
        return 'Table name must start with a letter or underscore';
      }
      if (value === table.name) return 'Please enter a different name';
      return undefined;
    },
  });

  if (!newName) return;

  try {
    const sql = `ALTER TABLE ${table.qualifiedName} RENAME TO "${newName}"`;
    await connectionManager.execute(sql);
    Logger.info('Table renamed', { from: table.name, to: newName });
    void vscode.window.showInformationMessage(`Table renamed to "${newName}"`);

    // Refresh explorer
    void vscode.commands.executeCommand('duckdb-powerhouse.refreshExplorer');
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    Logger.error('Failed to rename table', { table: table.qualifiedName, error });
    void vscode.window.showErrorMessage(`Failed to rename table: ${error}`);
  }
}
