# DuckDB Powerhouse - Development Guidelines

## Project Overview

A VS Code extension for in-memory analytics with DuckDB. See `MVP.md` for current scope and `PRD.md` for full vision.

---

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests – then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

---

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js (VS Code extension host) |
| Language | TypeScript (strict mode) |
| DuckDB Binding | `duckdb-async` npm package |
| UI Framework | VS Code API + Webview (vanilla JS for MVP) |
| Build | esbuild (fast bundling) |
| Package Manager | Bun |
| Testing | Vitest + @vscode/test-electron |
| Linting | ESLint + Prettier |

---

## Code Conventions

### TypeScript

```typescript
// Use explicit types for public APIs
export function executeQuery(sql: string, connection: DuckDBConnection): Promise<QueryResult>

// Use inference for local variables
const results = await executeQuery(sql, conn); // Type inferred

// Prefer interfaces over types for objects
interface QueryResult {
  columns: ColumnInfo[];
  rows: unknown[][];
  rowCount: number;
  executionTimeMs: number;
}

// Use enums sparingly; prefer union types
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// Async/await over raw promises
// ✓ Good
const data = await fetchData();
// ✗ Avoid
fetchData().then(data => { ... });
```

### Naming

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `connection-manager.ts` |
| Classes | PascalCase | `ConnectionManager` |
| Functions | camelCase | `executeQuery` |
| Constants | SCREAMING_SNAKE | `MAX_RESULT_ROWS` |
| Interfaces | PascalCase, no "I" prefix | `QueryResult` (not `IQueryResult`) |
| Types | PascalCase | `ConnectionState` |
| VS Code commands | dot.notation | `duckdb-powerhouse.runQuery` |

### File Organization

```
src/
├── extension.ts           # Entry point only - minimal code
├── constants.ts           # Shared constants
├── types.ts               # Shared type definitions
├── connection/
│   ├── index.ts           # Public exports
│   ├── manager.ts         # ConnectionManager class
│   └── status-bar.ts      # Status bar integration
├── explorer/
│   ├── index.ts
│   ├── provider.ts        # TreeDataProvider implementation
│   ├── nodes/             # TreeItem subclasses
│   │   ├── database.ts
│   │   ├── schema.ts
│   │   ├── table.ts
│   │   └── column.ts
│   └── actions.ts         # Context menu handlers
├── editor/
│   ├── index.ts
│   ├── completion.ts      # CompletionItemProvider
│   ├── commands.ts        # Command handlers
│   └── diagnostics.ts     # Error highlighting (future)
├── results/
│   ├── index.ts
│   ├── panel.ts           # WebviewPanel management
│   ├── serializer.ts      # Data formatting for webview
│   └── webview/           # Webview assets (not bundled with extension)
│       ├── index.html
│       ├── main.js
│       └── styles.css
├── export/
│   ├── index.ts
│   ├── csv.ts
│   ├── json.ts
│   └── clipboard.ts
└── utils/
    ├── config.ts          # VS Code configuration wrapper
    ├── logger.ts          # OutputChannel logging
    └── disposable.ts      # Disposable helpers
```

### Imports

```typescript
// Order: Node builtins → VS Code → external packages → internal modules
import * as path from 'path';

import * as vscode from 'vscode';

import { Database } from 'duckdb-async';

import { ConnectionManager } from './connection';
import { Logger } from './utils/logger';

// Use index.ts for clean public APIs
// ✓ Good
import { ConnectionManager } from './connection';
// ✗ Avoid (unless necessary)
import { ConnectionManager } from './connection/manager';
```

---

## VS Code Extension Patterns

### Disposables

Always track disposables to prevent memory leaks:

```typescript
export function activate(context: vscode.ExtensionContext) {
  // Add to subscriptions for automatic cleanup
  context.subscriptions.push(
    vscode.commands.registerCommand('duckdb-powerhouse.runQuery', runQuery),
    vscode.window.registerTreeDataProvider('duckdbExplorer', explorerProvider),
    connectionManager // If it implements Disposable
  );
}
```

### Commands

Register in `package.json` and implement in code:

```json
// package.json
{
  "contributes": {
    "commands": [
      {
        "command": "duckdb-powerhouse.runQuery",
        "title": "Run Query",
        "category": "DuckDB"
      }
    ]
  }
}
```

### Configuration

Use typed wrappers:

```typescript
// utils/config.ts
export function getConfig<T>(key: string, defaultValue: T): T {
  return vscode.workspace.getConfiguration('duckdb-powerhouse').get(key, defaultValue);
}

export const config = {
  get maxResultRows(): number {
    return getConfig('maxResultRows', 10000);
  },
  get duckdbPath(): string | undefined {
    return getConfig('duckdbPath', undefined);
  }
};
```

### Webviews

Secure webview setup:

```typescript
const panel = vscode.window.createWebviewPanel(
  'duckdbResults',
  'Query Results',
  vscode.ViewColumn.Two,
  {
    enableScripts: true,
    retainContextWhenHidden: true,
    localResourceRoots: [
      vscode.Uri.joinPath(context.extensionUri, 'out', 'webview')
    ]
  }
);

// Use nonce for scripts
const nonce = getNonce();
panel.webview.html = `
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}';">
  <script nonce="${nonce}" src="${scriptUri}"></script>
`;
```

---

## Development Workflow

### Setup

```bash
# Clone and install
bun install

# Open in VS Code
code .

# Start watch mode
bun run watch
```

### Running & Debugging

1. Press `F5` to launch Extension Development Host
2. Or use Command Palette → "Debug: Start Debugging"
3. Set breakpoints in TypeScript source files

### Testing

```bash
# Run unit tests
bun test

# Run with coverage
bun test:coverage

# Run integration tests (requires VS Code)
bun test:e2e
```

### Before Committing

```bash
# Run all checks
bun run lint && bun run typecheck && bun test

# Or use pre-commit hook (set up via husky)
```

---

## Error Handling

### User-Facing Errors

```typescript
// Show informative messages
try {
  await executeQuery(sql);
} catch (error) {
  if (error instanceof DuckDBError) {
    vscode.window.showErrorMessage(`Query failed: ${error.message}`);
    Logger.error('Query execution failed', { sql, error });
  } else {
    vscode.window.showErrorMessage('An unexpected error occurred. Check Output panel for details.');
    Logger.error('Unexpected error', error);
  }
}
```

### Logging

```typescript
// Use structured logging
Logger.info('Query executed', { rowCount: results.length, timeMs: elapsed });
Logger.error('Connection failed', { path: dbPath, error });

// Logs go to Output channel: "DuckDB Powerhouse"
```

---

## Performance Guidelines

1. **Lazy loading**: Don't load DuckDB until first use
2. **Pagination**: Never load >10,000 rows into webview at once
3. **Streaming**: For large results, consider streaming to webview
4. **Caching**: Cache schema metadata; invalidate on DDL operations
5. **Debouncing**: Debounce autocomplete requests (150ms)

---

## Security Guidelines

1. **No dynamic code execution**: Never execute arbitrary code from user input or query results
2. **Sanitize HTML**: All data displayed in webview must be escaped
3. **CSP**: Webviews must have strict Content-Security-Policy
4. **No secrets in code**: Use VS Code SecretStorage for sensitive data
5. **Path validation**: Validate file paths before operations

---

## Git Workflow

### Branch Naming

```
feature/sidebar-tree-view
fix/query-execution-timeout
refactor/connection-manager
docs/update-readme
```

### Commit Messages

```
feat(explorer): add table preview on right-click
fix(results): handle null values in grid display
refactor(connection): extract status bar to separate module
test(export): add CSV export tests
docs: update development setup instructions
```

Follow [Conventional Commits](https://www.conventionalcommits.org/).

### PR Process

1. Create feature branch from `main`
2. Make changes with atomic commits
3. Ensure all checks pass
4. Open PR with description of changes
5. Squash merge to `main`

---

## Documentation

- **Code comments**: Explain "why", not "what"
- **JSDoc**: Required for all public APIs
- **README.md**: User-facing documentation
- **CHANGELOG.md**: Track releases (use Keep a Changelog format)

```typescript
/**
 * Executes a SQL query against the active connection.
 *
 * @param sql - The SQL query to execute
 * @returns Query results including columns, rows, and execution metadata
 * @throws {NoConnectionError} If no database connection is active
 * @throws {QueryExecutionError} If the query fails to execute
 */
export async function executeQuery(sql: string): Promise<QueryResult> {
```

---

## Common Tasks

### Add a new command

1. Add to `package.json` under `contributes.commands`
2. Add keybinding if needed under `contributes.keybindings`
3. Implement handler in appropriate module
4. Register in `extension.ts` activate function

### Add a new setting

1. Add to `package.json` under `contributes.configuration`
2. Add typed accessor in `utils/config.ts`
3. Use via `config.settingName`

### Add a new tree node type

1. Create class extending `vscode.TreeItem` in `explorer/nodes/`
2. Add to provider's `getChildren()` logic
3. Add icon in `resources/icons/` if needed

---

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [DuckDB Documentation](https://duckdb.org/docs/)
- [duckdb-async npm](https://www.npmjs.com/package/duckdb-async)
