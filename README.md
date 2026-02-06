# DuckDB Powerhouse

**Query data where you code.** Fast in-memory analytics with DuckDB inside VS Code.

[![VS Code Marketplace](https://img.shields.io/vscode-marketplace/v/PlugMonkey.duckdb-powerhouse?label=VS%20Code%20Marketplace&color=blue)](https://marketplace.visualstudio.com/items?itemName=PlugMonkey.duckdb-powerhouse)
[![Installs](https://img.shields.io/vscode-marketplace/i/PlugMonkey.duckdb-powerhouse)](https://marketplace.visualstudio.com/items?itemName=PlugMonkey.duckdb-powerhouse)
[![Rating](https://img.shields.io/vscode-marketplace/r/PlugMonkey.duckdb-powerhouse)](https://marketplace.visualstudio.com/items?itemName=PlugMonkey.duckdb-powerhouse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Product Page](https://plugmonkey.xyz/product/duckdb-powerhouse/) | [Roadmap](ROADMAP.md) | [Contributing](CONTRIBUTING.md) | [PlugMonkey](https://plugmonkey.xyz/)

---

## Why DuckDB Powerhouse?

**Stop context-switching.** Query Parquet, CSV, and JSON files directly in VS Code — no imports, no database setup, no leaving your editor.

| Before | After |
|--------|-------|
| Open terminal → Write Python → Read file → Print results | Right-click file → View Data |
| Install database → Configure connection → Switch apps | Install extension → Query |
| 5-10 minutes | 5 seconds |

---

## Quick Start

1. **Install** the extension from VS Code Marketplace
2. **Connect** via the DuckDB sidebar (Cmd+Shift+P → "DuckDB: Create Connection")
3. **Query** any SQL file with Cmd+Enter

Or just **right-click any Parquet/CSV/JSON file** → "View Data" to explore instantly.

---

## Features

### Zero-Config File Querying

Query data files directly without any import step:

```sql
-- Query a Parquet file
SELECT * FROM 'data/sales.parquet' WHERE amount > 1000;

-- Join multiple CSV files
SELECT a.*, b.category FROM 'orders.csv' a JOIN 'products.csv' b ON a.product_id = b.id;

-- Aggregate JSON data
SELECT date, SUM(value) FROM 'events.json' GROUP BY date;
```

**Supported formats:** Parquet, CSV, TSV, JSON, JSONL, NDJSON

### Connect Anywhere

| Source | Description |
|--------|-------------|
| **In-Memory** | Fast, temporary database for scratch work |
| **File (.duckdb)** | Persistent local database |
| **MotherDuck** | Cloud data warehouse |
| **PostgreSQL** | Query external Postgres databases |
| **S3** | Query Parquet/CSV in your data lake |

### Schema Explorer

Browse your data visually:
- Databases → Schemas → Tables → Columns
- See column types at a glance
- Row counts per table
- Right-click context menus for quick actions

### Results Panel

Modern data grid with:
- Sortable columns
- Pagination for large results
- Export to CSV, JSON, TSV
- Query history
- Copy cells/rows to clipboard

### SQL Productivity

- **Autocomplete** for tables, columns, keywords
- **Snippets** — type `csv` + Tab, `parquet` + Tab, `summarize` + Tab
- **Explain query** — see execution plans
- **Cancel queries** — stop long-running operations

---

## Keyboard Shortcuts

| Command | Windows/Linux | Mac |
|---------|---------------|-----|
| Run Query | `Ctrl+Enter` | `Cmd+Enter` |
| Run Selected | `Ctrl+Shift+Enter` | `Cmd+Shift+Enter` |
| Explain Query | `Ctrl+Shift+E` | `Cmd+Shift+E` |
| New SQL File | `Ctrl+Alt+N` | `Cmd+Alt+N` |

---

## Use Cases

### For Data Analysts
- Explore CSV/Parquet files instantly
- Filter and export subsets of data
- Get quick statistics with `SUMMARIZE`

### For Data Engineers
- Test ETL queries locally
- Query S3 data lakes
- Federated queries to PostgreSQL

### For Developers
- Prototype database schemas
- Test SQL before production
- Stay in your IDE

### For Data Scientists
- 10-100x faster than Pandas for large files
- SQL alternative for quick EDA
- Export results for notebooks

---

## SQL Snippets

Type prefix + Tab to expand:

| Prefix | Expands To |
|--------|------------|
| `csv` | `SELECT * FROM read_csv('...')` |
| `parquet` | `SELECT * FROM read_parquet('...')` |
| `json` | `SELECT * FROM read_json('...')` |
| `summarize` | `SUMMARIZE table_name` |
| `pivot` | DuckDB PIVOT syntax |
| `ctas` | CREATE TABLE AS SELECT |

[See all 20 snippets](snippets/sql.json)

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `maxResultRows` | 10,000 | Max rows per query |
| `defaultResultLimit` | 100 | Default LIMIT for previews |
| `queryTimeout` | 0 | Timeout in seconds (0 = none) |
| `autoConnect` | false | Auto-connect on startup |
| `s3.defaultRegion` | us-east-1 | Default AWS region |
| `postgres.defaultPort` | 5432 | Default Postgres port |

---

## Context Menus

### On Tables
- View Data / New Query / Show Info
- Copy SELECT / CREATE TABLE / Table Name
- Copy as CSV / JSON
- Export / Rename / Truncate / Drop

### On Columns
- Filter by Column → generates WHERE query
- Sort by Column → generates ORDER BY query
- Insert / Copy Column Name

### On Data Files
- View Data / Describe Schema
- Import to Table
- New Query / Copy SELECT

---

## Requirements

- VS Code 1.85.0+
- No external dependencies (DuckDB bundled)

---

## Roadmap

- [x] Core query execution
- [x] Schema explorer
- [x] File querying (Parquet, CSV, JSON)
- [x] Remote connections (MotherDuck, PostgreSQL, S3)
- [x] Query history panel
- [ ] Basic visualizations
- [ ] AI-powered SQL (Premium)

See [ROADMAP.md](ROADMAP.md) for the full roadmap.

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## About

Built with [DuckDB](https://duckdb.org/) — the fast in-process analytical database.

**[PlugMonkey](https://plugmonkey.xyz/)** builds developer tools and VS Code extensions to supercharge your workflow.

## License

MIT — Built by [PlugMonkey](https://plugmonkey.xyz/)
