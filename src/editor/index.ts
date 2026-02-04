/**
 * Editor integration module
 *
 * Provides:
 * - SQL syntax highlighting support
 * - Autocomplete for keywords, tables, columns
 * - Query execution commands
 * - Run selected text as query
 */

export { SqlCompletionProvider } from './completion';
export { runQuery, runSelectedQuery, explainQuery, cancelQuery, isQueryRunning, onQueryResult, queryResultEmitter, newSqlFile, executeRawSql } from './commands';
export type { QueryExecutionResult } from './commands';
export { getAllKeywords, getKeywordsByCategory, SQL_KEYWORDS } from './sql-keywords';
