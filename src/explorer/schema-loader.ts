import { ConnectionManager } from '../connection';
import { Logger } from '../utils/logger';

/**
 * Schema metadata from DuckDB.
 */
export interface SchemaMetadata {
  schema_name: string;
}

/**
 * Table metadata from DuckDB.
 */
export interface TableMetadata {
  table_name: string;
  schema_name: string;
  estimated_size: number | null;
}

/**
 * Column metadata from DuckDB.
 */
export interface ColumnMetadata {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  table_name: string;
  schema_name: string;
}

/**
 * Service for loading schema information from DuckDB.
 */
export class SchemaLoader {
  constructor(private readonly connectionManager: ConnectionManager) {}

  /**
   * Get all schemas in the database.
   */
  async getSchemas(): Promise<SchemaMetadata[]> {
    if (!this.connectionManager.isConnected) {
      return [];
    }

    try {
      const results = await this.connectionManager.execute(`
        SELECT DISTINCT schema_name
        FROM information_schema.schemata
        WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
        ORDER BY schema_name
      `);

      return results as SchemaMetadata[];
    } catch (err) {
      Logger.error('Failed to load schemas', err);
      return [];
    }
  }

  /**
   * Get all tables in a schema.
   */
  async getTables(schemaName: string): Promise<TableMetadata[]> {
    if (!this.connectionManager.isConnected) {
      return [];
    }

    try {
      const results = await this.connectionManager.execute(`
        SELECT
          table_name,
          schema_name,
          estimated_size
        FROM duckdb_tables()
        WHERE schema_name = '${this.escapeString(schemaName)}'
        ORDER BY table_name
      `);

      return results.map((row) => ({
        table_name: row['table_name'] as string,
        schema_name: row['schema_name'] as string,
        estimated_size: row['estimated_size'] as number | null,
      }));
    } catch (err) {
      Logger.error('Failed to load tables', { schemaName, error: err });
      return [];
    }
  }

  /**
   * Get all columns in a table.
   */
  async getColumns(schemaName: string, tableName: string): Promise<ColumnMetadata[]> {
    if (!this.connectionManager.isConnected) {
      return [];
    }

    try {
      const results = await this.connectionManager.execute(`
        SELECT
          column_name,
          data_type,
          is_nullable = 'YES' as is_nullable,
          table_name,
          table_schema as schema_name
        FROM information_schema.columns
        WHERE table_schema = '${this.escapeString(schemaName)}'
          AND table_name = '${this.escapeString(tableName)}'
        ORDER BY ordinal_position
      `);

      return results.map((row) => ({
        column_name: row['column_name'] as string,
        data_type: row['data_type'] as string,
        is_nullable: row['is_nullable'] as boolean,
        table_name: row['table_name'] as string,
        schema_name: row['schema_name'] as string,
      }));
    } catch (err) {
      Logger.error('Failed to load columns', { schemaName, tableName, error: err });
      return [];
    }
  }

  /**
   * Get row count for a table.
   * Uses estimated count for performance.
   */
  async getTableRowCount(schemaName: string, tableName: string): Promise<number | undefined> {
    if (!this.connectionManager.isConnected) {
      return undefined;
    }

    try {
      const results = await this.connectionManager.execute(`
        SELECT estimated_size
        FROM duckdb_tables()
        WHERE schema_name = '${this.escapeString(schemaName)}'
          AND table_name = '${this.escapeString(tableName)}'
      `);

      const row = results[0];
      return row ? (row['estimated_size'] as number) : undefined;
    } catch (err) {
      Logger.error('Failed to get row count', { schemaName, tableName, error: err });
      return undefined;
    }
  }

  /**
   * Check if the database has any user tables.
   * Returns true if at least one table exists in any non-system schema.
   */
  async hasAnyTables(): Promise<boolean> {
    if (!this.connectionManager.isConnected) {
      return false;
    }

    try {
      const results = await this.connectionManager.execute(`
        SELECT COUNT(*) as count
        FROM duckdb_tables()
        WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
      `);

      const row = results[0];
      return row ? (row['count'] as number) > 0 : false;
    } catch (err) {
      Logger.error('Failed to check for tables', err);
      return false;
    }
  }

  /**
   * Escape a string for use in SQL queries.
   * Basic escaping to prevent SQL injection.
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "''");
  }
}
