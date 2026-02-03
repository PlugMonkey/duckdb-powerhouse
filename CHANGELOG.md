# Changelog

All notable changes to [DuckDB Powerhouse by PlugMonkey](https://plugmonkey.xyz/product/duckdb-powerhouse/) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-02-01

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
- Context menus for tables, schemas, and databases
- Copy table/column names to clipboard

#### Query Execution
- Run queries with Ctrl+Enter (Cmd+Enter on Mac)
- Run selected text as query
- Explain query execution plans
- Query cancellation support
- Configurable query timeout
- Auto-apply LIMIT to prevent large result sets

#### Results Panel
- Sortable data grid
- Pagination for large results (100 rows per page)
- Column type indicators
- Row numbers
- Query history dropdown
- Export to CSV, JSON, TSV
- Copy cells and rows to clipboard
- Keyboard navigation

#### File Querying
- Query Parquet files directly
- Query CSV/TSV files with auto-detection
- Query JSON/JSONL files
- Custom delimiter and encoding options for CSV
- Import files to database tables
- File size warnings for large files
- Drag & drop files into SQL editor

#### SQL Editing
- Autocomplete for SQL keywords
- Autocomplete for table and column names
- Syntax-aware query detection

#### Table Operations
- Preview table data
- Copy SELECT statements
- Copy CREATE TABLE statements
- Drop table (with confirmation)
- Truncate table (with confirmation)
- Refresh individual tables

### Configuration Options
- `maxResultRows` - Maximum rows to fetch (default: 10000)
- `defaultResultLimit` - Default LIMIT for previews (default: 100)
- `autoConnect` - Auto-connect on startup (default: false)
- `showRowNumbers` - Show row numbers in results (default: true)
- `confirmLargeResults` - Confirm before large fetches (default: true)
- `queryTimeout` - Query timeout in seconds (default: 0 = no timeout)
