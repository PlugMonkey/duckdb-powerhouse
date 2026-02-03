import * as vscode from 'vscode';

import { ConnectionManager } from '../connection';
import { SchemaLoader } from '../explorer/schema-loader';
import { Logger } from '../utils/logger';
import { getAllKeywords, SQL_KEYWORDS } from './sql-keywords';

/**
 * Provides SQL autocomplete suggestions for DuckDB queries.
 */
export class SqlCompletionProvider implements vscode.CompletionItemProvider {
  private readonly schemaLoader: SchemaLoader;
  private cachedTables: Map<string, string[]> = new Map(); // schema -> tables
  private cachedColumns: Map<string, string[]> = new Map(); // schema.table -> columns
  private cacheTimestamp = 0;
  private readonly cacheTimeout = 30000; // 30 seconds

  constructor(private readonly connectionManager: ConnectionManager) {
    this.schemaLoader = new SchemaLoader(connectionManager);
  }

  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[]> {
    const items: vscode.CompletionItem[] = [];

    // Get the text before the cursor
    const lineText = document.lineAt(position).text;
    const textBeforeCursor = lineText.substring(0, position.character);

    // Get the current word being typed
    const wordRange = document.getWordRangeAtPosition(position, /[\w.]+/);
    const currentWord = wordRange ? document.getText(wordRange) : '';

    // Check context to provide relevant completions
    const context = this.analyzeContext(textBeforeCursor, currentWord);

    // Always add SQL keywords
    items.push(...this.getKeywordCompletions(context));

    // Add table and column completions if connected
    if (this.connectionManager.isConnected) {
      await this.refreshCacheIfNeeded();

      if (context.expectingTable || context.afterFrom || context.afterJoin) {
        items.push(...this.getTableCompletions());
      }

      if (context.expectingColumn || context.afterSelect || context.afterWhere || context.afterOrderBy) {
        items.push(...this.getColumnCompletions(context.tableName));
      }

      // If typing a qualified name (schema.table or table.column)
      if (currentWord.includes('.')) {
        items.push(...this.getQualifiedCompletions(currentWord));
      }
    }

    return items;
  }

  /**
   * Analyze the SQL context to determine what completions to offer.
   */
  private analyzeContext(textBefore: string, currentWord: string): CompletionContext {
    const upperText = textBefore.toUpperCase().trim();
    const words = upperText.split(/\s+/);
    const lastKeyword = this.findLastKeyword(words);

    return {
      afterSelect: lastKeyword === 'SELECT' || (upperText.includes('SELECT') && !upperText.includes('FROM')),
      afterFrom: lastKeyword === 'FROM',
      afterJoin: ['JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS'].includes(lastKeyword),
      afterWhere: lastKeyword === 'WHERE' || (upperText.includes('WHERE') && !upperText.includes('GROUP')),
      afterOrderBy: lastKeyword === 'BY' && upperText.includes('ORDER'),
      afterGroupBy: lastKeyword === 'BY' && upperText.includes('GROUP'),
      expectingTable: ['FROM', 'JOIN', 'INTO', 'UPDATE', 'TABLE'].includes(lastKeyword),
      expectingColumn: ['SELECT', 'WHERE', 'ON', 'AND', 'OR', 'SET', 'BY'].includes(lastKeyword),
      tableName: this.extractTableName(upperText),
      currentWord,
    };
  }

  /**
   * Find the last SQL keyword in the words array.
   */
  private findLastKeyword(words: string[]): string {
    const allKeywords = new Set(getAllKeywords().map((k) => k.toUpperCase()));
    for (let i = words.length - 1; i >= 0; i--) {
      const word = words[i];
      if (word && allKeywords.has(word)) {
        return word;
      }
    }
    return '';
  }

  /**
   * Try to extract the main table name from the query.
   */
  private extractTableName(text: string): string | undefined {
    // Simple extraction: find word after FROM
    const fromMatch = text.match(/FROM\s+["']?(\w+)["']?/i);
    if (fromMatch?.[1]) {
      return fromMatch[1];
    }
    return undefined;
  }

  /**
   * Get SQL keyword completions.
   */
  private getKeywordCompletions(context: CompletionContext): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];

    // Prioritize keywords based on context
    const priorityKeywords: string[] = [];

    if (context.afterSelect) {
      priorityKeywords.push('FROM', 'DISTINCT', 'AS', '*');
    } else if (context.afterFrom) {
      priorityKeywords.push('WHERE', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'GROUP BY', 'ORDER BY', 'LIMIT');
    } else if (context.afterWhere) {
      priorityKeywords.push('AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS NULL', 'IS NOT NULL');
    } else if (context.afterJoin) {
      priorityKeywords.push('ON', 'USING');
    }

    // Add priority keywords first
    for (const keyword of priorityKeywords) {
      const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
      item.sortText = '0' + keyword; // Sort first
      items.push(item);
    }

    // Add all keywords
    for (const keyword of getAllKeywords()) {
      if (!priorityKeywords.includes(keyword)) {
        const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
        item.sortText = '1' + keyword;
        items.push(item);
      }
    }

    // Add aggregate functions with snippets
    for (const func of SQL_KEYWORDS.aggregates) {
      const item = new vscode.CompletionItem(func, vscode.CompletionItemKind.Function);
      item.insertText = new vscode.SnippetString(`${func}(\${1:column})`);
      item.sortText = '2' + func;
      items.push(item);
    }

    return items;
  }

  /**
   * Get table name completions.
   */
  private getTableCompletions(): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];

    for (const [schema, tables] of this.cachedTables) {
      for (const table of tables) {
        const item = new vscode.CompletionItem(table, vscode.CompletionItemKind.Class);
        item.detail = `Table in ${schema}`;
        item.insertText = table.includes('-') || table.includes(' ') ? `"${table}"` : table;
        item.sortText = '0' + table; // Tables first
        items.push(item);

        // Also add qualified name
        const qualified = `${schema}.${table}`;
        const qualItem = new vscode.CompletionItem(qualified, vscode.CompletionItemKind.Class);
        qualItem.detail = 'Qualified table name';
        qualItem.insertText = `"${schema}"."${table}"`;
        qualItem.sortText = '1' + qualified;
        items.push(qualItem);
      }
    }

    return items;
  }

  /**
   * Get column name completions, optionally filtered by table.
   */
  private getColumnCompletions(tableName?: string): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];

    if (tableName) {
      // Get columns for specific table
      for (const [key, columns] of this.cachedColumns) {
        if (key.toLowerCase().endsWith(`.${tableName.toLowerCase()}`)) {
          for (const column of columns) {
            const item = new vscode.CompletionItem(column, vscode.CompletionItemKind.Field);
            item.detail = `Column in ${tableName}`;
            item.sortText = '0' + column;
            items.push(item);
          }
        }
      }
    } else {
      // Get all columns
      for (const [key, columns] of this.cachedColumns) {
        const [schema, table] = key.split('.');
        for (const column of columns) {
          const item = new vscode.CompletionItem(column, vscode.CompletionItemKind.Field);
          item.detail = `Column in ${schema}.${table}`;
          item.sortText = '1' + column;
          items.push(item);
        }
      }
    }

    return items;
  }

  /**
   * Get completions for qualified names (schema.table or table.column).
   */
  private getQualifiedCompletions(partial: string): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];
    const parts = partial.split('.');
    const prefix = parts[0]?.toLowerCase() ?? '';

    // Could be schema.table or table.column
    // Check if prefix matches a schema
    if (this.cachedTables.has(prefix)) {
      const tables = this.cachedTables.get(prefix) ?? [];
      for (const table of tables) {
        const item = new vscode.CompletionItem(table, vscode.CompletionItemKind.Class);
        item.detail = `Table in ${prefix}`;
        items.push(item);
      }
    }

    // Check if prefix matches a table
    for (const [key, columns] of this.cachedColumns) {
      const tableName = key.split('.')[1]?.toLowerCase();
      if (tableName === prefix) {
        for (const column of columns) {
          const item = new vscode.CompletionItem(column, vscode.CompletionItemKind.Field);
          item.detail = `Column in ${prefix}`;
          items.push(item);
        }
      }
    }

    return items;
  }

  /**
   * Refresh the schema cache if needed.
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.cacheTimestamp > this.cacheTimeout) {
      await this.refreshCache();
    }
  }

  /**
   * Refresh the schema cache.
   */
  async refreshCache(): Promise<void> {
    if (!this.connectionManager.isConnected) {
      this.cachedTables.clear();
      this.cachedColumns.clear();
      return;
    }

    try {
      const schemas = await this.schemaLoader.getSchemas();

      this.cachedTables.clear();
      this.cachedColumns.clear();

      for (const schema of schemas) {
        const tables = await this.schemaLoader.getTables(schema.schema_name);
        const tableNames = tables.map((t) => t.table_name);
        this.cachedTables.set(schema.schema_name, tableNames);

        for (const table of tables) {
          const columns = await this.schemaLoader.getColumns(schema.schema_name, table.table_name);
          const columnNames = columns.map((c) => c.column_name);
          this.cachedColumns.set(`${schema.schema_name}.${table.table_name}`, columnNames);
        }
      }

      this.cacheTimestamp = Date.now();
      Logger.debug('Refreshed completion cache', {
        schemas: schemas.length,
        tables: this.cachedTables.size,
      });
    } catch (err) {
      Logger.error('Failed to refresh completion cache', err);
    }
  }

  /**
   * Clear the cache.
   */
  clearCache(): void {
    this.cachedTables.clear();
    this.cachedColumns.clear();
    this.cacheTimestamp = 0;
  }
}

interface CompletionContext {
  afterSelect: boolean;
  afterFrom: boolean;
  afterJoin: boolean;
  afterWhere: boolean;
  afterOrderBy: boolean;
  afterGroupBy: boolean;
  expectingTable: boolean;
  expectingColumn: boolean;
  tableName?: string;
  currentWord: string;
}
