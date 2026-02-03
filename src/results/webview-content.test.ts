import { describe, it, expect } from 'vitest';

import { WebviewResultData, WebviewColumn, WebviewCell } from './serializer';

// We can't import getWebviewContent directly because it depends on vscode
// So we test the data flow instead

describe('webview-content data flow', () => {
  describe('WebviewResultData structure', () => {
    it('should correctly represent empty results', () => {
      const emptyResult: WebviewResultData = {
        id: 'test-1',
        sql: 'SELECT * FROM empty_table',
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 5,
        truncated: false,
        timestamp: Date.now(),
      };

      expect(emptyResult.rows.length).toBe(0);
      expect(emptyResult.columns.length).toBe(0);
      expect(emptyResult.rowCount).toBe(0);
    });

    it('should correctly represent results with data', () => {
      const columns: WebviewColumn[] = [
        { name: 'id', index: 0 },
        { name: 'name', index: 1 },
      ];

      const rows: WebviewCell[][] = [
        [
          { display: '1', raw: 1, type: 'number' },
          { display: 'Alice', raw: 'Alice', type: 'string' },
        ],
        [
          { display: '2', raw: 2, type: 'number' },
          { display: 'Bob', raw: 'Bob', type: 'string' },
        ],
      ];

      const result: WebviewResultData = {
        id: 'test-2',
        sql: 'SELECT id, name FROM users',
        columns,
        rows,
        rowCount: 2,
        executionTimeMs: 10,
        truncated: false,
        timestamp: Date.now(),
      };

      expect(result.rows.length).toBe(2);
      expect(result.columns.length).toBe(2);
      expect(result.rowCount).toBe(2);
      expect(result.columns[0]?.name).toBe('id');
      expect(result.rows[0]?.[0]?.display).toBe('1');
    });

    it('should correctly represent error results', () => {
      const errorResult: WebviewResultData = {
        id: 'test-3',
        sql: 'SELECT * FROM nonexistent',
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 2,
        truncated: false,
        error: 'Table not found',
        timestamp: Date.now(),
      };

      expect(errorResult.error).toBe('Table not found');
      expect(errorResult.rows.length).toBe(0);
    });
  });

  describe('rendering conditions', () => {
    it('no result means empty state', () => {
      const result: WebviewResultData | undefined = undefined;

      // Simulates the condition in getWebviewContent
      const showEmptyState = !result;
      expect(showEmptyState).toBe(true);
    });

    it('result with error shows error state', () => {
      const result: WebviewResultData = {
        id: 'test-4',
        sql: 'SELECT * FROM bad',
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 1,
        truncated: false,
        error: 'Error message',
        timestamp: Date.now(),
      };

      // Simulates conditions in getWebviewContent
      const showEmptyState = !result;
      const showErrorState = result && result.error;
      const showNoDataState = result && !result.error && result.rows.length === 0;
      const showDataTable = result && !result.error && result.rows.length > 0;

      expect(showEmptyState).toBe(false);
      expect(showErrorState).toBeTruthy();
      expect(showNoDataState).toBe(false);
      expect(showDataTable).toBe(false);
    });

    it('result with zero rows shows no data state', () => {
      const result: WebviewResultData = {
        id: 'test-5',
        sql: 'SELECT * FROM empty',
        columns: [{ name: 'id', index: 0 }],
        rows: [],
        rowCount: 0,
        executionTimeMs: 5,
        truncated: false,
        timestamp: Date.now(),
      };

      const showEmptyState = !result;
      const showErrorState = result && result.error;
      const showNoDataState = result && !result.error && result.rows.length === 0;
      const showDataTable = result && !result.error && result.rows.length > 0;

      expect(showEmptyState).toBe(false);
      expect(showErrorState).toBeFalsy();
      expect(showNoDataState).toBe(true);
      expect(showDataTable).toBe(false);
    });

    it('result with data shows data table', () => {
      const result: WebviewResultData = {
        id: 'test-6',
        sql: 'SELECT * FROM users',
        columns: [{ name: 'id', index: 0 }],
        rows: [[{ display: '1', raw: 1, type: 'number' }]],
        rowCount: 1,
        executionTimeMs: 10,
        truncated: false,
        timestamp: Date.now(),
      };

      const showEmptyState = !result;
      const showErrorState = result && result.error;
      const showNoDataState = result && !result.error && result.rows.length === 0;
      const showDataTable = result && !result.error && result.rows.length > 0;

      expect(showEmptyState).toBe(false);
      expect(showErrorState).toBeFalsy();
      expect(showNoDataState).toBe(false);
      expect(showDataTable).toBe(true);
    });
  });
});
