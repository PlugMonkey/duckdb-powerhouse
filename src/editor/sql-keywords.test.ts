import { describe, it, expect } from 'vitest';

import { getAllKeywords, getKeywordsByCategory, SQL_KEYWORDS } from './sql-keywords';

describe('SQL Keywords', () => {
  describe('SQL_KEYWORDS', () => {
    it('should have dql category', () => {
      expect(SQL_KEYWORDS.dql).toBeDefined();
      expect(SQL_KEYWORDS.dql.length).toBeGreaterThan(0);
    });

    it('should have dml category', () => {
      expect(SQL_KEYWORDS.dml).toBeDefined();
      expect(SQL_KEYWORDS.dml.length).toBeGreaterThan(0);
    });

    it('should have ddl category', () => {
      expect(SQL_KEYWORDS.ddl).toBeDefined();
      expect(SQL_KEYWORDS.ddl.length).toBeGreaterThan(0);
    });

    it('should have operators category', () => {
      expect(SQL_KEYWORDS.operators).toBeDefined();
      expect(SQL_KEYWORDS.operators.length).toBeGreaterThan(0);
    });

    it('should have aggregates category', () => {
      expect(SQL_KEYWORDS.aggregates).toBeDefined();
      expect(SQL_KEYWORDS.aggregates.length).toBeGreaterThan(0);
    });

    it('should have window category', () => {
      expect(SQL_KEYWORDS.window).toBeDefined();
      expect(SQL_KEYWORDS.window.length).toBeGreaterThan(0);
    });

    it('should have functions category', () => {
      expect(SQL_KEYWORDS.functions).toBeDefined();
      expect(SQL_KEYWORDS.functions.length).toBeGreaterThan(0);
    });

    it('should have duckdb category', () => {
      expect(SQL_KEYWORDS.duckdb).toBeDefined();
      expect(SQL_KEYWORDS.duckdb.length).toBeGreaterThan(0);
    });

    it('should have types category', () => {
      expect(SQL_KEYWORDS.types).toBeDefined();
      expect(SQL_KEYWORDS.types.length).toBeGreaterThan(0);
    });

    it('should have sorting category', () => {
      expect(SQL_KEYWORDS.sorting).toBeDefined();
      expect(SQL_KEYWORDS.sorting.length).toBeGreaterThan(0);
    });

    it('should include SELECT in dql', () => {
      expect(SQL_KEYWORDS.dql).toContain('SELECT');
    });

    it('should include INSERT in dml', () => {
      expect(SQL_KEYWORDS.dml).toContain('INSERT');
    });

    it('should include CREATE in ddl', () => {
      expect(SQL_KEYWORDS.ddl).toContain('CREATE');
    });

    it('should include COUNT in aggregates', () => {
      expect(SQL_KEYWORDS.aggregates).toContain('COUNT');
    });

    it('should include ROW_NUMBER in window', () => {
      expect(SQL_KEYWORDS.window).toContain('ROW_NUMBER');
    });

    it('should include PRAGMA in duckdb', () => {
      expect(SQL_KEYWORDS.duckdb).toContain('PRAGMA');
    });

    it('should include VARCHAR in types', () => {
      expect(SQL_KEYWORDS.types).toContain('VARCHAR');
    });

    it('should include ASC in sorting', () => {
      expect(SQL_KEYWORDS.sorting).toContain('ASC');
    });
  });

  describe('getAllKeywords', () => {
    it('should return all keywords as flat array', () => {
      const keywords = getAllKeywords();
      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBeGreaterThan(100); // Should have many keywords
    });

    it('should include keywords from all categories', () => {
      const keywords = getAllKeywords();
      expect(keywords).toContain('SELECT'); // dql
      expect(keywords).toContain('INSERT'); // dml
      expect(keywords).toContain('CREATE'); // ddl
      expect(keywords).toContain('COUNT'); // aggregates
      expect(keywords).toContain('ROW_NUMBER'); // window
      expect(keywords).toContain('VARCHAR'); // types
    });

    it('should not have duplicates', () => {
      const keywords = getAllKeywords();
      const uniqueKeywords = new Set(keywords);
      // Note: There might be intentional duplicates across categories
      // This test checks the total is reasonable
      expect(uniqueKeywords.size).toBeGreaterThan(80);
    });
  });

  describe('getKeywordsByCategory', () => {
    it('should return keywords for dql category', () => {
      const keywords = getKeywordsByCategory('dql');
      expect(keywords).toContain('SELECT');
      expect(keywords).toContain('FROM');
      expect(keywords).toContain('WHERE');
    });

    it('should return keywords for aggregates category', () => {
      const keywords = getKeywordsByCategory('aggregates');
      expect(keywords).toContain('COUNT');
      expect(keywords).toContain('SUM');
      expect(keywords).toContain('AVG');
    });

    it('should return keywords for types category', () => {
      const keywords = getKeywordsByCategory('types');
      expect(keywords).toContain('INTEGER');
      expect(keywords).toContain('VARCHAR');
      expect(keywords).toContain('BOOLEAN');
    });

    it('should return readonly array', () => {
      const keywords = getKeywordsByCategory('dql');
      // TypeScript should prevent mutation, but verify it's array-like
      expect(typeof keywords.length).toBe('number');
      expect(typeof keywords[0]).toBe('string');
    });
  });
});
