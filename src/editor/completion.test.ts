import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';

import { ConnectionManager } from '../connection';
import { SqlCompletionProvider } from './completion';

describe('SqlCompletionProvider', () => {
  let manager: ConnectionManager;
  let provider: SqlCompletionProvider;

  beforeEach(() => {
    manager = new ConnectionManager();
    provider = new SqlCompletionProvider(manager);
  });

  afterEach(async () => {
    await manager.dispose();
  });

  describe('when not connected', () => {
    it('should provide keyword completions', async () => {
      const doc = createMockDocument('SELECT ');
      const position = new vscode.Position(0, 7);

      const items = await provider.provideCompletionItems(
        doc,
        position,
        {} as vscode.CancellationToken,
        {} as vscode.CompletionContext
      );

      expect(items.length).toBeGreaterThan(0);
      const labels = items.map((i) => i.label);
      expect(labels).toContain('FROM');
      expect(labels).toContain('DISTINCT');
    });

    it('should not provide table completions when not connected', async () => {
      const doc = createMockDocument('SELECT * FROM ');
      const position = new vscode.Position(0, 14);

      const items = await provider.provideCompletionItems(
        doc,
        position,
        {} as vscode.CancellationToken,
        {} as vscode.CompletionContext
      );

      // Should only have keyword completions, no tables
      const tableItems = items.filter((i) => i.kind === vscode.CompletionItemKind.Class);
      expect(tableItems.length).toBe(0);
    });
  });

  describe('when connected', () => {
    beforeEach(async () => {
      await manager.connectInMemory();
      await manager.execute('CREATE TABLE users (id INTEGER, name VARCHAR)');
      await manager.execute('CREATE TABLE orders (id INTEGER, user_id INTEGER, total DECIMAL)');
      await provider.refreshCache();
    });

    it('should provide table completions after FROM', async () => {
      const doc = createMockDocument('SELECT * FROM ');
      const position = new vscode.Position(0, 14);

      const items = await provider.provideCompletionItems(
        doc,
        position,
        {} as vscode.CancellationToken,
        {} as vscode.CompletionContext
      );

      const tableItems = items.filter((i) => i.kind === vscode.CompletionItemKind.Class);
      const labels = tableItems.map((i) => i.label);
      expect(labels).toContain('users');
      expect(labels).toContain('orders');
    });

    it('should provide column completions after SELECT', async () => {
      const doc = createMockDocument('SELECT ');
      const position = new vscode.Position(0, 7);

      const items = await provider.provideCompletionItems(
        doc,
        position,
        {} as vscode.CancellationToken,
        {} as vscode.CompletionContext
      );

      const columnItems = items.filter((i) => i.kind === vscode.CompletionItemKind.Field);
      const labels = columnItems.map((i) => i.label);
      expect(labels).toContain('id');
      expect(labels).toContain('name');
    });

    it('should provide keyword completions after WHERE', async () => {
      const doc = createMockDocument('SELECT * FROM users WHERE ');
      const position = new vscode.Position(0, 26);

      const items = await provider.provideCompletionItems(
        doc,
        position,
        {} as vscode.CancellationToken,
        {} as vscode.CompletionContext
      );

      const labels = items.map((i) => i.label);
      expect(labels).toContain('AND');
      expect(labels).toContain('OR');
      expect(labels).toContain('IN');
    });

    it('should provide aggregate function completions with snippets', async () => {
      const doc = createMockDocument('SELECT ');
      const position = new vscode.Position(0, 7);

      const items = await provider.provideCompletionItems(
        doc,
        position,
        {} as vscode.CancellationToken,
        {} as vscode.CompletionContext
      );

      // Find COUNT with Function kind (there may be multiple COUNT items - keyword and function)
      const countFunctionItem = items.find(
        (i) => i.label === 'COUNT' && i.kind === vscode.CompletionItemKind.Function
      );
      expect(countFunctionItem).toBeDefined();
      expect(countFunctionItem?.insertText).toBeInstanceOf(vscode.SnippetString);
    });
  });

  describe('cache management', () => {
    beforeEach(async () => {
      await manager.connectInMemory();
    });

    it('should refresh cache on demand', async () => {
      await manager.execute('CREATE TABLE test_table (col1 INTEGER)');
      await provider.refreshCache();

      const doc = createMockDocument('SELECT * FROM ');
      const position = new vscode.Position(0, 14);

      const items = await provider.provideCompletionItems(
        doc,
        position,
        {} as vscode.CancellationToken,
        {} as vscode.CompletionContext
      );

      const labels = items.map((i) => i.label);
      expect(labels).toContain('test_table');
    });

    it('should clear cache', async () => {
      await manager.execute('CREATE TABLE cached_table (id INTEGER)');
      await provider.refreshCache();

      provider.clearCache();

      // Cache should be empty, but will be refreshed on next completion
      // Since manager is still connected, it should still provide completions
      const doc = createMockDocument('SELECT * FROM ');
      const position = new vscode.Position(0, 14);

      const items = await provider.provideCompletionItems(
        doc,
        position,
        {} as vscode.CancellationToken,
        {} as vscode.CompletionContext
      );

      // Should have refreshed and found the table
      const labels = items.map((i) => i.label);
      expect(labels).toContain('cached_table');
    });
  });
});

/**
 * Create a mock TextDocument for testing.
 */
function createMockDocument(text: string): vscode.TextDocument {
  const lines = text.split('\n');
  return {
    getText: (range?: vscode.Range) => {
      if (!range) return text;
      // Simplified: assume single line
      return text.substring(range.start.character, range.end.character);
    },
    lineAt: (line: number | vscode.Position) => {
      const lineNum = typeof line === 'number' ? line : line.line;
      const lineText = lines[lineNum] ?? '';
      return {
        text: lineText,
        range: new vscode.Range(lineNum, 0, lineNum, lineText.length),
        rangeIncludingLineBreak: new vscode.Range(lineNum, 0, lineNum, lineText.length + 1),
        firstNonWhitespaceCharacterIndex: lineText.search(/\S/),
        isEmptyOrWhitespace: lineText.trim().length === 0,
      };
    },
    offsetAt: (position: vscode.Position) => {
      let offset = 0;
      for (let i = 0; i < position.line; i++) {
        offset += (lines[i]?.length ?? 0) + 1; // +1 for newline
      }
      return offset + position.character;
    },
    positionAt: (offset: number) => {
      let remaining = offset;
      for (let i = 0; i < lines.length; i++) {
        const lineLength = (lines[i]?.length ?? 0) + 1;
        if (remaining < lineLength) {
          return new vscode.Position(i, remaining);
        }
        remaining -= lineLength;
      }
      return new vscode.Position(lines.length - 1, lines[lines.length - 1]?.length ?? 0);
    },
    getWordRangeAtPosition: (position: vscode.Position, regex?: RegExp) => {
      const line = lines[position.line] ?? '';
      const pattern = regex ?? /\w+/g;
      const re = new RegExp(pattern.source, 'g');
      let match: RegExpExecArray | null;
      while ((match = re.exec(line)) !== null) {
        if (match.index <= position.character && position.character <= match.index + match[0].length) {
          return new vscode.Range(
            position.line,
            match.index,
            position.line,
            match.index + match[0].length
          );
        }
      }
      return undefined;
    },
    uri: { fsPath: '/test/query.sql' } as vscode.Uri,
    fileName: '/test/query.sql',
    isUntitled: false,
    languageId: 'sql',
    version: 1,
    isDirty: false,
    isClosed: false,
    save: () => Promise.resolve(true),
    eol: 1,
    lineCount: lines.length,
    validateRange: (range: vscode.Range) => range,
    validatePosition: (position: vscode.Position) => position,
  } as unknown as vscode.TextDocument;
}
