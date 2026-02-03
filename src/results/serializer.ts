/**
 * Serializes query results for display in the webview.
 */

import { QueryExecutionResult } from '../editor/commands';

/**
 * Result data formatted for the webview.
 */
export interface WebviewResultData {
  /** Unique ID for this result set */
  id: string;
  /** Original SQL query */
  sql: string;
  /** Column definitions */
  columns: WebviewColumn[];
  /** Row data (array of arrays) */
  rows: WebviewCell[][];
  /** Total row count */
  rowCount: number;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Whether results were truncated */
  truncated: boolean;
  /** Error message if query failed */
  error?: string;
  /** Timestamp when query was executed */
  timestamp: number;
}

/**
 * Column definition for webview.
 */
export interface WebviewColumn {
  /** Column name */
  name: string;
  /** Column index */
  index: number;
}

/**
 * Cell value for webview, with type information.
 */
export interface WebviewCell {
  /** Display value (string representation) */
  display: string;
  /** Raw value for sorting */
  raw: unknown;
  /** Value type for styling */
  type: 'null' | 'number' | 'string' | 'boolean' | 'object' | 'array';
}

/**
 * Generate a unique ID for result sets.
 */
function generateId(): string {
  return `result-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Determine the type of a value for display purposes.
 */
function getValueType(value: unknown): WebviewCell['type'] {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return 'number';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  if (typeof value === 'object') {
    return 'object';
  }
  return 'string';
}

/**
 * Format a value for display.
 */
function formatValue(value: unknown): string {
  if (value === null) {
    return 'NULL';
  }
  if (value === undefined) {
    return '';
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'number') {
    // Format numbers with reasonable precision
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Convert a raw value to a WebviewCell.
 */
function toCell(value: unknown): WebviewCell {
  return {
    display: formatValue(value),
    raw: value,
    type: getValueType(value),
  };
}

/**
 * Serialize a QueryExecutionResult for the webview.
 */
export function serializeResult(result: QueryExecutionResult): WebviewResultData {
  const columns: WebviewColumn[] = result.columns.map((name, index) => ({
    name,
    index,
  }));

  const rows: WebviewCell[][] = result.rows.map((row) =>
    row.map((value) => toCell(value))
  );

  return {
    id: generateId(),
    sql: result.sql,
    columns,
    rows,
    rowCount: result.rowCount,
    executionTimeMs: result.executionTimeMs,
    truncated: result.truncated,
    error: result.error,
    timestamp: Date.now(),
  };
}

/**
 * Get sort value for a cell (for client-side sorting).
 */
export function getSortValue(cell: WebviewCell): string | number {
  if (cell.type === 'null') {
    return ''; // Nulls sort first/last depending on direction
  }
  if (cell.type === 'number' && typeof cell.raw === 'number') {
    return cell.raw;
  }
  return cell.display.toLowerCase();
}
