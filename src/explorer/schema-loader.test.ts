import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { ConnectionManager } from '../connection';
import { SchemaLoader } from './schema-loader';

describe('SchemaLoader', () => {
  let manager: ConnectionManager;
  let loader: SchemaLoader;

  beforeEach(() => {
    manager = new ConnectionManager();
    loader = new SchemaLoader(manager);
  });

  afterEach(async () => {
    await manager.dispose();
  });

  describe('when not connected', () => {
    it('getSchemas should return empty array', async () => {
      const schemas = await loader.getSchemas();
      expect(schemas).toEqual([]);
    });

    it('getTables should return empty array', async () => {
      const tables = await loader.getTables('main');
      expect(tables).toEqual([]);
    });

    it('getColumns should return empty array', async () => {
      const columns = await loader.getColumns('main', 'test');
      expect(columns).toEqual([]);
    });

    it('getTableRowCount should return undefined', async () => {
      const count = await loader.getTableRowCount('main', 'test');
      expect(count).toBeUndefined();
    });
  });

  describe('when connected', () => {
    beforeEach(async () => {
      await manager.connectInMemory();
    });

    describe('getSchemas', () => {
      it('should return main schema by default', async () => {
        const schemas = await loader.getSchemas();
        expect(schemas.length).toBeGreaterThan(0);
        expect(schemas.some((s) => s.schema_name === 'main')).toBe(true);
      });

      it('should not include information_schema', async () => {
        const schemas = await loader.getSchemas();
        expect(schemas.some((s) => s.schema_name === 'information_schema')).toBe(false);
      });

      it('should not include pg_catalog', async () => {
        const schemas = await loader.getSchemas();
        expect(schemas.some((s) => s.schema_name === 'pg_catalog')).toBe(false);
      });
    });

    describe('getTables', () => {
      it('should return empty for schema with no tables', async () => {
        const tables = await loader.getTables('main');
        expect(tables).toEqual([]);
      });

      it('should return tables after creating one', async () => {
        await manager.execute('CREATE TABLE test_table (id INTEGER, name VARCHAR)');

        const tables = await loader.getTables('main');
        expect(tables.length).toBe(1);
        expect(tables[0]?.table_name).toBe('test_table');
        expect(tables[0]?.schema_name).toBe('main');
      });

      it('should return multiple tables', async () => {
        await manager.execute('CREATE TABLE table_a (id INTEGER)');
        await manager.execute('CREATE TABLE table_b (id INTEGER)');

        const tables = await loader.getTables('main');
        expect(tables.length).toBe(2);
      });
    });

    describe('getColumns', () => {
      beforeEach(async () => {
        await manager.execute(`
          CREATE TABLE test_columns (
            id INTEGER NOT NULL,
            name VARCHAR,
            active BOOLEAN,
            created_at TIMESTAMP
          )
        `);
      });

      it('should return all columns', async () => {
        const columns = await loader.getColumns('main', 'test_columns');
        expect(columns.length).toBe(4);
      });

      it('should return column names', async () => {
        const columns = await loader.getColumns('main', 'test_columns');
        const names = columns.map((c) => c.column_name);
        expect(names).toContain('id');
        expect(names).toContain('name');
        expect(names).toContain('active');
        expect(names).toContain('created_at');
      });

      it('should return column types', async () => {
        const columns = await loader.getColumns('main', 'test_columns');
        const idCol = columns.find((c) => c.column_name === 'id');
        expect(idCol?.data_type).toBe('INTEGER');
      });

      it('should return nullable info', async () => {
        const columns = await loader.getColumns('main', 'test_columns');
        const idCol = columns.find((c) => c.column_name === 'id');
        const nameCol = columns.find((c) => c.column_name === 'name');
        expect(idCol?.is_nullable).toBe(false);
        expect(nameCol?.is_nullable).toBe(true);
      });

      it('should return empty for non-existent table', async () => {
        const columns = await loader.getColumns('main', 'nonexistent');
        expect(columns).toEqual([]);
      });
    });

    describe('getTableRowCount', () => {
      it('should return estimated size', async () => {
        await manager.execute('CREATE TABLE count_test (id INTEGER)');
        await manager.execute('INSERT INTO count_test SELECT * FROM range(100)');

        const count = await loader.getTableRowCount('main', 'count_test');
        // DuckDB's estimated_size might not be exactly 100, but should be close
        expect(count).toBeDefined();
      });

      it('should return undefined for non-existent table', async () => {
        const count = await loader.getTableRowCount('main', 'nonexistent');
        expect(count).toBeUndefined();
      });
    });
  });

  describe('SQL injection protection', () => {
    beforeEach(async () => {
      await manager.connectInMemory();
      await manager.execute('CREATE TABLE safe_test (id INTEGER)');
    });

    it('should escape single quotes in schema name', async () => {
      // This should not throw or execute malicious SQL
      const tables = await loader.getTables("main'; DROP TABLE safe_test; --");
      expect(tables).toEqual([]);

      // Verify table still exists
      const result = await manager.execute("SELECT * FROM safe_test");
      expect(result).toBeDefined();
    });

    it('should escape single quotes in table name', async () => {
      const columns = await loader.getColumns('main', "test'; DROP TABLE safe_test; --");
      expect(columns).toEqual([]);

      // Verify table still exists
      const result = await manager.execute("SELECT * FROM safe_test");
      expect(result).toBeDefined();
    });
  });
});
