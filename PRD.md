# Product Requirements Document (PRD): DuckDB Powerhouse Extension for VS Code

## 1. Product Overview
The DuckDB Powerhouse is a VS Code extension that transforms VS Code into a lightweight, local analytics studio powered by DuckDB, an in-memory OLAP database. It enables users to perform fast in-memory analytics on large datasets (e.g., Parquet, CSV, JSON) directly within their coding environment, without needing external servers or tools. The extension emphasizes ease of use for ad-hoc querying, data exploration, and prototyping, with AI enhancements for productivity.

Positioning: "DuckDB Powerhouse for In-Memory Analytics in VS Code" – A specialized tool for local-first analytics, differentiating through in-memory optimizations, AI-assisted workflows, and seamless integrations.

Freemium Model: Core features free to attract users; premium subscription ($4-8/month) unlocks advanced capabilities. Monetization handled via in-extension prompts linking to an external payment system (e.g., Stripe or Gumroad), with feature gating.

Version: MVP (v1.0)

## 2. Target Audience
- Primary: Data scientists and engineers prototyping ETL pipelines, ML datasets, or ad-hoc analyses in VS Code.
- Secondary: Indie developers building AI/ML/edge apps; backend devs testing lakehouse workflows locally.
- User Pain Points Addressed: Slow Pandas/Polars for large data; fragmented tools requiring context switches; lack of visual/AI aids in existing DuckDB extensions.

## 3. Key Objectives
- Provide intuitive access to DuckDB's in-memory strengths for querying large files without imports.
- Enhance productivity with AI and visualizations to reduce manual SQL tweaking.
- Ensure seamless VS Code integration (e.g., Command Palette, sidebar) for a native feel.
- Drive user adoption via free tier; convert 20% to premium through value-add features.
- Support cross-platform (Windows, macOS, Linux) with minimal setup.

## 4. Features
Features are categorized by tier. All features prioritize performance (e.g., handle 100GB+ datasets with low latency) and usability (e.g., error handling with helpful messages).

### 4.1 Free Tier Features (Core Functionality)
- **Connection Management**:
  - Quick setup: Auto-detect DuckDB installation or use bundled fallback.
  - Create/open in-memory or file-based DBs.
  - Connect to MotherDuck (cloud hybrid) via simple token input.
- **Data Exploration Sidebar**:
  - Tree view: Schemas, tables, columns, indexes, functions, and extensions.
  - Quick actions: Preview table data (top 100 rows), describe schema.
- **Query Editor and Execution**:
  - Dedicated SQL editor with syntax highlighting and basic autocomplete (keywords, tables, columns).
  - Run queries via Command Palette or toolbar button; display results in a tabular grid with sorting/filtering.
  - Support direct file queries (e.g., SELECT * FROM 'data.parquet').
- **Basic Exports**:
  - Export query results to CSV or JSON.
- **In-Memory Optimizations**:
  - Auto-enable features like vectorized execution; simple status indicators for memory usage.

### 4.2 Premium Tier Features (Gated Behind Subscription)
- **AI-Assisted Analytics**:
  - Natural language to SQL: Convert "Show average sales by region" to optimized SQL.
  - Query optimization suggestions: Auto-recommend indexes or rewrites for faster execution.
  - Anomaly detection: Highlight outliers in result sets.
- **Advanced Visualization**:
  - Interactive charts: Generate line/bar/pie/scatter plots from query results (e.g., via embedded viewer).
  - ER diagrams: Visualize table relationships.
  - Graph views: For extensions like Onager (e.g., node-link diagrams for PageRank results).
- **Performance and Scale Enhancers**:
  - Streaming support: Handle incremental data refreshes for near-real-time analysis.
  - Large-dataset tools: Data slicing, parallel UDF execution.
- **Collaboration and Integrations**:
  - Real-time shared queries: Invite collaborators via link for live editing/viewing.
  - Git integration: Version DB schemas and data snapshots.
  - External sync: Preview in Jupyter/Marimo; export to Airflow-compatible scripts.
- **Security and Compliance**:
  - Query auditing: Log history with timestamps and users.
  - Encrypted DB handling: Support for password-protected files.
  - Compliance checks: Basic scans for PII in schemas.

### 4.3 General Features (Available in Both Tiers)
- **Extension Management**: Browse/install DuckDB extensions (e.g., httpfs, spatial) via UI panel.
- **Settings Customization**: Configure paths, themes, result limits, and default optimizations.
- **Help and Onboarding**: Welcome tour on first install; contextual tooltips; link to docs.

## 5. User Flows
Flows are designed for minimal friction, leveraging VS Code conventions (e.g., sidebar, panels).

### 5.1 Onboarding Flow
1. Install extension from VS Code Marketplace.
2. On activation: Prompt to set up DuckDB (auto-install if possible) or use fallback.
3. Welcome webview: Quick tour with buttons to "Create New DB" or "Connect to MotherDuck."
4. If premium: Login prompt for subscription check; fallback to free tier.

### 5.2 Core Analysis Flow
1. Open sidebar: Click "DuckDB Powerhouse" icon to expand explorer.
2. Connect/Add Data: Button to create in-memory DB or query file (drag-drop support for files).
3. Explore: Click table to preview data; right-click for actions like "Generate SQL."
4. Query: Open editor (via Command Palette: "DuckDB: New Query"); type SQL with autocomplete.
5. Execute: Run button; results in adjacent panel (grid view with scroll/pagination).
6. Export/Visualize: Free: Export dropdown; Premium: "Visualize" button for charts.
7. Optimize (Premium): AI sidebar suggests improvements; apply with one click.

### 5.3 Premium Upgrade Flow
1. Attempt premium feature (e.g., NL-to-SQL): Show locked modal with benefits and "Upgrade Now" button.
2. Redirect to external subscription page; on return, verify and unlock.
3. In-settings: Subscription status view with manage/cancel options.

### 5.4 Collaboration Flow (Premium)
1. From query panel: "Share Session" button generates link.
2. Collaborator opens link in VS Code: Joins live view; edits sync in real-time.
3. End session: Auto-save changes; audit log available.

### 5.5 Error Handling Flow
- Common errors (e.g., memory overflow): Friendly toast notification with tips (e.g., "Try slicing data").
- Query failures: Highlight line in editor; suggest fixes.

## 6. UI/UX Guidelines
- **Overall Design**: Clean, modern; follow VS Code theme (light/dark/adaptive). Use sans-serif fonts for readability.
- **Sidebar**: Compact tree with icons (e.g., database for schemas, table for data). Expandable sections; search bar for quick filtering.
- **Panels/Views**: Webview-based for flexibility; tabular results with responsive grids (e.g., resizable columns). Charts interactive (zoom, hover tooltips).
- **Interactivity**: Hover tooltips everywhere (e.g., column types). Keyboard shortcuts (e.g., Ctrl+Enter to run query).
- **Accessibility**: High contrast modes; screen-reader friendly (ARIA labels); keyboard navigation.
- **Performance UX**: Progress bars for long queries; memory usage indicator in status bar.
- **Branding**: Subtle logo in sidebar; premium features badged with "Pro" icons.
- **Mobile/Responsive**: Optimize for VS Code remote (e.g., smaller screens); no assumptions on large displays.
- **Feedback Loops**: Rate prompts after key actions; in-extension changelog.

## 7. Out of Scope for MVP
- Full OLTP support (focus on OLAP).
- Custom UDF authoring (use existing extensions).
- Mobile VS Code support.
- Advanced admin tools (e.g., user roles).

## 8. Success Metrics
- Adoption: 50K installs in first 3 months; 10% premium conversion.
- Engagement: Average session time >5 min; query executions per user >10/week.
- Feedback: NPS >8; <5% uninstall rate due to bugs.

This PRD provides a blueprint for building the extension. Prioritize free tier for quick MVP release, then iterate on premium based on user feedback.
