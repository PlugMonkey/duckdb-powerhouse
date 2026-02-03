import { describe, it, expect } from 'vitest';

import {
  isSupportedExtension,
  isSupportedFile,
  getFileType,
  escapeFilePath,
  generateSelectQuery,
  generateDescribeQuery,
  generateCountQuery,
  getFileTypeName,
  SUPPORTED_EXTENSIONS,
} from './utils';

describe('file-query/utils', () => {
  describe('SUPPORTED_EXTENSIONS', () => {
    it('should include common data file extensions', () => {
      expect(SUPPORTED_EXTENSIONS).toContain('.parquet');
      expect(SUPPORTED_EXTENSIONS).toContain('.csv');
      expect(SUPPORTED_EXTENSIONS).toContain('.tsv');
      expect(SUPPORTED_EXTENSIONS).toContain('.json');
      expect(SUPPORTED_EXTENSIONS).toContain('.jsonl');
      expect(SUPPORTED_EXTENSIONS).toContain('.ndjson');
    });
  });

  describe('isSupportedExtension', () => {
    it('should return true for supported extensions', () => {
      expect(isSupportedExtension('.parquet')).toBe(true);
      expect(isSupportedExtension('.csv')).toBe(true);
      expect(isSupportedExtension('.json')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isSupportedExtension('.PARQUET')).toBe(true);
      expect(isSupportedExtension('.CSV')).toBe(true);
      expect(isSupportedExtension('.Json')).toBe(true);
    });

    it('should return false for unsupported extensions', () => {
      expect(isSupportedExtension('.txt')).toBe(false);
      expect(isSupportedExtension('.xlsx')).toBe(false);
      expect(isSupportedExtension('.sql')).toBe(false);
    });
  });

  describe('isSupportedFile', () => {
    it('should return true for supported files', () => {
      expect(isSupportedFile('/path/to/data.parquet')).toBe(true);
      expect(isSupportedFile('/path/to/data.csv')).toBe(true);
      expect(isSupportedFile('/path/to/data.json')).toBe(true);
      expect(isSupportedFile('/path/to/data.jsonl')).toBe(true);
      expect(isSupportedFile('/path/to/data.tsv')).toBe(true);
    });

    it('should return false for unsupported files', () => {
      expect(isSupportedFile('/path/to/data.txt')).toBe(false);
      expect(isSupportedFile('/path/to/data.xlsx')).toBe(false);
    });
  });

  describe('getFileType', () => {
    it('should return parquet for .parquet files', () => {
      expect(getFileType('/path/to/data.parquet')).toBe('parquet');
    });

    it('should return csv for .csv and .tsv files', () => {
      expect(getFileType('/path/to/data.csv')).toBe('csv');
      expect(getFileType('/path/to/data.tsv')).toBe('csv');
    });

    it('should return json for .json, .jsonl, .ndjson files', () => {
      expect(getFileType('/path/to/data.json')).toBe('json');
      expect(getFileType('/path/to/data.jsonl')).toBe('json');
      expect(getFileType('/path/to/data.ndjson')).toBe('json');
    });

    it('should return null for unsupported files', () => {
      expect(getFileType('/path/to/data.txt')).toBeNull();
      expect(getFileType('/path/to/data.xlsx')).toBeNull();
    });
  });

  describe('escapeFilePath', () => {
    it('should escape single quotes by doubling them', () => {
      expect(escapeFilePath("/path/to/file's data.csv")).toBe("/path/to/file''s data.csv");
    });

    it('should handle multiple quotes', () => {
      expect(escapeFilePath("it's a 'test'")).toBe("it''s a ''test''");
    });

    it('should not modify paths without quotes', () => {
      expect(escapeFilePath('/path/to/file.csv')).toBe('/path/to/file.csv');
    });
  });

  describe('generateSelectQuery', () => {
    it('should generate query for parquet files', () => {
      const query = generateSelectQuery('/path/to/data.parquet');
      expect(query).toBe("SELECT * FROM '/path/to/data.parquet';");
    });

    it('should generate query with limit', () => {
      const query = generateSelectQuery('/path/to/data.parquet', 100);
      expect(query).toBe("SELECT * FROM '/path/to/data.parquet' LIMIT 100;");
    });

    it('should generate query for CSV files using read_csv', () => {
      const query = generateSelectQuery('/path/to/data.csv');
      expect(query).toBe("SELECT * FROM read_csv('/path/to/data.csv');");
    });

    it('should generate query for TSV files with delimiter', () => {
      const query = generateSelectQuery('/path/to/data.tsv');
      expect(query).toBe("SELECT * FROM read_csv('/path/to/data.tsv', delim='\\t');");
    });

    it('should generate query for JSON files using read_json', () => {
      const query = generateSelectQuery('/path/to/data.json');
      expect(query).toBe("SELECT * FROM read_json('/path/to/data.json');");
    });

    it('should generate query for JSONL files with format', () => {
      const query = generateSelectQuery('/path/to/data.jsonl');
      expect(query).toBe("SELECT * FROM read_json('/path/to/data.jsonl', format='newline_delimited');");
    });

    it('should generate query for NDJSON files with format', () => {
      const query = generateSelectQuery('/path/to/data.ndjson');
      expect(query).toBe("SELECT * FROM read_json('/path/to/data.ndjson', format='newline_delimited');");
    });

    it('should escape single quotes in paths', () => {
      const query = generateSelectQuery("/path/to/file's data.parquet");
      expect(query).toBe("SELECT * FROM '/path/to/file''s data.parquet';");
    });

    it('should return comment for unsupported files', () => {
      const query = generateSelectQuery('/path/to/data.xlsx');
      expect(query).toBe('-- Unsupported file type: /path/to/data.xlsx');
    });
  });

  describe('generateDescribeQuery', () => {
    it('should generate DESCRIBE query for parquet files', () => {
      const query = generateDescribeQuery('/path/to/data.parquet');
      expect(query).toBe("DESCRIBE SELECT * FROM '/path/to/data.parquet';");
    });

    it('should generate DESCRIBE query for CSV files', () => {
      const query = generateDescribeQuery('/path/to/data.csv');
      expect(query).toBe("DESCRIBE SELECT * FROM read_csv('/path/to/data.csv');");
    });

    it('should generate DESCRIBE query for JSON files', () => {
      const query = generateDescribeQuery('/path/to/data.json');
      expect(query).toBe("DESCRIBE SELECT * FROM read_json('/path/to/data.json');");
    });
  });

  describe('generateCountQuery', () => {
    it('should generate COUNT query for parquet files', () => {
      const query = generateCountQuery('/path/to/data.parquet');
      expect(query).toBe("SELECT COUNT(*) as row_count FROM '/path/to/data.parquet';");
    });

    it('should generate COUNT query for CSV files', () => {
      const query = generateCountQuery('/path/to/data.csv');
      expect(query).toBe("SELECT COUNT(*) as row_count FROM read_csv('/path/to/data.csv');");
    });

    it('should generate COUNT query for JSON files', () => {
      const query = generateCountQuery('/path/to/data.json');
      expect(query).toBe("SELECT COUNT(*) as row_count FROM read_json('/path/to/data.json');");
    });
  });

  describe('getFileTypeName', () => {
    it('should return friendly names for file types', () => {
      expect(getFileTypeName('/path/to/file.parquet')).toBe('Parquet');
      expect(getFileTypeName('/path/to/file.csv')).toBe('CSV');
      expect(getFileTypeName('/path/to/file.tsv')).toBe('TSV');
      expect(getFileTypeName('/path/to/file.json')).toBe('JSON');
      expect(getFileTypeName('/path/to/file.jsonl')).toBe('JSON Lines');
      expect(getFileTypeName('/path/to/file.ndjson')).toBe('JSON Lines');
    });

    it('should return Unknown for unsupported types', () => {
      expect(getFileTypeName('/path/to/file.txt')).toBe('Unknown');
    });
  });
});
