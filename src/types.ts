/**
 * Shared type definitions
 */

/** Connection state */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Connection type */
export type ConnectionType = 'memory' | 'file' | 'motherduck' | 'postgres' | 's3';

/** Base connection configuration */
interface BaseConnectionConfig {
  name: string;
}

/** In-memory database connection */
export interface MemoryConnectionConfig extends BaseConnectionConfig {
  type: 'memory';
}

/** File-based database connection */
export interface FileConnectionConfig extends BaseConnectionConfig {
  type: 'file';
  path: string;
}

/** MotherDuck cloud connection */
export interface MotherDuckConnectionConfig extends BaseConnectionConfig {
  type: 'motherduck';
  database?: string; // Optional, empty = attach all
}

/** PostgreSQL external connection */
export interface PostgresConnectionConfig extends BaseConnectionConfig {
  type: 'postgres';
  host: string;
  port: number;
  database: string;
  user: string;
  // password stored in SecretStorage
}

/** S3/cloud storage connection */
export interface S3ConnectionConfig extends BaseConnectionConfig {
  type: 's3';
  region: string;
  bucket?: string;
  useIamAuth: boolean;
  // credentials stored in SecretStorage if !useIamAuth
}

/** Discriminated union of all connection configurations */
export type ConnectionConfig =
  | MemoryConnectionConfig
  | FileConnectionConfig
  | MotherDuckConnectionConfig
  | PostgresConnectionConfig
  | S3ConnectionConfig;

/** Helper to get path from connection config (for backward compatibility) */
export function getConnectionPath(config: ConnectionConfig): string | undefined {
  if (config.type === 'file') {
    return config.path;
  }
  return undefined;
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
