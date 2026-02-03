/**
 * SQL keywords for autocomplete.
 * Organized by category for potential filtering.
 */

export const SQL_KEYWORDS = {
  /** Data Query Language */
  dql: [
    'SELECT',
    'FROM',
    'WHERE',
    'GROUP BY',
    'HAVING',
    'ORDER BY',
    'LIMIT',
    'OFFSET',
    'DISTINCT',
    'ALL',
    'AS',
    'JOIN',
    'INNER JOIN',
    'LEFT JOIN',
    'RIGHT JOIN',
    'FULL JOIN',
    'CROSS JOIN',
    'ON',
    'USING',
    'UNION',
    'UNION ALL',
    'INTERSECT',
    'EXCEPT',
    'WITH',
    'RECURSIVE',
  ],

  /** Data Manipulation Language */
  dml: [
    'INSERT',
    'INTO',
    'VALUES',
    'UPDATE',
    'SET',
    'DELETE',
    'TRUNCATE',
    'MERGE',
    'COPY',
  ],

  /** Data Definition Language */
  ddl: [
    'CREATE',
    'ALTER',
    'DROP',
    'TABLE',
    'VIEW',
    'INDEX',
    'SCHEMA',
    'DATABASE',
    'SEQUENCE',
    'TYPE',
    'FUNCTION',
    'MACRO',
    'PRIMARY KEY',
    'FOREIGN KEY',
    'REFERENCES',
    'UNIQUE',
    'NOT NULL',
    'DEFAULT',
    'CHECK',
    'CONSTRAINT',
    'CASCADE',
    'RESTRICT',
    'IF EXISTS',
    'IF NOT EXISTS',
    'OR REPLACE',
  ],

  /** Operators and expressions */
  operators: [
    'AND',
    'OR',
    'NOT',
    'IN',
    'EXISTS',
    'BETWEEN',
    'LIKE',
    'ILIKE',
    'SIMILAR TO',
    'IS NULL',
    'IS NOT NULL',
    'IS TRUE',
    'IS FALSE',
    'CASE',
    'WHEN',
    'THEN',
    'ELSE',
    'END',
    'CAST',
    'COALESCE',
    'NULLIF',
    'GREATEST',
    'LEAST',
  ],

  /** Aggregate functions */
  aggregates: [
    'COUNT',
    'SUM',
    'AVG',
    'MIN',
    'MAX',
    'FIRST',
    'LAST',
    'LIST',
    'STRING_AGG',
    'GROUP_CONCAT',
    'ARRAY_AGG',
    'BOOL_AND',
    'BOOL_OR',
    'BIT_AND',
    'BIT_OR',
    'BIT_XOR',
  ],

  /** Window functions */
  window: [
    'OVER',
    'PARTITION BY',
    'ROW_NUMBER',
    'RANK',
    'DENSE_RANK',
    'NTILE',
    'LAG',
    'LEAD',
    'FIRST_VALUE',
    'LAST_VALUE',
    'NTH_VALUE',
  ],

  /** Common functions */
  functions: [
    'ABS',
    'CEIL',
    'FLOOR',
    'ROUND',
    'TRUNC',
    'LENGTH',
    'LOWER',
    'UPPER',
    'TRIM',
    'LTRIM',
    'RTRIM',
    'SUBSTRING',
    'REPLACE',
    'CONCAT',
    'SPLIT_PART',
    'NOW',
    'CURRENT_DATE',
    'CURRENT_TIME',
    'CURRENT_TIMESTAMP',
    'DATE_PART',
    'DATE_TRUNC',
    'EXTRACT',
    'AGE',
    'GENERATE_SERIES',
    'RANGE',
    'UNNEST',
  ],

  /** DuckDB specific */
  duckdb: [
    'DESCRIBE',
    'SHOW',
    'EXPLAIN',
    'ANALYZE',
    'PRAGMA',
    'EXPORT',
    'IMPORT',
    'ATTACH',
    'DETACH',
    'PIVOT',
    'UNPIVOT',
    'QUALIFY',
    'SAMPLE',
    'TABLESAMPLE',
    'POSITIONAL JOIN',
    'ASOF JOIN',
    'COLUMNS',
    'EXCLUDE',
    'REPLACE',
    'STRUCT_PACK',
    'STRUCT_EXTRACT',
    'LIST_VALUE',
    'MAP',
  ],

  /** Data types */
  types: [
    'INTEGER',
    'BIGINT',
    'SMALLINT',
    'TINYINT',
    'HUGEINT',
    'DECIMAL',
    'NUMERIC',
    'REAL',
    'FLOAT',
    'DOUBLE',
    'VARCHAR',
    'TEXT',
    'CHAR',
    'BOOLEAN',
    'DATE',
    'TIME',
    'TIMESTAMP',
    'TIMESTAMPTZ',
    'INTERVAL',
    'BLOB',
    'UUID',
    'JSON',
    'ARRAY',
    'LIST',
    'MAP',
    'STRUCT',
    'ENUM',
  ],

  /** Sort and null handling */
  sorting: ['ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST'],
} as const;

/**
 * Get all SQL keywords as a flat array.
 */
export function getAllKeywords(): string[] {
  return Object.values(SQL_KEYWORDS).flat();
}

/**
 * Get keywords by category.
 */
export function getKeywordsByCategory(category: keyof typeof SQL_KEYWORDS): readonly string[] {
  return SQL_KEYWORDS[category];
}
