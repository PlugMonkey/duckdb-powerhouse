# DuckDB Powerhouse

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
- Browse schemas, tables, and columns with types
- Table row count display
- Context menus for quick actions on tables, columns, schemas

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

### File Querying (No Import Needed!)
- Query Parquet, CSV, JSON files directly
- Custom delimiter and encoding options for CSV
- Import files to database tables when needed
- File size warnings for large files (>100MB)
- Drag & drop files into SQL editor

### Data Operations
- **Create Table Wizard**: Multiple paths to create tables
  - Import from local file
  - Import from URL
  - Create empty table with column definitions
  - Create from SQL query (CTAS)
- **Import Data**: File picker or URL import
- **Export Data**: Export tables or query results to CSV, Parquet, or JSON

### Table Operations
- View table data in Results Panel
- Show table info (rows, columns, size)
- Copy SELECT/CREATE TABLE statements
- Copy as CSV or JSON
- Export to file
- Rename, truncate, drop tables

### Column Operations
- Filter by column (generates WHERE clause query)
- Sort by column (generates ORDER BY query)
- Insert column name at cursor
- Copy column name

### SQL Snippets
Type these prefixes and press Tab:
- `ct` - CREATE TABLE
- `ctas` - CREATE TABLE AS SELECT
- `csv` - SELECT FROM read_csv()
- `parquet` - SELECT FROM read_parquet()
- `json` - SELECT FROM read_json()
- `pivot` - DuckDB PIVOT syntax
- `summarize` - DuckDB SUMMARIZE
- And 15+ more...

## Getting Started

1. Open the DuckDB Powerhouse sidebar (database icon in activity bar)
2. Click **Create Connection** or the **+** button
3. Choose your connection type:
   - **Create In-Memory Database** - Fast, temporary (data lost on close)
   - **Open Existing Database** - Open an existing `.duckdb` file
   - **Create New Database** - Create a new `.duckdb` file
4. Write SQL in any `.sql` file
5. Press `Cmd+Enter` (Mac) or `Ctrl+Enter` (Windows/Linux) to run
6. View results in the Results Panel

## Supported File Types

| Format | Extensions |
|--------|------------|
| Parquet | `.parquet` |
| CSV | `.csv`, `.tsv` |
| JSON | `.json`, `.jsonl`, `.ndjson` |

Right-click any supported file in the Explorer to preview, describe schema, or import to a table.

## Keyboard Shortcuts

| Command | Windows/Linux | Mac |
|---------|---------------|-----|
| Run Query | `Ctrl+Enter` | `Cmd+Enter` |
| Run Selected | `Ctrl+Shift+Enter` | `Cmd+Shift+Enter` |
| Explain Query | `Ctrl+Shift+E` | `Cmd+Shift+E` |
| New SQL File | `Ctrl+Alt+N` | `Cmd+Alt+N` |

## Settings

Configure via VS Code Settings (`Ctrl+,` / `Cmd+,`):

| Setting | Default | Description |
|---------|---------|-------------|
| `maxResultRows` | 10,000 | Maximum rows to fetch per query |
| `defaultResultLimit` | 100 | Default LIMIT for table previews |
| `autoConnect` | false | Auto-create in-memory connection on startup |
| `showRowNumbers` | true | Show row numbers in results panel |
| `confirmLargeResults` | true | Confirm before fetching large result sets |
| `queryTimeout` | 0 | Query timeout in seconds (0 = no timeout) |

## Context Menus

### Table Context Menu
- View Data
- New Query
- Show Table Info
- Copy SELECT/CREATE TABLE/Table Name
- Copy as CSV/JSON
- Export Table
- Rename/Truncate/Drop Table

### Column Context Menu
- Filter by This Column
- Sort by This Column
- Insert Column Name
- Copy Column Name

### Schema/Database Context Menu
- Create Table
- Import Data
- Show Properties
- Refresh

### File Context Menu
- View Data
- Preview with Options (CSV only)
- Describe Schema
- Import to Table
- New Query
- Copy SELECT Query

## Requirements

- VS Code 1.85.0 or higher

## About

Built with DuckDB - the fast in-process analytical database.

[PlugMonkey](https://plugmonkey.xyz/) builds developer tools and VS Code extensions to supercharge your workflow.

## License

MIT - Built by [PlugMonkey](https://plugmonkey.xyz/)
