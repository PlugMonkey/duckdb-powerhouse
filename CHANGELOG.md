# Changelog

All notable changes to [DuckDB Powerhouse](https://plugmonkey.xyz/product/duckdb-powerhouse/) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-03

### Added

#### Connection Management
- Create in-memory DuckDB databases
- Open existing file-based DuckDB databases (.duckdb)
- Create new file-based DuckDB databases
- Disconnect and reconnect commands
- Connection history with recent connections
- Status bar showing connection state

#### Data Explorer
- Sidebar tree view of database structure
- Browse schemas, tables, and columns
- Table row count display
- Context menus for tables, schemas, columns, and databases
- Copy table/column/schema names to clipboard
- Database properties view

#### Query Execution
- Run queries with Ctrl+Enter (Cmd+Enter on Mac)
- Run selected text as query with Ctrl+Shift+Enter
- Explain query execution plans
- Query cancellation support
- Configurable query timeout
- Auto-apply LIMIT to prevent large result sets

#### Results Panel
- Sortable data grid with type-aware sorting
- Pagination for large results (100 rows per page)
- Column type indicators
- Row numbers (configurable)
- Query history dropdown with multiple results
- Export to CSV, JSON, TSV files
- Copy cells and rows to clipboard
- Keyboard navigation (arrow keys)
- Empty state and error state handling
- BigInt support for large numbers

#### File Querying
- Query Parquet files directly without import
- Query CSV/TSV files with auto-detection
- Query JSON/JSONL/NDJSON files
- Custom delimiter and encoding options for CSV
- Import files to database tables
- File size warnings for large files (>100MB)
- Drag & drop files into SQL editor

#### SQL Editing
- Autocomplete for SQL keywords and functions
- Autocomplete for table and column names
- Syntax-aware query detection
- New SQL File command (Cmd+Alt+N)
- 20+ SQL snippets for common DuckDB patterns

#### Table Operations
- Preview table data in Results Panel
- Show table info (row count, columns, size)
- Copy SELECT statements
- Copy CREATE TABLE statements
- Copy table as CSV or JSON
- Export table to file
- Rename table
- Drop table (with confirmation)
- Truncate table (with confirmation)
- Refresh individual tables

#### Column Operations
- Filter by column (generates WHERE clause)
- Sort by column (generates ORDER BY)
- Insert column name at cursor
- Copy column name

#### Data Import/Export
- Import Data wizard (file picker)
- Import from URL (supports HTTP/HTTPS)
- Create Table wizard with multiple paths
- Export table to CSV, Parquet, or JSON
- Export query results to file

#### User Experience
- Welcome view when disconnected
- Empty database guidance with quick actions
- Getting Started guide
- SQL snippets for DuckDB-specific features

### Configuration Options
- `maxResultRows` - Maximum rows to fetch (default: 10,000)
- `defaultResultLimit` - Default LIMIT for previews (default: 100)
- `autoConnect` - Auto-connect to in-memory on startup (default: false)
- `showRowNumbers` - Show row numbers in results (default: true)
- `confirmLargeResults` - Confirm before large fetches (default: true)
- `queryTimeout` - Query timeout in seconds (default: 0 = no timeout)
