/**
 * Mock implementation of VS Code API for testing.
 * Only includes the parts we actually use.
 */

export enum QuickPickItemKind {
  Separator = -1,
  Default = 0,
}

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

export class ThemeColor {
  constructor(public readonly id: string) {}
}

export class ThemeIcon {
  static readonly File = new ThemeIcon('file');
  static readonly Folder = new ThemeIcon('folder');
  constructor(public readonly id: string, public readonly color?: ThemeColor) {}
}

export class MarkdownString {
  constructor(public readonly value: string = '') {}
  appendMarkdown(_value: string): MarkdownString {
    return this;
  }
}

// Mock EventEmitter
export class EventEmitter<T> {
  private listeners: Set<(e: T) => void> = new Set();

  event = (listener: (e: T) => void) => {
    this.listeners.add(listener);
    return { dispose: () => this.listeners.delete(listener) };
  };

  fire(data: T) {
    this.listeners.forEach((listener) => listener(data));
  }

  dispose() {
    this.listeners.clear();
  }
}

// Mock Uri
export const Uri = {
  file: (path: string) => ({ fsPath: path, scheme: 'file', path }),
  joinPath: (base: { fsPath: string }, ...segments: string[]) => ({
    fsPath: [base.fsPath, ...segments].join('/'),
  }),
};

// Mock window
export const window = {
  createStatusBarItem: (_alignment?: StatusBarAlignment, _priority?: number) => ({
    text: '',
    tooltip: '',
    command: '',
    name: '',
    backgroundColor: undefined as ThemeColor | undefined,
    show: () => {},
    hide: () => {},
    dispose: () => {},
  }),

  createOutputChannel: (name: string) => ({
    name,
    append: () => {},
    appendLine: () => {},
    clear: () => {},
    show: () => {},
    hide: () => {},
    dispose: () => {},
  }),

  showInformationMessage: async <T extends string>(_message: string, ..._items: T[]) => {
    return undefined as T | undefined;
  },

  showWarningMessage: async <T extends string>(_message: string, ..._items: T[]) => {
    return undefined as T | undefined;
  },

  showErrorMessage: async <T extends string>(_message: string, ..._items: T[]) => {
    return undefined as T | undefined;
  },

  showQuickPick: async <T extends { label: string }>(_items: T[], _options?: object) => {
    return undefined as T | undefined;
  },

  showInputBox: async (_options?: object) => {
    return undefined as string | undefined;
  },

  showOpenDialog: async (_options?: object) => {
    return undefined as { fsPath: string }[] | undefined;
  },

  createWebviewPanel: (
    _viewType: string,
    _title: string,
    _showOptions: number,
    _options?: object
  ) => ({
    webview: {
      html: '',
      onDidReceiveMessage: () => ({ dispose: () => {} }),
      postMessage: async () => true,
      asWebviewUri: (uri: { fsPath: string }) => uri,
    },
    onDidDispose: () => ({ dispose: () => {} }),
    reveal: () => {},
    dispose: () => {},
  }),

  registerTreeDataProvider: (_viewId: string, _provider: unknown) => ({
    dispose: () => {},
  }),
};

// Mock workspace
export const workspace = {
  getConfiguration: (_section?: string) => ({
    get: <T>(_key: string, defaultValue: T) => defaultValue,
    update: async () => {},
    has: () => false,
    inspect: () => undefined,
  }),

  workspaceFolders: undefined as { uri: { fsPath: string } }[] | undefined,

  onDidChangeConfiguration: () => ({ dispose: () => {} }),
};

// Mock commands
export const commands = {
  registerCommand: (_command: string, _callback: (...args: unknown[]) => unknown) => ({
    dispose: () => {},
  }),

  executeCommand: async <T>(_command: string, ..._args: unknown[]) => {
    return undefined as T | undefined;
  },
};

// Mock TreeItem
export class TreeItem {
  label?: string;
  description?: string;
  tooltip?: string;
  iconPath?: unknown;
  collapsibleState?: TreeItemCollapsibleState;
  contextValue?: string;
  command?: unknown;

  constructor(label: string, collapsibleState?: TreeItemCollapsibleState) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

// Mock ViewColumn
export enum ViewColumn {
  One = 1,
  Two = 2,
  Three = 3,
}

// Mock Disposable
export class Disposable {
  constructor(private callOnDispose: () => void) {}
  dispose() {
    this.callOnDispose();
  }
  static from(...disposables: { dispose: () => void }[]) {
    return new Disposable(() => disposables.forEach((d) => d.dispose()));
  }
}

// Mock Position
export class Position {
  constructor(
    public readonly line: number,
    public readonly character: number
  ) {}

  isEqual(other: Position): boolean {
    return this.line === other.line && this.character === other.character;
  }

  isBefore(other: Position): boolean {
    return this.line < other.line || (this.line === other.line && this.character < other.character);
  }

  isAfter(other: Position): boolean {
    return this.line > other.line || (this.line === other.line && this.character > other.character);
  }

  translate(lineDelta?: number, characterDelta?: number): Position {
    return new Position(
      this.line + (lineDelta ?? 0),
      this.character + (characterDelta ?? 0)
    );
  }

  with(line?: number, character?: number): Position {
    return new Position(line ?? this.line, character ?? this.character);
  }
}

// Mock Range
export class Range {
  readonly start: Position;
  readonly end: Position;

  constructor(start: Position, end: Position);
  constructor(startLine: number, startCharacter: number, endLine: number, endCharacter: number);
  constructor(
    startOrStartLine: Position | number,
    endOrStartCharacter: Position | number,
    endLine?: number,
    endCharacter?: number
  ) {
    if (typeof startOrStartLine === 'number') {
      this.start = new Position(startOrStartLine, endOrStartCharacter as number);
      this.end = new Position(endLine as number, endCharacter as number);
    } else {
      this.start = startOrStartLine;
      this.end = endOrStartCharacter as Position;
    }
  }

  get isEmpty(): boolean {
    return this.start.isEqual(this.end);
  }

  get isSingleLine(): boolean {
    return this.start.line === this.end.line;
  }

  contains(positionOrRange: Position | Range): boolean {
    if (positionOrRange instanceof Position) {
      return !positionOrRange.isBefore(this.start) && !positionOrRange.isAfter(this.end);
    }
    return this.contains(positionOrRange.start) && this.contains(positionOrRange.end);
  }
}

// Mock SnippetString
export class SnippetString {
  constructor(public value: string = '') {}

  appendText(text: string): SnippetString {
    this.value += text;
    return this;
  }

  appendPlaceholder(value: string | ((snippet: SnippetString) => void), number?: number): SnippetString {
    if (typeof value === 'function') {
      const nested = new SnippetString();
      value(nested);
      this.value += `\${${number ?? 1}:${nested.value}}`;
    } else {
      this.value += `\${${number ?? 1}:${value}}`;
    }
    return this;
  }
}

// Mock CompletionItem
export class CompletionItem {
  label: string;
  kind?: CompletionItemKind;
  detail?: string;
  documentation?: string | MarkdownString;
  sortText?: string;
  filterText?: string;
  insertText?: string | SnippetString;
  range?: Range;
  command?: unknown;

  constructor(label: string, kind?: CompletionItemKind) {
    this.label = label;
    this.kind = kind;
  }
}

// Mock CompletionItemKind
export enum CompletionItemKind {
  Text = 0,
  Method = 1,
  Function = 2,
  Constructor = 3,
  Field = 4,
  Variable = 5,
  Class = 6,
  Interface = 7,
  Module = 8,
  Property = 9,
  Unit = 10,
  Value = 11,
  Enum = 12,
  Keyword = 13,
  Snippet = 14,
  Color = 15,
  File = 16,
  Reference = 17,
  Folder = 18,
  EnumMember = 19,
  Constant = 20,
  Struct = 21,
  Event = 22,
  Operator = 23,
  TypeParameter = 24,
}

// Mock languages
export const languages = {
  registerCompletionItemProvider: (
    _selector: unknown,
    _provider: unknown,
    ..._triggerCharacters: string[]
  ) => ({
    dispose: () => {},
  }),
};
