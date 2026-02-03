import * as vscode from 'vscode';

import { COMMANDS, VIEWS } from './constants';
import {
  ConnectionStatusBar,
  getConnectionManager,
  showConnectionMenu,
  disconnect,
  reconnect,
} from './connection';
import {
  ExplorerProvider,
  TableNode,
  ColumnNode,
  SchemaNode,
  DatabaseNode,
  previewTable,
  copyTableName,
  copyColumnName,
  copySelectStatement,
  newQueryForTable,
  copySchemaName,
  showDatabaseProperties,
  dropTable,
  truncateTable,
  copyCreateTable,
  insertColumnName,
  filterByColumn,
  sortByColumn,
  showTableInfo,
  renameTable,
} from './explorer';
import {
  SqlCompletionProvider,
  runQuery,
  runSelectedQuery,
  explainQuery,
  cancelQuery,
  onQueryResult,
  newSqlFile,
} from './editor';
import { ResultsPanel } from './results';
import {
  previewFile,
  describeFile,
  newQueryForFile,
  copyFileQuery,
  previewFileWithOptions,
  importFileToTable,
  FileQueryDropProvider,
} from './file-query';
import { Logger } from './utils/logger';
import { config } from './utils/config';
import { EXTENSION_ID } from './constants';
import {
  createTableWizard,
  importDataFromFile,
  importDataFromUrl,
  exportTableToFile,
  exportQueryResultsToFile,
  copyTableToClipboard,
} from './data-operations';

/** Context keys for conditional UI */
const CONTEXT_KEYS = {
  CONNECTED: 'duckdb-powerhouse.connected',
  EMPTY_DATABASE: 'duckdb-powerhouse.emptyDatabase',
  HAS_TABLES: 'duckdb-powerhouse.hasTables',
} as const;

/**
 * Called when the extension is activated.
 * Activation triggers are defined in package.json under "activationEvents".
 */
export function activate(context: vscode.ExtensionContext): void {
  Logger.info('DuckDB Powerhouse is activating...');

  // Get the singleton connection manager
  const connectionManager = getConnectionManager();

  // Initialize connection manager with context for history persistence
  connectionManager.initialize(context);

  // Create status bar
  const statusBar = new ConnectionStatusBar(connectionManager);
  context.subscriptions.push(statusBar);

  // Create results panel
  const resultsPanel = ResultsPanel.getInstance(context.extensionUri);

  // Subscribe to query results and show in panel
  context.subscriptions.push(
    onQueryResult((result) => {
      resultsPanel.showResult(result);
      // Update context keys in case query changed schema (CREATE/DROP TABLE)
      if (!result.error) {
        const upperSql = result.sql.toUpperCase();
        if (upperSql.includes('CREATE') || upperSql.includes('DROP') || upperSql.includes('ALTER')) {
          void updateDatabaseContextKeys();
        }
      }
    })
  );

  // Register results panel commands
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.CLEAR_RESULTS, () => {
      resultsPanel.clearResults();
    })
  );

  // Create and register explorer provider
  const explorerProvider = new ExplorerProvider(connectionManager);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(VIEWS.EXPLORER, explorerProvider)
  );

  // Create and register completion provider
  const completionProvider = new SqlCompletionProvider(connectionManager);
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { language: 'sql' },
      completionProvider,
      '.', // Trigger on dot for qualified names
      ' '  // Trigger on space for keywords
    )
  );

  // Helper function to update database context keys
  async function updateDatabaseContextKeys(): Promise<void> {
    const isConnected = connectionManager.isConnected;
    await vscode.commands.executeCommand('setContext', CONTEXT_KEYS.CONNECTED, isConnected);

    if (isConnected) {
      const hasTables = await explorerProvider.hasAnyTables();
      await vscode.commands.executeCommand('setContext', CONTEXT_KEYS.EMPTY_DATABASE, !hasTables);
      await vscode.commands.executeCommand('setContext', CONTEXT_KEYS.HAS_TABLES, hasTables);
    } else {
      await vscode.commands.executeCommand('setContext', CONTEXT_KEYS.EMPTY_DATABASE, false);
      await vscode.commands.executeCommand('setContext', CONTEXT_KEYS.HAS_TABLES, false);
    }
  }

  // Refresh completion cache and update context keys when connection changes
  connectionManager.onStateChange((state) => {
    if (state === 'connected') {
      void completionProvider.refreshCache();
    } else {
      completionProvider.clearCache();
    }
    void updateDatabaseContextKeys();
  });

  // Register connection commands
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.CREATE_CONNECTION, () => {
      void showConnectionMenu(connectionManager);
    }),

    vscode.commands.registerCommand(COMMANDS.DISCONNECT, () => {
      void disconnect(connectionManager);
    }),

    vscode.commands.registerCommand(COMMANDS.RECONNECT, () => {
      void reconnect(connectionManager);
    }),

    vscode.commands.registerCommand(COMMANDS.REFRESH_EXPLORER, () => {
      explorerProvider.refresh();
      void completionProvider.refreshCache();
      void updateDatabaseContextKeys();
    })
  );

  // Register query execution commands
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.RUN_QUERY, () => {
      void runQuery(connectionManager);
    }),

    vscode.commands.registerCommand(COMMANDS.RUN_SELECTED_QUERY, () => {
      void runSelectedQuery(connectionManager);
    }),

    vscode.commands.registerCommand(COMMANDS.EXPLAIN_QUERY, () => {
      void explainQuery(connectionManager);
    }),

    vscode.commands.registerCommand(COMMANDS.CANCEL_QUERY, () => {
      cancelQuery();
    })
  );

  // Register explorer context menu commands
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.PREVIEW_TABLE, (node: TableNode) => {
      void previewTable(node, connectionManager);
    }),

    vscode.commands.registerCommand(COMMANDS.COPY_TABLE_NAME, (node: TableNode) => {
      void copyTableName(node);
    }),

    vscode.commands.registerCommand(COMMANDS.COPY_SELECT_STATEMENT, (node: TableNode) => {
      void copySelectStatement(node, connectionManager);
    }),

    vscode.commands.registerCommand(COMMANDS.NEW_QUERY_FOR_TABLE, (node: TableNode) => {
      void newQueryForTable(node);
    }),

    vscode.commands.registerCommand(COMMANDS.COPY_COLUMN_NAME, (node: ColumnNode) => {
      void copyColumnName(node);
    }),

    // Schema commands
    vscode.commands.registerCommand(COMMANDS.REFRESH_SCHEMA, (node: SchemaNode) => {
      explorerProvider.refresh(node);
    }),

    vscode.commands.registerCommand(COMMANDS.COPY_SCHEMA_NAME, (node: SchemaNode) => {
      void copySchemaName(node);
    }),

    // Table DDL commands
    vscode.commands.registerCommand(COMMANDS.DROP_TABLE, (node: TableNode) => {
      void dropTable(node, connectionManager);
    }),

    vscode.commands.registerCommand(COMMANDS.TRUNCATE_TABLE, (node: TableNode) => {
      void truncateTable(node, connectionManager);
    }),

    vscode.commands.registerCommand(COMMANDS.REFRESH_TABLE, (node: TableNode) => {
      explorerProvider.refresh(node);
    }),

    vscode.commands.registerCommand(COMMANDS.COPY_CREATE_TABLE, (node: TableNode) => {
      void copyCreateTable(node, connectionManager);
    }),

    // Enhanced table commands
    vscode.commands.registerCommand(COMMANDS.SHOW_TABLE_INFO, (node: TableNode) => {
      void showTableInfo(node, connectionManager);
    }),

    vscode.commands.registerCommand(COMMANDS.RENAME_TABLE, (node: TableNode) => {
      void renameTable(node, connectionManager);
    }),

    // Enhanced column commands
    vscode.commands.registerCommand(COMMANDS.INSERT_COLUMN_NAME, (node: ColumnNode) => {
      void insertColumnName(node);
    }),

    vscode.commands.registerCommand(COMMANDS.FILTER_BY_COLUMN, (node: ColumnNode) => {
      void filterByColumn(node, connectionManager);
    }),

    vscode.commands.registerCommand(COMMANDS.SORT_BY_COLUMN, (node: ColumnNode) => {
      void sortByColumn(node);
    }),

    // Database commands
    vscode.commands.registerCommand(COMMANDS.DATABASE_PROPERTIES, (node: DatabaseNode) => {
      void showDatabaseProperties(node, connectionManager);
    })
  );

  // Register file query commands
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.PREVIEW_FILE, (uri: vscode.Uri) => {
      void previewFile(uri, connectionManager);
    }),

    vscode.commands.registerCommand(COMMANDS.DESCRIBE_FILE, (uri: vscode.Uri) => {
      void describeFile(uri, connectionManager);
    }),

    vscode.commands.registerCommand(COMMANDS.NEW_QUERY_FOR_FILE, (uri: vscode.Uri) => {
      void newQueryForFile(uri);
    }),

    vscode.commands.registerCommand(COMMANDS.COPY_FILE_QUERY, (uri: vscode.Uri) => {
      void copyFileQuery(uri);
    }),

    vscode.commands.registerCommand(COMMANDS.PREVIEW_FILE_WITH_OPTIONS, (uri: vscode.Uri) => {
      void previewFileWithOptions(uri, connectionManager);
    }),

    vscode.commands.registerCommand(COMMANDS.IMPORT_FILE_TO_TABLE, (uri: vscode.Uri) => {
      void importFileToTable(uri, connectionManager);
    })
  );

  // Register new SQL file command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.NEW_SQL_FILE, () => {
      void newSqlFile();
    })
  );

  // Register getting started command
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.OPEN_WALKTHROUGH, () => {
      void showGettingStartedGuide();
    })
  );

  // Register data operations commands
  context.subscriptions.push(
    // Create Table Wizard
    vscode.commands.registerCommand(COMMANDS.CREATE_TABLE_WIZARD, () => {
      void createTableWizard(connectionManager);
    }),

    // Import Data (opens file picker)
    vscode.commands.registerCommand(COMMANDS.IMPORT_DATA, () => {
      void importDataFromFile(connectionManager);
    }),

    // Import from URL
    vscode.commands.registerCommand(COMMANDS.IMPORT_DATA_FROM_URL, () => {
      void importDataFromUrl(connectionManager);
    }),

    // Export Table (from context menu on table)
    vscode.commands.registerCommand(COMMANDS.EXPORT_TABLE, (node: TableNode) => {
      void exportTableToFile(connectionManager, node.name, node.schemaName);
    }),

    // Export Results (from results panel - needs last query)
    vscode.commands.registerCommand(COMMANDS.EXPORT_RESULTS, () => {
      const lastResult = resultsPanel.getLastResult();
      if (lastResult && !lastResult.error) {
        void exportQueryResultsToFile(connectionManager, lastResult.sql);
      } else {
        void vscode.window.showWarningMessage('No query results to export');
      }
    }),

    // Copy Table as CSV
    vscode.commands.registerCommand(COMMANDS.COPY_TABLE_AS_CSV, (node: TableNode) => {
      void copyTableToClipboard(connectionManager, node.name, node.schemaName, 'csv');
    }),

    // Copy Table as JSON
    vscode.commands.registerCommand(COMMANDS.COPY_TABLE_AS_JSON, (node: TableNode) => {
      void copyTableToClipboard(connectionManager, node.name, node.schemaName, 'json');
    })
  );

  // Register drop provider for SQL files
  const dropProvider = new FileQueryDropProvider();
  context.subscriptions.push(
    vscode.languages.registerDocumentDropEditProvider(
      { language: 'sql' },
      dropProvider
    )
  );

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(EXTENSION_ID)) {
        Logger.info('Configuration changed');
        // Refresh explorer and completion cache when settings change
        explorerProvider.refresh();
        if (connectionManager.isConnected) {
          void completionProvider.refreshCache();
        }
      }
    })
  );

  // Auto-connect if enabled
  if (config.autoConnect) {
    Logger.info('Auto-connecting to in-memory database');
    void connectionManager.connectInMemory().then(() => {
      void vscode.window.showInformationMessage('DuckDB: Connected to in-memory database');
    });
  }

  // Show welcome message on first activation
  const hasShownWelcome = context.globalState.get<boolean>('hasShownWelcome', false);
  if (!hasShownWelcome) {
    void showWelcomeMessage(context);
  }

  // Register disposable for cleanup
  context.subscriptions.push({
    dispose: () => {
      explorerProvider.dispose();
      resultsPanel.dispose();
      void connectionManager.dispose();
    },
  });

  Logger.info('DuckDB Powerhouse activated successfully');
}

/**
 * Called when the extension is deactivated.
 */
export function deactivate(): void {
  Logger.info('DuckDB Powerhouse deactivated');
}

/**
 * Show getting started guide with quick tips and actions.
 */
async function showGettingStartedGuide(): Promise<void> {
  const items = [
    {
      label: '$(database) Create Connection',
      description: 'Connect to in-memory or file database',
      action: 'connect',
    },
    {
      label: '$(folder-opened) Import Data File',
      description: 'Import CSV, Parquet, or JSON into a table',
      action: 'import',
    },
    {
      label: '$(globe) Import from URL',
      description: 'Load remote data directly (DuckDB superpower!)',
      action: 'importUrl',
    },
    {
      label: '$(new-file) New SQL File',
      description: 'Start writing queries',
      action: 'newSql',
    },
    {
      label: '',
      kind: vscode.QuickPickItemKind.Separator,
    },
    {
      label: '$(lightbulb) Quick Tips',
      description: 'Query files directly without importing',
      detail: "SELECT * FROM read_csv('file.csv')",
      action: 'tip1',
    },
    {
      label: '$(symbol-keyword) SQL Snippets',
      description: "Type 'ct' for CREATE TABLE, 'ctas' for CREATE AS SELECT",
      action: 'tip2',
    },
    {
      label: '$(play) Run Query',
      description: 'Cmd+Enter to execute SQL',
      action: 'tip3',
    },
  ] as const;

  const selected = await vscode.window.showQuickPick(items.filter(i => i.label !== ''), {
    title: 'DuckDB Powerhouse - Getting Started',
    placeHolder: 'Select an action or learn a tip',
  });

  if (!selected || !('action' in selected)) return;

  switch (selected.action) {
    case 'connect':
      await vscode.commands.executeCommand('duckdb-powerhouse.createConnection');
      break;
    case 'import':
      await vscode.commands.executeCommand('duckdb-powerhouse.importData');
      break;
    case 'importUrl':
      await vscode.commands.executeCommand('duckdb-powerhouse.importDataFromUrl');
      break;
    case 'newSql':
      await vscode.commands.executeCommand('duckdb-powerhouse.newSqlFile');
      break;
    case 'tip1': {
      // Open new SQL file with example
      const doc = await vscode.workspace.openTextDocument({
        language: 'sql',
        content: `-- Query files directly without importing!
-- Just replace the path with your file

SELECT * FROM read_csv('path/to/your/file.csv') LIMIT 100;

-- Or for Parquet files:
-- SELECT * FROM read_parquet('data.parquet');

-- Or JSON:
-- SELECT * FROM read_json('data.json');
`,
      });
      await vscode.window.showTextDocument(doc);
      break;
    }
    case 'tip2':
      void vscode.window.showInformationMessage(
        'SQL Snippets: Type "ct" + Tab for CREATE TABLE, "csv" for read_csv(), "parquet" for read_parquet()'
      );
      break;
    case 'tip3':
      void vscode.window.showInformationMessage(
        'Keyboard shortcuts: Cmd+Enter (Run Query), Cmd+Shift+Enter (Run Selection), Cmd+Alt+N (New SQL File)'
      );
      break;
  }
}

/**
 * Show welcome message on first activation.
 */
async function showWelcomeMessage(context: vscode.ExtensionContext): Promise<void> {
  const action = await vscode.window.showInformationMessage(
    'Welcome to DuckDB Powerhouse! Query Parquet, CSV, and JSON files with ease.',
    'Get Started',
    'Open Settings',
    "Don't Show Again"
  );

  if (action === 'Get Started') {
    // Open the DuckDB sidebar
    await vscode.commands.executeCommand('workbench.view.extension.duckdb-powerhouse');
  } else if (action === 'Open Settings') {
    await vscode.commands.executeCommand(
      'workbench.action.openSettings',
      '@ext:duckdb-powerhouse.duckdb-powerhouse'
    );
  }

  // Mark welcome as shown regardless of action
  await context.globalState.update('hasShownWelcome', true);
}
