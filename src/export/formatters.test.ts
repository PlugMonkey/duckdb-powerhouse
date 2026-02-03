import { describe, it, expect } from 'vitest';

import { WebviewResultData } from '../results/serializer';
import {
  escapeCsvValue,
  formatAsCsv,
  formatAsJson,
  formatAsTsv,
  formatRowAsTsv,
} from './formatters';

describe('export/formatters', () => {
  // Sample test data
  const sampleResult: WebviewResultData = {
    id: 'test-1',
    sql: 'SELECT * FROM test',
    columns: [
      { name: 'id', index: 0 },
      { name: 'name', index: 1 },
      { name: 'value', index: 2 },
    ],
    rows: [
      [
        { display: '1', raw: 1, type: 'number' },
        { display: 'Alice', raw: 'Alice', type: 'string' },
        { display: '100.5', raw: 100.5, type: 'number' },
      ],
      [
        { display: '2', raw: 2, type: 'number' },
        { display: 'Bob', raw: 'Bob', type: 'string' },
        { display: '200', raw: 200, type: 'number' },
      ],
    ],
    rowCount: 2,
    executionTimeMs: 10,
    truncated: false,
    timestamp: Date.now(),
  };

  describe('escapeCsvValue', () => {
    it('should return simple values unchanged', () => {
      expect(escapeCsvValue('hello')).toBe('hello');
      expect(escapeCsvValue('123')).toBe('123');
      expect(escapeCsvValue('')).toBe('');
    });

    it('should wrap values with commas in quotes', () => {
      expect(escapeCsvValue('hello, world')).toBe('"hello, world"');
    });

    it('should escape and wrap values with quotes', () => {
      expect(escapeCsvValue('say "hello"')).toBe('"say ""hello"""');
    });

    it('should wrap values with newlines in quotes', () => {
      expect(escapeCsvValue('line1\nline2')).toBe('"line1\nline2"');
      expect(escapeCsvValue('line1\r\nline2')).toBe('"line1\r\nline2"');
    });

    it('should handle values with multiple special characters', () => {
      expect(escapeCsvValue('a, "b", c\nd')).toBe('"a, ""b"", c\nd"');
    });
  });

  describe('formatAsCsv', () => {
    it('should format basic result as CSV', () => {
      const csv = formatAsCsv(sampleResult);
      const lines = csv.split('\n');

      expect(lines[0]).toBe('id,name,value');
      expect(lines[1]).toBe('1,Alice,100.5');
      expect(lines[2]).toBe('2,Bob,200');
    });

    it('should handle empty results', () => {
      const emptyResult: WebviewResultData = {
        ...sampleResult,
        rows: [],
        rowCount: 0,
      };

      const csv = formatAsCsv(emptyResult);
      expect(csv).toBe('id,name,value');
    });

    it('should escape column names with special characters', () => {
      const result: WebviewResultData = {
        ...sampleResult,
        columns: [{ name: 'column, "with" special', index: 0 }],
        rows: [[{ display: 'value', raw: 'value', type: 'string' }]],
        rowCount: 1,
      };

      const csv = formatAsCsv(result);
      expect(csv.split('\n')[0]).toBe('"column, ""with"" special"');
    });

    it('should escape cell values with special characters', () => {
      const result: WebviewResultData = {
        ...sampleResult,
        columns: [{ name: 'text', index: 0 }],
        rows: [
          [{ display: 'hello, world', raw: 'hello, world', type: 'string' }],
          [{ display: 'say "hi"', raw: 'say "hi"', type: 'string' }],
        ],
        rowCount: 2,
      };

      const csv = formatAsCsv(result);
      const lines = csv.split('\n');

      expect(lines[1]).toBe('"hello, world"');
      expect(lines[2]).toBe('"say ""hi"""');
    });

    it('should handle NULL values', () => {
      const result: WebviewResultData = {
        ...sampleResult,
        columns: [{ name: 'val', index: 0 }],
        rows: [[{ display: 'NULL', raw: null, type: 'null' }]],
        rowCount: 1,
      };

      const csv = formatAsCsv(result);
      expect(csv.split('\n')[1]).toBe('NULL');
    });
  });

  describe('formatAsJson', () => {
    it('should format basic result as JSON array of objects', () => {
      const json = formatAsJson(sampleResult);
      const parsed = JSON.parse(json) as Record<string, unknown>[];

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({ id: 1, name: 'Alice', value: 100.5 });
      expect(parsed[1]).toEqual({ id: 2, name: 'Bob', value: 200 });
    });

    it('should handle empty results', () => {
      const emptyResult: WebviewResultData = {
        ...sampleResult,
        rows: [],
        rowCount: 0,
      };

      const json = formatAsJson(emptyResult);
      expect(JSON.parse(json) as unknown[]).toEqual([]);
    });

    it('should preserve null values', () => {
      const result: WebviewResultData = {
        ...sampleResult,
        columns: [{ name: 'val', index: 0 }],
        rows: [[{ display: 'NULL', raw: null, type: 'null' }]],
        rowCount: 1,
      };

      const json = formatAsJson(result);
      expect(JSON.parse(json) as unknown[]).toEqual([{ val: null }]);
    });

    it('should preserve nested objects', () => {
      const nested = { a: 1, b: [2, 3] };
      const result: WebviewResultData = {
        ...sampleResult,
        columns: [{ name: 'data', index: 0 }],
        rows: [[{ display: '{"a":1,"b":[2,3]}', raw: nested, type: 'object' }]],
        rowCount: 1,
      };

      const json = formatAsJson(result);
      expect(JSON.parse(json) as unknown[]).toEqual([{ data: nested }]);
    });

    it('should be pretty-printed with 2-space indentation', () => {
      const json = formatAsJson(sampleResult);
      // Check that it's formatted (contains newlines and spaces)
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });
  });

  describe('formatAsTsv', () => {
    it('should format basic result as TSV', () => {
      const tsv = formatAsTsv(sampleResult);
      const lines = tsv.split('\n');

      expect(lines[0]).toBe('id\tname\tvalue');
      expect(lines[1]).toBe('1\tAlice\t100.5');
      expect(lines[2]).toBe('2\tBob\t200');
    });

    it('should handle empty results', () => {
      const emptyResult: WebviewResultData = {
        ...sampleResult,
        rows: [],
        rowCount: 0,
      };

      const tsv = formatAsTsv(emptyResult);
      expect(tsv).toBe('id\tname\tvalue');
    });

    it('should replace tabs in values with spaces', () => {
      const result: WebviewResultData = {
        ...sampleResult,
        columns: [{ name: 'text', index: 0 }],
        rows: [[{ display: 'a\tb\tc', raw: 'a\tb\tc', type: 'string' }]],
        rowCount: 1,
      };

      const tsv = formatAsTsv(result);
      expect(tsv.split('\n')[1]).toBe('a b c');
    });

    it('should replace newlines in values with spaces', () => {
      const result: WebviewResultData = {
        ...sampleResult,
        columns: [{ name: 'text', index: 0 }],
        rows: [[{ display: 'line1\nline2', raw: 'line1\nline2', type: 'string' }]],
        rowCount: 1,
      };

      const tsv = formatAsTsv(result);
      expect(tsv.split('\n')[1]).toBe('line1 line2');
    });
  });

  describe('formatRowAsTsv', () => {
    it('should format a single row as TSV', () => {
      const cells = sampleResult.rows[0]!;
      const tsv = formatRowAsTsv(cells);
      expect(tsv).toBe('1\tAlice\t100.5');
    });

    it('should handle empty row', () => {
      const tsv = formatRowAsTsv([]);
      expect(tsv).toBe('');
    });

    it('should replace tabs and newlines', () => {
      const cells = [
        { display: 'a\tb', raw: 'a\tb', type: 'string' as const },
        { display: 'c\nd', raw: 'c\nd', type: 'string' as const },
      ];
      const tsv = formatRowAsTsv(cells);
      expect(tsv).toBe('a b\tc d');
    });
  });
});
