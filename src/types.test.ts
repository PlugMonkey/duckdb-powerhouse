import { describe, it, expect } from 'vitest';

import type {
  ConnectionState,
  ConnectionType,
  ConnectionConfig,
  ColumnInfo,
  TableInfo,
  SchemaInfo,
  DatabaseInfo,
  QueryResult,
  QueryError,
  ExportFormat,
  ExportOptions,
} from './types';

describe('Types', () => {
  describe('ConnectionState', () => {
    it('should accept valid states', () => {
      const states: ConnectionState[] = ['disconnected', 'connecting', 'connected', 'error'];
      expect(states).toHaveLength(4);
    });
  });

  describe('ConnectionType', () => {
    it('should accept valid types', () => {
      const types: ConnectionType[] = ['memory', 'file', 'motherduck', 'postgres', 's3'];
      expect(types).toHaveLength(5);
    });
  });

  describe('ConnectionConfig', () => {
    it('should allow memory config without path', () => {
      const config: ConnectionConfig = {
        type: 'memory',
        name: 'Test DB',
      };
      expect(config.type).toBe('memory');
    });

    it('should allow file config with path', () => {
      const config: ConnectionConfig = {
        type: 'file',
        name: 'Test DB',
        path: '/path/to/db.duckdb',
      };
      expect(config.type).toBe('file');
      expect(config.path).toBe('/path/to/db.duckdb');
    });

    it('should allow motherduck config', () => {
      const config: ConnectionConfig = {
        type: 'motherduck',
        name: 'My MotherDuck',
        database: 'analytics',
      };
      expect(config.type).toBe('motherduck');
      expect(config.database).toBe('analytics');
    });

    it('should allow postgres config', () => {
      const config: ConnectionConfig = {
        type: 'postgres',
        name: 'My Postgres',
        host: 'localhost',
        port: 5432,
        database: 'mydb',
        user: 'admin',
      };
      expect(config.type).toBe('postgres');
      expect(config.host).toBe('localhost');
    });

    it('should allow s3 config', () => {
      const config: ConnectionConfig = {
        type: 's3',
        name: 'My S3',
        region: 'us-east-1',
        bucket: 'my-bucket',
        useIamAuth: true,
      };
      expect(config.type).toBe('s3');
      expect(config.region).toBe('us-east-1');
    });
  });

  describe('ColumnInfo', () => {
    it('should have required properties', () => {
      const column: ColumnInfo = {
        name: 'id',
        type: 'INTEGER',
        nullable: false,
      };
      expect(column.name).toBe('id');
      expect(column.type).toBe('INTEGER');
      expect(column.nullable).toBe(false);
    });
  });

  describe('TableInfo', () => {
    it('should have required properties', () => {
      const table: TableInfo = {
        name: 'users',
        schema: 'main',
        columns: [{ name: 'id', type: 'INTEGER', nullable: false }],
      };
      expect(table.name).toBe('users');
      expect(table.schema).toBe('main');
      expect(table.columns).toHaveLength(1);
    });

    it('should allow optional rowCount', () => {
      const table: TableInfo = {
        name: 'users',
        schema: 'main',
        columns: [],
        rowCount: 1000,
      };
      expect(table.rowCount).toBe(1000);
    });
  });

  describe('SchemaInfo', () => {
    it('should contain tables', () => {
      const schema: SchemaInfo = {
        name: 'main',
        tables: [],
      };
      expect(schema.name).toBe('main');
      expect(schema.tables).toEqual([]);
    });
  });

  describe('DatabaseInfo', () => {
    it('should contain schemas', () => {
      const db: DatabaseInfo = {
        name: 'test',
        schemas: [{ name: 'main', tables: [] }],
      };
      expect(db.name).toBe('test');
      expect(db.schemas).toHaveLength(1);
    });

    it('should allow optional path', () => {
      const db: DatabaseInfo = {
        name: 'test',
        path: '/path/to/db.duckdb',
        schemas: [],
      };
      expect(db.path).toBe('/path/to/db.duckdb');
    });
  });

  describe('QueryResult', () => {
    it('should have all required properties', () => {
      const result: QueryResult = {
        columns: [{ name: 'id', type: 'INTEGER', nullable: false }],
        rows: [[1], [2], [3]],
        rowCount: 3,
        executionTimeMs: 10.5,
        truncated: false,
      };
      expect(result.columns).toHaveLength(1);
      expect(result.rows).toHaveLength(3);
      expect(result.rowCount).toBe(3);
      expect(result.executionTimeMs).toBe(10.5);
      expect(result.truncated).toBe(false);
    });
  });

  describe('QueryError', () => {
    it('should have message', () => {
      const error: QueryError = {
        message: 'Syntax error',
      };
      expect(error.message).toBe('Syntax error');
    });

    it('should allow optional location info', () => {
      const error: QueryError = {
        message: 'Syntax error',
        line: 1,
        column: 10,
        sql: 'SELECT * FORM users',
      };
      expect(error.line).toBe(1);
      expect(error.column).toBe(10);
      expect(error.sql).toBeDefined();
    });
  });

  describe('ExportFormat', () => {
    it('should accept valid formats', () => {
      const formats: ExportFormat[] = ['csv', 'json', 'clipboard'];
      expect(formats).toHaveLength(3);
    });
  });

  describe('ExportOptions', () => {
    it('should have required properties', () => {
      const options: ExportOptions = {
        format: 'csv',
        includeHeaders: true,
      };
      expect(options.format).toBe('csv');
      expect(options.includeHeaders).toBe(true);
    });

    it('should allow optional delimiter for CSV', () => {
      const options: ExportOptions = {
        format: 'csv',
        includeHeaders: true,
        delimiter: ';',
      };
      expect(options.delimiter).toBe(';');
    });
  });
});
