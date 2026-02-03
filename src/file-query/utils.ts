/**
 * Utilities for querying data files directly with DuckDB.
 */

import * as path from 'path';

/**
 * Supported data file extensions.
 */
export const SUPPORTED_EXTENSIONS = [
  '.parquet',
  '.csv',
  '.tsv',
  '.json',
  '.jsonl',
  '.ndjson',
] as const;

export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

/**
 * Check if a file extension is supported for direct querying.
 */
export function isSupportedExtension(ext: string): ext is SupportedExtension {
  return SUPPORTED_EXTENSIONS.includes(ext.toLowerCase() as SupportedExtension);
}

/**
 * Check if a file path is a supported data file.
 */
export function isSupportedFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return isSupportedExtension(ext);
}

/**
 * Get the file type from extension.
 */
export function getFileType(filePath: string): 'parquet' | 'csv' | 'json' | null {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.parquet':
      return 'parquet';
    case '.csv':
    case '.tsv':
      return 'csv';
    case '.json':
    case '.jsonl':
    case '.ndjson':
      return 'json';
    default:
      return null;
  }
}

/**
 * Escape a file path for use in SQL.
 * Single quotes are escaped by doubling them.
 */
export function escapeFilePath(filePath: string): string {
  return filePath.replace(/'/g, "''");
}

/**
 * Generate a SELECT query for a data file.
 */
export function generateSelectQuery(filePath: string, limit?: number): string {
  const fileType = getFileType(filePath);
  const escapedPath = escapeFilePath(filePath);
  const limitClause = limit ? ` LIMIT ${limit}` : '';

  switch (fileType) {
    case 'parquet':
      // Parquet files can be queried directly
      return `SELECT * FROM '${escapedPath}'${limitClause};`;

    case 'csv': {
      // CSV files use read_csv with auto-detection
      const ext = path.extname(filePath).toLowerCase();
      const delimiter = ext === '.tsv' ? ", delim='\\t'" : '';
      return `SELECT * FROM read_csv('${escapedPath}'${delimiter})${limitClause};`;
    }

    case 'json': {
      // JSON files use read_json with auto-detection
      const ext = path.extname(filePath).toLowerCase();
      const format = ext === '.jsonl' || ext === '.ndjson' ? ", format='newline_delimited'" : '';
      return `SELECT * FROM read_json('${escapedPath}'${format})${limitClause};`;
    }

    default:
      return `-- Unsupported file type: ${filePath}`;
  }
}

/**
 * Generate a DESCRIBE query for a data file.
 */
export function generateDescribeQuery(filePath: string): string {
  const fileType = getFileType(filePath);
  const escapedPath = escapeFilePath(filePath);

  switch (fileType) {
    case 'parquet':
      return `DESCRIBE SELECT * FROM '${escapedPath}';`;

    case 'csv': {
      const ext = path.extname(filePath).toLowerCase();
      const delimiter = ext === '.tsv' ? ", delim='\\t'" : '';
      return `DESCRIBE SELECT * FROM read_csv('${escapedPath}'${delimiter});`;
    }

    case 'json': {
      const ext = path.extname(filePath).toLowerCase();
      const format = ext === '.jsonl' || ext === '.ndjson' ? ", format='newline_delimited'" : '';
      return `DESCRIBE SELECT * FROM read_json('${escapedPath}'${format});`;
    }

    default:
      return `-- Unsupported file type: ${filePath}`;
  }
}

/**
 * Generate a count query for a data file.
 */
export function generateCountQuery(filePath: string): string {
  const fileType = getFileType(filePath);
  const escapedPath = escapeFilePath(filePath);

  switch (fileType) {
    case 'parquet':
      return `SELECT COUNT(*) as row_count FROM '${escapedPath}';`;

    case 'csv': {
      const ext = path.extname(filePath).toLowerCase();
      const delimiter = ext === '.tsv' ? ", delim='\\t'" : '';
      return `SELECT COUNT(*) as row_count FROM read_csv('${escapedPath}'${delimiter});`;
    }

    case 'json': {
      const ext = path.extname(filePath).toLowerCase();
      const format = ext === '.jsonl' || ext === '.ndjson' ? ", format='newline_delimited'" : '';
      return `SELECT COUNT(*) as row_count FROM read_json('${escapedPath}'${format});`;
    }

    default:
      return `-- Unsupported file type: ${filePath}`;
  }
}

/**
 * Get a friendly file type name for display.
 */
export function getFileTypeName(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.parquet':
      return 'Parquet';
    case '.csv':
      return 'CSV';
    case '.tsv':
      return 'TSV';
    case '.json':
      return 'JSON';
    case '.jsonl':
    case '.ndjson':
      return 'JSON Lines';
    default:
      return 'Unknown';
  }
}

/**
 * Options for CSV file reading.
 */
export interface CsvOptions {
  delimiter?: string;
  header?: boolean;
  encoding?: string;
}

/**
 * Generate a SELECT query with custom CSV options.
 */
export function generateSelectQueryWithOptions(
  filePath: string,
  options: CsvOptions,
  limit?: number
): string {
  const escapedPath = escapeFilePath(filePath);
  const limitClause = limit ? ` LIMIT ${limit}` : '';

  const csvOptions: string[] = [];
  if (options.delimiter) {
    csvOptions.push(`delim='${options.delimiter}'`);
  }
  if (options.header === false) {
    csvOptions.push('header=false');
  }
  if (options.encoding) {
    csvOptions.push(`encoding='${options.encoding}'`);
  }

  const optionsStr = csvOptions.length > 0 ? `, ${csvOptions.join(', ')}` : '';
  return `SELECT * FROM read_csv('${escapedPath}'${optionsStr})${limitClause};`;
}

/**
 * Generate CREATE TABLE AS statement to import a file into a table.
 */
export function generateImportTableQuery(filePath: string, tableName: string): string {
  const fileType = getFileType(filePath);
  const escapedPath = escapeFilePath(filePath);

  switch (fileType) {
    case 'parquet':
      return `CREATE TABLE "${tableName}" AS SELECT * FROM '${escapedPath}';`;

    case 'csv': {
      const ext = path.extname(filePath).toLowerCase();
      const delimiter = ext === '.tsv' ? ", delim='\\t'" : '';
      return `CREATE TABLE "${tableName}" AS SELECT * FROM read_csv('${escapedPath}'${delimiter});`;
    }

    case 'json': {
      const ext = path.extname(filePath).toLowerCase();
      const format = ext === '.jsonl' || ext === '.ndjson' ? ", format='newline_delimited'" : '';
      return `CREATE TABLE "${tableName}" AS SELECT * FROM read_json('${escapedPath}'${format});`;
    }

    default:
      return `-- Unsupported file type: ${filePath}`;
  }
}
