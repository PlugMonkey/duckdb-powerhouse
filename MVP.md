# DuckDB Powerhouse - Lean MVP Scope

## Philosophy
Ship the smallest useful product that validates the core value proposition: **fast, intuitive DuckDB analytics inside VS Code**.

---

## MVP Scope (v0.1)

### Core Features (Must Have)

#### 1. Connection Management
- [ ] Create/open in-memory databases
- [ ] Create/open file-based databases (.duckdb)
- [ ] Auto-detect or bundle DuckDB binary
- [ ] Connection status indicator in status bar

#### 2. Data Explorer Sidebar
- [ ] Tree view showing: databases → schemas → tables → columns
- [ ] Display column names and types
- [ ] Right-click "Preview" action (SELECT * LIMIT 100)
- [ ] Right-click "Copy SELECT statement"
- [ ] Refresh button

#### 3. Query Editor
- [ ] Dedicated `.duckdb-sql` file association
- [ ] Syntax highlighting (leverage existing SQL grammar)
- [ ] Basic autocomplete: keywords, table names, column names
- [ ] Run query command (Ctrl/Cmd+Enter)
- [ ] Run selected text as query

#### 4. Results Panel
- [ ] Webview-based tabular grid
- [ ] Column sorting (client-side)
- [ ] Row count display
- [ ] Execution time display
- [ ] Scrollable with fixed headers
- [ ] Handle up to 10,000 rows in view (paginate beyond)

#### 5. File Querying
- [ ] Direct query support: `SELECT * FROM 'file.parquet'`
- [ ] Support formats: Parquet, CSV, JSON
- [ ] Drag-drop file into editor to generate SELECT statement

#### 6. Basic Export
- [ ] Export results to CSV
- [ ] Export results to JSON
- [ ] Copy results to clipboard (TSV format)

#### 7. Settings
- [ ] Configure DuckDB binary path
- [ ] Set default result row limit
- [ ] Theme follows VS Code (light/dark)

---

## Deferred to v0.2+ (Post-MVP)

### v0.2 - Enhanced Experience
- MotherDuck cloud connection
- Extension management UI (install httpfs, spatial, etc.)
- Query history panel
- Multiple result tabs
- Column filtering in results
- Keyboard shortcuts customization

### v0.3 - Visualization & Polish
- Basic charts (bar, line, pie) from results
- Schema/ER diagram view
- Query formatting/beautify
- Error highlighting in editor
- Memory usage indicator

### v0.4 - AI Features (Premium Foundation)
- Natural language to SQL
- Query optimization suggestions
- Anomaly detection in results

### v0.5 - Collaboration & Advanced (Premium)
- Shared query sessions
- Git integration for schemas
- Query auditing/logging
- Encrypted database support
- Jupyter/Marimo export

### Future Consideration
- Real-time collaboration (complex - evaluate if needed)
- Streaming/incremental refresh
- Compliance/PII scanning
- Graph visualizations (Onager extension)

---

## Technical Architecture (MVP)

```
┌─────────────────────────────────────────────────────────┐
│                    VS Code Extension                     │
├─────────────────┬─────────────────┬─────────────────────┤
│   Sidebar       │   Editor        │   Results Panel     │
│   (TreeView)    │   (TextEditor)  │   (Webview)         │
├─────────────────┴─────────────────┴─────────────────────┤
│                  Extension Host (Node.js)                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ Connection  │  │   Query     │  │   Result        │  │
│  │ Manager     │  │   Executor  │  │   Serializer    │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                    DuckDB Node Bindings                  │
│                    (duckdb-async npm)                    │
└─────────────────────────────────────────────────────────┘
```

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| DuckDB binding | `duckdb-async` npm package | Native bindings, async API, maintained |
| Results grid | Custom Webview + vanilla JS | Avoid heavy frameworks for MVP |
| Autocomplete | VS Code CompletionItemProvider | Native feel, no language server needed |
| State management | VS Code Memento + simple singleton | Keep it simple |
| File formats | Leverage DuckDB's native readers | No custom parsing needed |

### File Structure (Proposed)

```
src/
├── extension.ts           # Entry point, activation
├── connection/
│   ├── manager.ts         # Connection lifecycle
│   └── status.ts          # Status bar item
├── explorer/
│   ├── provider.ts        # TreeDataProvider
│   └── nodes.ts           # TreeItem definitions
├── editor/
│   ├── completion.ts      # Autocomplete provider
│   └── commands.ts        # Run query, etc.
├── results/
│   ├── panel.ts           # Webview panel management
│   └── webview/           # HTML/CSS/JS for grid
│       ├── index.html
│       ├── grid.js
│       └── styles.css
├── export/
│   └── exporter.ts        # CSV, JSON, clipboard
└── utils/
    ├── config.ts          # Settings wrapper
    └── logger.ts          # Output channel logging
```

---

## Success Criteria for MVP

1. **Functional**: User can connect, explore, query, and export without errors
2. **Performance**: Query 1GB Parquet file, display results in <3 seconds
3. **Stability**: No crashes during normal usage; graceful error messages
4. **Usability**: New user can run first query within 2 minutes of install

---

## Out of Scope for MVP

- Any premium/paid features
- Any AI/LLM integration
- Any visualization beyond tabular data
- Any collaboration features
- MotherDuck or cloud connections
- Extension marketplace within the extension
- Mobile or remote development optimization

---

## Estimated Effort

| Component | Effort (solo dev) |
|-----------|-------------------|
| Project setup & infrastructure | 2-3 days |
| Connection management | 3-4 days |
| Data explorer sidebar | 4-5 days |
| Query editor integration | 3-4 days |
| Results panel webview | 5-7 days |
| File querying support | 1-2 days |
| Export functionality | 1-2 days |
| Settings & polish | 2-3 days |
| Testing & bug fixes | 3-5 days |
| **Total** | **~4-6 weeks** |

---

## Next Steps

1. Initialize VS Code extension project
2. Set up DuckDB bindings and verify cross-platform
3. Build connection manager (simplest vertical slice)
4. Implement sidebar with hardcoded test data
5. Wire up real data to sidebar
6. Build query execution pipeline
7. Create results webview
8. Add exports
9. Polish and test
