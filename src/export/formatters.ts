/**
 * Export formatters for query results.
 * Pure functions that convert result data to various formats.
 */

import { WebviewResultData, WebviewCell } from '../results/serializer';

/**
 * Escape a value for CSV format.
 * Wraps in quotes and escapes internal quotes if needed.
 */
export function escapeCsvValue(value: string): string {
  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format a result set as CSV.
 */
export function formatAsCsv(result: WebviewResultData): string {
  const lines: string[] = [];

  // Header row
  const header = result.columns.map((col) => escapeCsvValue(col.name));
  lines.push(header.join(','));

  // Data rows
  for (const row of result.rows) {
    const values = row.map((cell) => escapeCsvValue(cell.display));
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * Format a result set as JSON (array of objects).
 */
export function formatAsJson(result: WebviewResultData): string {
  const data = result.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    result.columns.forEach((col, i) => {
      obj[col.name] = row[i]?.raw;
    });
    return obj;
  });

  return JSON.stringify(data, null, 2);
}

/**
 * Format a result set as TSV (tab-separated values) for clipboard.
 */
export function formatAsTsv(result: WebviewResultData): string {
  const lines: string[] = [];

  // Header row
  lines.push(result.columns.map((col) => col.name).join('\t'));

  // Data rows
  for (const row of result.rows) {
    const values = row.map((cell) => {
      // Replace tabs and newlines to avoid breaking TSV format
      return cell.display.replace(/\t/g, ' ').replace(/\n/g, ' ');
    });
    lines.push(values.join('\t'));
  }

  return lines.join('\n');
}

/**
 * Format a single row as TSV.
 */
export function formatRowAsTsv(cells: WebviewCell[]): string {
  return cells.map((cell) => cell.display.replace(/\t/g, ' ').replace(/\n/g, ' ')).join('\t');
}
