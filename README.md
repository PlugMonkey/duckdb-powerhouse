# DuckDB Powerhouse by PlugMonkey

Fast in-memory analytics with DuckDB inside VS Code.

[Product Page](https://plugmonkey.xyz/product/duckdb-powerhouse/) | [PlugMonkey](https://plugmonkey.xyz/)

## Features

### Connection Management
- **In-Memory Databases**: Create fast, temporary databases for quick analysis
- **File-Based Databases**: Open existing or create new `.duckdb` files
- **Connection History**: Quick access to recent connections
- **Reconnect**: Easily reconnect to the last used database

### Data Explorer
- Sidebar tree view of database structure
- Browse schemas, tables, and columns
- Table row count display
- Context menus for quick actions

### Query Execution
- Run queries with keyboard shortcuts
- Run selected text as a query
- Explain query execution plans
- Cancel running queries
- Configurable timeout protection
- Auto-apply LIMIT to prevent memory issues

### Results Panel
- Sortable data grid with pagination
- Column type indicators
- Query history with quick switching
- Export to CSV, JSON, or TSV
- Copy cells, rows, or entire results
- Keyboard navigation support

### File Querying
- Query Parquet, CSV, JSON files directly without importing
- Custom delimiter and encoding options for CSV
- Import files to database tables
- File size warnings for large files (>100MB)
- Drag & drop files into SQL editor

### Table Operations
- Preview table data
- Copy SELECT/CREATE TABLE statements
- Drop and truncate tables (with confirmation)
- Refresh individual tables

## Getting Started

1. Open the DuckDB Powerhouse sidebar (database icon in activity bar)
2. Click the **+** button to create a connection:
   - **Create In-Memory Database** - Fast, temporary (data lost on close)
   - **Open Existing Database** - Open an existing `.duckdb` file
   - **Create New Database** - Create a new `.duckdb` file
3. Write SQL in any `.sql` file
4. Press `Ctrl+Enter` (or `Cmd+Enter` on Mac) to run queries
5. View results in the Results Panel

## Supported File Types

| Format | Extensions |
|--------|------------|
| Parquet | `.parquet` |
| CSV | `.csv`, `.tsv` |
| JSON | `.json`, `.jsonl`, `.ndjson` |

Right-click any supported file in the Explorer to preview, describe schema, or import to a table.

## Keyboard Shortcuts

| Command | Windows/Linux | Mac | Description |
|---------|---------------|-----|-------------|
| Run Query | `Ctrl+Enter` | `Cmd+Enter` | Execute query at cursor |
| Run Selected | `Ctrl+Shift+Enter` | `Cmd+Shift+Enter` | Execute selected text |
| Explain Query | `Ctrl+Shift+E` | `Cmd+Shift+E` | Show execution plan |

## Commands

All commands are available via the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command | Description |
|---------|-------------|
| DuckDB: Create Connection | Open connection menu |
| DuckDB: Disconnect | Close current connection |
| DuckDB: Reconnect | Reconnect to last database |
| DuckDB: Run Query | Execute current query |
| DuckDB: Run Selected Query | Execute selected text |
| DuckDB: Explain Query | Show query plan |
| DuckDB: Cancel Running Query | Cancel active query |
| DuckDB: Clear Results | Clear the results panel |

## Settings

Configure via VS Code Settings (`Ctrl+,` / `Cmd+,`):

| Setting | Default | Description |
|---------|---------|-------------|
| `duckdb-powerhouse.maxResultRows` | 10000 | Maximum rows to fetch per query |
| `duckdb-powerhouse.defaultResultLimit` | 100 | Default LIMIT for table previews |
| `duckdb-powerhouse.autoConnect` | false | Auto-create in-memory connection on startup |
| `duckdb-powerhouse.showRowNumbers` | true | Show row numbers in results panel |
| `duckdb-powerhouse.confirmLargeResults` | true | Confirm before fetching large result sets |
| `duckdb-powerhouse.queryTimeout` | 0 | Query timeout in seconds (0 = no timeout) |

## Context Menus

### Table Context Menu
- Preview Data
- New Query
- Copy SELECT Statement
- Copy Table Name
- Copy CREATE TABLE Statement
- Refresh Table
- Truncate Table
- Drop Table

### Schema Context Menu
- Refresh Schema
- Copy Schema Name

### Database Context Menu
- Show Database Properties
- Disconnect

### File Context Menu (for supported file types)
- Preview Data
- Preview with Options (CSV only)
- Describe Schema
- Import to Table
- New Query
- Copy SELECT Query

## Requirements

- VS Code 1.85.0 or higher

## About PlugMonkey

[PlugMonkey](https://plugmonkey.xyz/) builds developer tools and VS Code extensions to supercharge your workflow.

## License

MIT - Built with ❤️ by [PlugMonkey](https://plugmonkey.xyz/)
