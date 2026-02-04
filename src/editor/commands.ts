import * as vscode from 'vscode';

import { ConnectionManager } from '../connection';
import { config } from '../utils/config';
import { Logger } from '../utils/logger';

/**
 * Result of query execution for display.
 */
export interface QueryExecutionResult {
  sql: string;
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  executionTimeMs: number;
  truncated: boolean;
  limitApplied?: boolean;
  error?: string;
  /** Optional source name for display (e.g., table name, file name) */
  source?: string;
}

/**
 * Event emitter for query results.
 * Results panel will subscribe to this to display results.
 */
export const queryResultEmitter = new vscode.EventEmitter<QueryExecutionResult>();
export const onQueryResult = queryResultEmitter.event;

/**
 * Cancellation token source for current query.
 * Used to cancel running queries.
 */
let currentQueryCancellation: vscode.CancellationTokenSource | null = null;

/**
 * Check if a query is currently running.
 */
export function isQueryRunning(): boolean {
  return currentQueryCancellation !== null;
}

/**
 * Cancel the current running query.
 */
export function cancelQuery(): void {
  if (currentQueryCancellation) {
    currentQueryCancellation.cancel();
    void vscode.window.showInformationMessage('Query cancelled');
    Logger.info('Query cancelled by user');
  } else {
    void vscode.window.showWarningMessage('No query is currently running');
  }
}

/**
 * Run the current query in the active editor.
 * If text is selected, runs only the selection.
 * Otherwise, runs the entire document or the query at cursor.
 */
export async function runQuery(connectionManager: ConnectionManager): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showWarningMessage('No active editor');
    return;
  }

  if (!connectionManager.isConnected) {
    void vscode.window.showWarningMessage('Not connected to a database');
    return;
  }

  // Get the SQL to execute
  const sql = getQueryText(editor);
  if (!sql.trim()) {
    void vscode.window.showWarningMessage('No SQL to execute');
    return;
  }

  await executeAndDisplay(sql, connectionManager);
}

/**
 * Run only the selected text as a query.
 */
export async function runSelectedQuery(connectionManager: ConnectionManager): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showWarningMessage('No active editor');
    return;
  }

  if (!connectionManager.isConnected) {
    void vscode.window.showWarningMessage('Not connected to a database');
    return;
  }

  const selection = editor.selection;
  if (selection.isEmpty) {
    void vscode.window.showWarningMessage('No text selected');
    return;
  }

  const sql = editor.document.getText(selection);
  if (!sql.trim()) {
    void vscode.window.showWarningMessage('Selected text is empty');
    return;
  }

  await executeAndDisplay(sql, connectionManager);
}

/**
 * Get the SQL text to execute from the editor.
 * Priority: selection > query at cursor > entire document
 */
function getQueryText(editor: vscode.TextEditor): string {
  const document = editor.document;
  const selection = editor.selection;

  // If there's a selection, use it
  if (!selection.isEmpty) {
    return document.getText(selection);
  }

  // Try to find the query at the cursor position
  const cursorQuery = getQueryAtCursor(document, selection.active);
  if (cursorQuery) {
    return cursorQuery;
  }

  // Fall back to entire document
  return document.getText();
}

/**
 * Try to extract the SQL query at the cursor position.
 * Queries are separated by semicolons or blank lines.
 */
function getQueryAtCursor(document: vscode.TextDocument, position: vscode.Position): string | undefined {
  const text = document.getText();
  const offset = document.offsetAt(position);

  // Split by semicolons to find individual statements
  const statements: Array<{ start: number; end: number; text: string }> = [];
  let currentStart = 0;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === ';') {
      const statementText = text.substring(currentStart, i + 1).trim();
      if (statementText) {
        statements.push({
          start: currentStart,
          end: i + 1,
          text: statementText,
        });
      }
      currentStart = i + 1;
    }
  }

  // Add the last statement if it doesn't end with semicolon
  const lastStatement = text.substring(currentStart).trim();
  if (lastStatement) {
    statements.push({
      start: currentStart,
      end: text.length,
      text: lastStatement,
    });
  }

  // Find the statement containing the cursor
  for (const stmt of statements) {
    if (offset >= stmt.start && offset <= stmt.end) {
      return stmt.text;
    }
  }

  return undefined;
}

/**
 * Execute SQL and display results.
 */
async function executeAndDisplay(sql: string, connectionManager: ConnectionManager): Promise<void> {
  const startTime = performance.now();

  // Create cancellation token
  currentQueryCancellation = new vscode.CancellationTokenSource();
  const token = currentQueryCancellation.token;

  try {
    Logger.info('Executing query', { sql: sql.slice(0, 100) });

    const maxRows = config.maxResultRows;
    const { sql: limitedSql, limitApplied } = addLimitIfNeeded(sql, maxRows);
    const timeoutSeconds = config.queryTimeout;

    // Show progress with cancellation support
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Executing query...',
        cancellable: true,
      },
      async (progress, progressToken) => {
        // Link progress token to our cancellation
        progressToken.onCancellationRequested(() => {
          currentQueryCancellation?.cancel();
        });

        // Create a promise that handles timeout and cancellation
        const executePromise = connectionManager.execute(limitedSql);

        // Handle timeout if configured
        let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = timeoutSeconds > 0
          ? new Promise<never>((_, reject) => {
              timeoutHandle = setTimeout(() => {
                reject(new Error(`Query timed out after ${timeoutSeconds} seconds`));
              }, timeoutSeconds * 1000);
            })
          : null;

        // Update progress with duration
        const updateInterval = setInterval(() => {
          const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
          progress.report({ message: `Running... (${elapsed}s)` });
        }, 100);

        try {
          // Race between execution, timeout, and cancellation
          const results = await (timeoutPromise
            ? Promise.race([executePromise, timeoutPromise])
            : executePromise);

          // Check if cancelled
          if (token.isCancellationRequested) {
            throw new Error('Query cancelled');
          }

          clearInterval(updateInterval);
          if (timeoutHandle) clearTimeout(timeoutHandle);

          const executionTimeMs = performance.now() - startTime;

          // Convert results to display format
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
            truncated: results.length >= maxRows,
            limitApplied,
          };

          // Emit result for results panel
          queryResultEmitter.fire(result);

          // Build success message
          let message = `Query completed: ${results.length} rows in ${executionTimeMs.toFixed(0)}ms`;
          if (limitApplied) {
            message += ` (LIMIT ${maxRows} auto-applied)`;
          }
          void vscode.window.showInformationMessage(message);
        } finally {
          clearInterval(updateInterval);
          if (timeoutHandle) clearTimeout(timeoutHandle);
        }
      }
    );
  } catch (err) {
    const executionTimeMs = performance.now() - startTime;
    const message = err instanceof Error ? err.message : String(err);

    // Don't show error for cancellation
    if (message === 'Query cancelled') {
      Logger.info('Query cancelled', { sql: sql.slice(0, 100), timeMs: executionTimeMs });
      return;
    }

    Logger.error('Query execution failed', { sql: sql.slice(0, 200), error: message });

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

    void vscode.window.showErrorMessage(`Query failed: ${message}`);
  } finally {
    currentQueryCancellation = null;
  }
}

/**
 * Add LIMIT clause if the query doesn't have one.
 * Returns the modified SQL and whether a limit was applied.
 */
function addLimitIfNeeded(sql: string, maxRows: number): { sql: string; limitApplied: boolean } {
  const upperSql = sql.toUpperCase().trim();

  // Don't add limit to non-SELECT statements
  if (!upperSql.startsWith('SELECT')) {
    return { sql, limitApplied: false };
  }

  // Check if already has LIMIT
  if (upperSql.includes('LIMIT')) {
    return { sql, limitApplied: false };
  }

  // Remove trailing semicolon, add limit, add semicolon back
  const trimmed = sql.trim().replace(/;$/, '');
  return { sql: `${trimmed} LIMIT ${maxRows}`, limitApplied: true };
}

/**
 * Create a new untitled SQL file.
 */
export async function newSqlFile(): Promise<void> {
  const doc = await vscode.workspace.openTextDocument({
    language: 'sql',
    content: '-- New DuckDB Query\n\n',
  });
  await vscode.window.showTextDocument(doc);
}

/**
 * Explain the current query.
 */
export async function explainQuery(connectionManager: ConnectionManager): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showWarningMessage('No active editor');
    return;
  }

  if (!connectionManager.isConnected) {
    void vscode.window.showWarningMessage('Not connected to a database');
    return;
  }

  const sql = getQueryText(editor);
  if (!sql.trim()) {
    void vscode.window.showWarningMessage('No SQL to explain');
    return;
  }

  // Wrap in EXPLAIN
  const explainSql = `EXPLAIN ${sql}`;
  await executeAndDisplay(explainSql, connectionManager);
}

/**
 * Execute raw SQL directly (used by Results panel).
 */
export async function executeRawSql(
  connectionManager: ConnectionManager,
  sql: string
): Promise<void> {
  Logger.info('executeRawSql called', { sql: sql?.slice(0, 50), connected: connectionManager.isConnected });

  if (!connectionManager.isConnected) {
    void vscode.window.showWarningMessage('Not connected to a database');
    return;
  }

  if (!sql?.trim()) {
    void vscode.window.showWarningMessage('No SQL to execute');
    return;
  }

  await executeAndDisplay(sql, connectionManager);
}
