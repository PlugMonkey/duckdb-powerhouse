import { describe, it, expect, beforeEach, vi } from 'vitest';

import { QueryExecutionResult } from '../editor/commands';
import { serializeResult, getSortValue, WebviewCell } from './serializer';

describe('serializer', () => {
  describe('serializeResult', () => {
    beforeEach(() => {
      // Mock Date.now for consistent IDs/timestamps
      vi.spyOn(Date, 'now').mockReturnValue(1704067200000);
      vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
    });

    it('should serialize a basic result', () => {
      const result: QueryExecutionResult = {
        sql: 'SELECT id, name FROM users',
        columns: ['id', 'name'],
        rows: [
          [1, 'Alice'],
          [2, 'Bob'],
        ],
        rowCount: 2,
        executionTimeMs: 15.5,
        truncated: false,
      };

      const serialized = serializeResult(result);

      expect(serialized.sql).toBe('SELECT id, name FROM users');
      expect(serialized.columns).toEqual([
        { name: 'id', index: 0 },
        { name: 'name', index: 1 },
      ]);
      expect(serialized.rowCount).toBe(2);
      expect(serialized.executionTimeMs).toBe(15.5);
      expect(serialized.truncated).toBe(false);
      expect(serialized.error).toBeUndefined();
      expect(serialized.timestamp).toBe(1704067200000);
      expect(serialized.id).toMatch(/^result-/);
    });

    it('should serialize rows with correct cell types', () => {
      const result: QueryExecutionResult = {
        sql: 'SELECT * FROM test',
        columns: ['a', 'b', 'c', 'd', 'e'],
        rows: [[42, 'hello', true, null, { nested: 'obj' }]],
        rowCount: 1,
        executionTimeMs: 5,
        truncated: false,
      };

      const serialized = serializeResult(result);
      const row = serialized.rows[0]!;

      expect(row[0]).toEqual({ display: '42', raw: 42, type: 'number' });
      expect(row[1]).toEqual({ display: 'hello', raw: 'hello', type: 'string' });
      expect(row[2]).toEqual({ display: 'true', raw: true, type: 'boolean' });
      expect(row[3]).toEqual({ display: 'NULL', raw: null, type: 'null' });
      expect(row[4]).toEqual({
        display: '{"nested":"obj"}',
        raw: { nested: 'obj' },
        type: 'object',
      });
    });

    it('should handle arrays', () => {
      const result: QueryExecutionResult = {
        sql: 'SELECT arr FROM test',
        columns: ['arr'],
        rows: [[[1, 2, 3]]],
        rowCount: 1,
        executionTimeMs: 1,
        truncated: false,
      };

      const serialized = serializeResult(result);

      expect(serialized.rows[0]![0]).toEqual({
        display: '[1,2,3]',
        raw: [1, 2, 3],
        type: 'array',
      });
    });

    it('should serialize errors', () => {
      const result: QueryExecutionResult = {
        sql: 'SELECT * FROM nonexistent',
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 2,
        truncated: false,
        error: 'Table not found: nonexistent',
      };

      const serialized = serializeResult(result);

      expect(serialized.error).toBe('Table not found: nonexistent');
      expect(serialized.columns).toEqual([]);
      expect(serialized.rows).toEqual([]);
    });

    it('should handle truncated results', () => {
      const result: QueryExecutionResult = {
        sql: 'SELECT * FROM big_table',
        columns: ['id'],
        rows: Array.from({ length: 1000 }, (_, i) => [i]),
        rowCount: 1000,
        executionTimeMs: 100,
        truncated: true,
      };

      const serialized = serializeResult(result);

      expect(serialized.truncated).toBe(true);
      expect(serialized.rowCount).toBe(1000);
      expect(serialized.rows.length).toBe(1000);
    });

    it('should handle empty results', () => {
      const result: QueryExecutionResult = {
        sql: 'SELECT * FROM empty_table',
        columns: ['id', 'name'],
        rows: [],
        rowCount: 0,
        executionTimeMs: 3,
        truncated: false,
      };

      const serialized = serializeResult(result);

      expect(serialized.columns).toHaveLength(2);
      expect(serialized.rows).toHaveLength(0);
      expect(serialized.rowCount).toBe(0);
    });

    it('should format floats with reasonable precision', () => {
      const result: QueryExecutionResult = {
        sql: 'SELECT pi FROM numbers',
        columns: ['pi'],
        rows: [[3.14159265358979]],
        rowCount: 1,
        executionTimeMs: 1,
        truncated: false,
      };

      const serialized = serializeResult(result);
      const cell = serialized.rows[0]![0]!;

      // Should be formatted with locale and limited decimal places
      expect(cell.type).toBe('number');
      expect(cell.raw).toBe(3.14159265358979);
    });

    it('should handle bigint values', () => {
      const result: QueryExecutionResult = {
        sql: 'SELECT big FROM numbers',
        columns: ['big'],
        rows: [[BigInt('9007199254740993')]],
        rowCount: 1,
        executionTimeMs: 1,
        truncated: false,
      };

      const serialized = serializeResult(result);
      const cell = serialized.rows[0]![0]!;

      expect(cell.type).toBe('number');
      expect(cell.display).toBe('9007199254740993');
    });

    it('should handle undefined values', () => {
      const result: QueryExecutionResult = {
        sql: 'SELECT val FROM test',
        columns: ['val'],
        rows: [[undefined]],
        rowCount: 1,
        executionTimeMs: 1,
        truncated: false,
      };

      const serialized = serializeResult(result);

      expect(serialized.rows[0]![0]).toEqual({
        display: '',
        raw: undefined,
        type: 'null',
      });
    });

    it('should handle Date values', () => {
      const date = new Date('2024-01-01T12:00:00.000Z');
      const result: QueryExecutionResult = {
        sql: 'SELECT created_at FROM events',
        columns: ['created_at'],
        rows: [[date]],
        rowCount: 1,
        executionTimeMs: 1,
        truncated: false,
      };

      const serialized = serializeResult(result);
      const cell = serialized.rows[0]![0]!;

      expect(cell.display).toBe('2024-01-01T12:00:00.000Z');
      expect(cell.type).toBe('object'); // Date is object type
    });
  });

  describe('getSortValue', () => {
    it('should return empty string for null type', () => {
      const cell: WebviewCell = { display: 'NULL', raw: null, type: 'null' };
      expect(getSortValue(cell)).toBe('');
    });

    it('should return number for number type', () => {
      const cell: WebviewCell = { display: '42', raw: 42, type: 'number' };
      expect(getSortValue(cell)).toBe(42);
    });

    it('should return lowercase display for string type', () => {
      const cell: WebviewCell = { display: 'Hello', raw: 'Hello', type: 'string' };
      expect(getSortValue(cell)).toBe('hello');
    });

    it('should return lowercase display for boolean type', () => {
      const cell: WebviewCell = { display: 'true', raw: true, type: 'boolean' };
      expect(getSortValue(cell)).toBe('true');
    });

    it('should return lowercase display for object type', () => {
      const cell: WebviewCell = {
        display: '{"a":1}',
        raw: { a: 1 },
        type: 'object',
      };
      expect(getSortValue(cell)).toBe('{"a":1}');
    });

    it('should return lowercase display for array type', () => {
      const cell: WebviewCell = {
        display: '[1,2,3]',
        raw: [1, 2, 3],
        type: 'array',
      };
      expect(getSortValue(cell)).toBe('[1,2,3]');
    });
  });
});
