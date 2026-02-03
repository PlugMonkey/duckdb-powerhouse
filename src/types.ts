/**
 * Shared type definitions
 */

/** Connection state */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Connection type */
export type ConnectionType = 'memory' | 'file';

/** Database connection configuration */
export interface ConnectionConfig {
  type: ConnectionType;
  path?: string; // Only for file-based connections
  name: string;
}

/** Column metadata */
export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

/** Table metadata */
export interface TableInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  rowCount?: number;
}

/** Schema metadata */
export interface SchemaInfo {
  name: string;
  tables: TableInfo[];
}

/** Database metadata */
export interface DatabaseInfo {
  name: string;
  path?: string;
  schemas: SchemaInfo[];
}

/** Query execution result */
export interface QueryResult {
  columns: ColumnInfo[];
  rows: unknown[][];
  rowCount: number;
  executionTimeMs: number;
  truncated: boolean;
}

/** Query execution error */
export interface QueryError {
  message: string;
  line?: number;
  column?: number;
  sql?: string;
}

/** Export format options */
export type ExportFormat = 'csv' | 'json' | 'clipboard';

/** Export options */
export interface ExportOptions {
  format: ExportFormat;
  includeHeaders: boolean;
  delimiter?: string; // For CSV
}
