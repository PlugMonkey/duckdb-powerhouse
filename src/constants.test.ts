import { describe, it, expect } from 'vitest';

import {
  EXTENSION_ID,
  EXTENSION_NAME,
  VIEWS,
  COMMANDS,
  CONFIG_KEYS,
  DEFAULTS,
  SUPPORTED_FILE_EXTENSIONS,
} from './constants';

describe('Constants', () => {
  describe('EXTENSION_ID', () => {
    it('should be duckdb-powerhouse', () => {
      expect(EXTENSION_ID).toBe('duckdb-powerhouse');
    });
  });

  describe('EXTENSION_NAME', () => {
    it('should be DuckDB Powerhouse', () => {
      expect(EXTENSION_NAME).toBe('DuckDB Powerhouse');
    });
  });

  describe('VIEWS', () => {
    it('should have EXPLORER view', () => {
      expect(VIEWS.EXPLORER).toBe('duckdbExplorer');
    });
  });

  describe('COMMANDS', () => {
    it('should have properly prefixed commands', () => {
      expect(COMMANDS.CREATE_CONNECTION).toBe('duckdb-powerhouse.createConnection');
      expect(COMMANDS.RUN_QUERY).toBe('duckdb-powerhouse.runQuery');
      expect(COMMANDS.REFRESH_EXPLORER).toBe('duckdb-powerhouse.refreshExplorer');
    });

    it('should all start with extension ID', () => {
      Object.values(COMMANDS).forEach((command) => {
        expect(command.startsWith(EXTENSION_ID)).toBe(true);
      });
    });
  });

  describe('CONFIG_KEYS', () => {
    it('should have expected config keys', () => {
      expect(CONFIG_KEYS.MAX_RESULT_ROWS).toBe('maxResultRows');
      expect(CONFIG_KEYS.DUCKDB_PATH).toBe('duckdbPath');
      expect(CONFIG_KEYS.DEFAULT_RESULT_LIMIT).toBe('defaultResultLimit');
    });
  });

  describe('DEFAULTS', () => {
    it('should have sensible default values', () => {
      expect(DEFAULTS.MAX_RESULT_ROWS).toBe(10000);
      expect(DEFAULTS.DEFAULT_RESULT_LIMIT).toBe(100);
      expect(DEFAULTS.PREVIEW_LIMIT).toBe(100);
    });

    it('should have MAX_RESULT_ROWS >= DEFAULT_RESULT_LIMIT', () => {
      expect(DEFAULTS.MAX_RESULT_ROWS).toBeGreaterThanOrEqual(DEFAULTS.DEFAULT_RESULT_LIMIT);
    });
  });

  describe('SUPPORTED_FILE_EXTENSIONS', () => {
    it('should include common data file extensions', () => {
      expect(SUPPORTED_FILE_EXTENSIONS).toContain('.parquet');
      expect(SUPPORTED_FILE_EXTENSIONS).toContain('.csv');
      expect(SUPPORTED_FILE_EXTENSIONS).toContain('.json');
    });

    it('should all start with a dot', () => {
      SUPPORTED_FILE_EXTENSIONS.forEach((ext) => {
        expect(ext.startsWith('.')).toBe(true);
      });
    });
  });
});
