import * as vscode from 'vscode';

import {
  ConnectionConfig,
  MotherDuckConnectionConfig,
  PostgresConnectionConfig,
  S3ConnectionConfig,
} from '../types';
import { Logger } from '../utils/logger';
import { config as extensionConfig } from '../utils/config';
import { ConnectionManager } from './manager';

type ConnectionAction =
  | 'memory'
  | 'openFile'
  | 'createFile'
  | 'disconnect'
  | 'reconnect'
  | 'history'
  | 'clearHistory'
  | 'motherduck'
  | 'postgres'
  | 's3'
  | 'manageCredentials';

interface ConnectionQuickPickItem extends vscode.QuickPickItem {
  action: ConnectionAction;
  config?: ConnectionConfig;
}

/**
 * Show connection quick pick menu
 */
export async function showConnectionMenu(connectionManager: ConnectionManager): Promise<void> {
  const items: ConnectionQuickPickItem[] = [];

  if (connectionManager.isConnected) {
    // Show disconnect option first when connected
    items.push({
      label: '$(debug-disconnect) Disconnect',
      description: `Currently connected to: ${connectionManager.currentConfig?.name}`,
      action: 'disconnect',
    });
    items.push({
      label: '',
      kind: vscode.QuickPickItemKind.Separator,
      action: 'memory', // Required but unused
    });
  } else if (connectionManager.lastConfig) {
    // Show reconnect option when not connected but have history
    items.push({
      label: '$(debug-start) Reconnect',
      description: `Reconnect to: ${connectionManager.lastConfig.name}`,
      action: 'reconnect',
    });
    items.push({
      label: '',
      kind: vscode.QuickPickItemKind.Separator,
      action: 'memory', // Required but unused
    });
  }

  // Main connection options
  items.push(
    {
      label: '$(vm) Create In-Memory Database',
      description: 'Fast, temporary database (data lost on close)',
      action: 'memory',
    },
    {
      label: '$(folder-opened) Open Existing Database',
      description: 'Open an existing .duckdb file',
      action: 'openFile',
    },
    {
      label: '$(new-file) Create New Database',
      description: 'Create a new .duckdb file',
      action: 'createFile',
    }
  );

  // Remote data source options
  items.push(
    {
      label: '',
      kind: vscode.QuickPickItemKind.Separator,
      action: 'memory', // Required but unused
    },
    {
      label: '$(cloud) Connect to MotherDuck',
      description: 'Cloud data warehouse with collaborative analytics',
      action: 'motherduck',
    },
    {
      label: '$(server) Connect to PostgreSQL',
      description: 'Query external PostgreSQL databases',
      action: 'postgres',
    },
    {
      label: '$(cloud-upload) Configure S3 Access',
      description: 'Query Parquet/CSV files in S3 buckets',
      action: 's3',
    },
    {
      label: '',
      kind: vscode.QuickPickItemKind.Separator,
      action: 'memory', // Required but unused
    },
    {
      label: '$(key) Manage Credentials...',
      description: 'Set up tokens and passwords for remote connections',
      action: 'manageCredentials',
    }
  );

  // Add recent connections from history
  const history = connectionManager.getHistory();
  if (history.length > 0) {
    items.push({
      label: '',
      kind: vscode.QuickPickItemKind.Separator,
      action: 'memory', // Required but unused
    });
    items.push({
      label: '$(history) Recent Connections',
      kind: vscode.QuickPickItemKind.Separator,
      action: 'memory', // Required but unused
    });

    for (const config of history) {
      const { icon, desc } = getConnectionDisplayInfo(config);
      items.push({
        label: `${icon} ${config.name}`,
        description: desc,
        action: 'history',
        config,
      });
    }

    items.push({
      label: '$(trash) Clear History',
      description: 'Remove all recent connections',
      action: 'clearHistory',
    });
  }

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select connection action',
    title: 'DuckDB Connection',
  });

  if (!selected || selected.kind === vscode.QuickPickItemKind.Separator) {
    return;
  }

  try {
    switch (selected.action) {
      case 'memory':
        await createInMemoryConnection(connectionManager);
        break;
      case 'openFile':
        await openFileConnection(connectionManager);
        break;
      case 'createFile':
        await createFileConnection(connectionManager);
        break;
      case 'disconnect':
        await disconnectWithConfirmation(connectionManager);
        break;
      case 'reconnect':
        await connectionManager.reconnect();
        void vscode.window.showInformationMessage(`Reconnected to: ${connectionManager.currentConfig?.name}`);
        break;
      case 'history':
        if (selected.config) {
          await connectionManager.connect(selected.config);
          void vscode.window.showInformationMessage(`Connected to: ${selected.config.name}`);
        }
        break;
      case 'clearHistory':
        await connectionManager.clearHistory();
        void vscode.window.showInformationMessage('Connection history cleared');
        break;
      case 'motherduck':
        await createMotherDuckConnection(connectionManager);
        break;
      case 'postgres':
        await createPostgresConnection(connectionManager);
        break;
      case 's3':
        await createS3Connection(connectionManager);
        break;
      case 'manageCredentials':
        await showCredentialsMenu(connectionManager);
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    void vscode.window.showErrorMessage(`Connection error: ${message}`);
    Logger.error('Connection menu action failed', err);
  }
}

/**
 * Create a new in-memory database connection
 */
async function createInMemoryConnection(connectionManager: ConnectionManager): Promise<void> {
  const name = await vscode.window.showInputBox({
    prompt: 'Enter a name for this connection (optional)',
    placeHolder: 'In-Memory',
    value: 'In-Memory',
  });

  // User cancelled
  if (name === undefined) {
    return;
  }

  await connectionManager.connectInMemory(name || 'In-Memory');
  void vscode.window.showInformationMessage(`Connected to in-memory database: ${name || 'In-Memory'}`);
}

/**
 * Open an existing file-based database connection
 */
async function openFileConnection(connectionManager: ConnectionManager): Promise<void> {
  const fileUri = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: {
      'DuckDB Database': ['duckdb', 'db'],
      'All Files': ['*'],
    },
    openLabel: 'Open Database',
    title: 'Open Existing DuckDB Database',
  });

  const selectedFile = fileUri?.[0];
  if (!selectedFile) {
    return;
  }

  const filePath = selectedFile.fsPath;
  await connectionManager.connectToFile(filePath);
  void vscode.window.showInformationMessage(`Connected to database: ${filePath}`);
}

/**
 * Create a new file-based database connection
 */
async function createFileConnection(connectionManager: ConnectionManager): Promise<void> {
  const fileUri = await vscode.window.showSaveDialog({
    filters: {
      'DuckDB Database': ['duckdb'],
    },
    saveLabel: 'Create Database',
    title: 'Create New DuckDB Database',
  });

  if (!fileUri) {
    return;
  }

  const filePath = fileUri.fsPath;
  // Ensure the file has .duckdb extension
  const finalPath = filePath.endsWith('.duckdb') ? filePath : `${filePath}.duckdb`;

  await connectionManager.connectToFile(finalPath);
  void vscode.window.showInformationMessage(`Created and connected to database: ${finalPath}`);
}

/**
 * Quick action to create in-memory database without prompts
 */
export async function quickConnectInMemory(connectionManager: ConnectionManager): Promise<void> {
  try {
    await connectionManager.connectInMemory();
    void vscode.window.showInformationMessage('Connected to in-memory database');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    void vscode.window.showErrorMessage(`Failed to connect: ${message}`);
  }
}

/**
 * Disconnect with confirmation if connected
 */
async function disconnectWithConfirmation(connectionManager: ConnectionManager): Promise<void> {
  if (!connectionManager.isConnected) {
    void vscode.window.showInformationMessage('No active connection');
    return;
  }
  await connectionManager.disconnect();
  void vscode.window.showInformationMessage('Disconnected from database');
}

/**
 * Disconnect command - can be called from command palette
 */
export async function disconnect(connectionManager: ConnectionManager): Promise<void> {
  if (!connectionManager.isConnected) {
    void vscode.window.showWarningMessage('No active connection to disconnect');
    return;
  }

  try {
    const name = connectionManager.currentConfig?.name ?? 'database';
    await connectionManager.disconnect();
    void vscode.window.showInformationMessage(`Disconnected from ${name}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    void vscode.window.showErrorMessage(`Failed to disconnect: ${message}`);
    Logger.error('Disconnect failed', err);
  }
}

/**
 * Reconnect to the last used connection
 */
export async function reconnect(connectionManager: ConnectionManager): Promise<void> {
  if (connectionManager.isConnected) {
    void vscode.window.showWarningMessage('Already connected. Disconnect first to reconnect.');
    return;
  }

  if (!connectionManager.lastConfig) {
    void vscode.window.showWarningMessage('No previous connection to reconnect to');
    return;
  }

  try {
    await connectionManager.reconnect();
    void vscode.window.showInformationMessage(`Reconnected to: ${connectionManager.currentConfig?.name}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    void vscode.window.showErrorMessage(`Failed to reconnect: ${message}`);
    Logger.error('Reconnect failed', err);
  }
}

/**
 * Get display icon and description for a connection config
 */
function getConnectionDisplayInfo(config: ConnectionConfig): { icon: string; desc: string } {
  switch (config.type) {
    case 'memory':
      return { icon: '$(vm)', desc: 'In-Memory' };
    case 'file':
      return { icon: '$(file)', desc: config.path };
    case 'motherduck':
      return { icon: '$(cloud)', desc: config.database ? `MotherDuck: ${config.database}` : 'MotherDuck' };
    case 'postgres':
      return { icon: '$(server)', desc: `${config.host}:${config.port}/${config.database}` };
    case 's3':
      return { icon: '$(cloud-upload)', desc: config.bucket ? `S3: ${config.bucket}` : `S3 (${config.region})` };
    default:
      return { icon: '$(database)', desc: 'Unknown' };
  }
}

/**
 * Create a MotherDuck cloud connection
 */
export async function createMotherDuckConnection(connectionManager: ConnectionManager): Promise<void> {
  const creds = connectionManager.getCredentialManager();

  // Check if token exists, prompt if missing
  const hasToken = await creds.hasMotherDuckToken();
  if (!hasToken) {
    const token = await vscode.window.showInputBox({
      prompt: 'Enter your MotherDuck token',
      placeHolder: 'eyJhbG...',
      password: true,
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Token is required';
        }
        return null;
      },
    });

    if (!token) {
      return; // User cancelled
    }

    await creds.setMotherDuckToken(token);
    void vscode.window.showInformationMessage('MotherDuck token saved');
  }

  // Prompt for database name
  const database = await vscode.window.showInputBox({
    prompt: 'Enter database name (leave empty to attach all databases)',
    placeHolder: 'my_database',
  });

  if (database === undefined) {
    return; // User cancelled
  }

  // Prompt for connection name
  const defaultName = database ? `MotherDuck: ${database}` : 'MotherDuck';
  const name = await vscode.window.showInputBox({
    prompt: 'Enter a name for this connection',
    placeHolder: defaultName,
    value: defaultName,
  });

  if (!name) {
    return; // User cancelled
  }

  const config: MotherDuckConnectionConfig = {
    type: 'motherduck',
    name,
    database: database || undefined,
  };

  await connectionManager.connect(config);
  void vscode.window.showInformationMessage(`Connected to MotherDuck: ${name}`);
}

/**
 * Create a PostgreSQL external connection
 */
export async function createPostgresConnection(connectionManager: ConnectionManager): Promise<void> {
  // Host
  const host = await vscode.window.showInputBox({
    prompt: 'PostgreSQL host',
    placeHolder: 'localhost',
    value: 'localhost',
  });

  if (!host) {
    return;
  }

  // Port
  const portStr = await vscode.window.showInputBox({
    prompt: 'PostgreSQL port',
    placeHolder: String(extensionConfig.postgresDefaultPort),
    value: String(extensionConfig.postgresDefaultPort),
    validateInput: (value) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1 || num > 65535) {
        return 'Invalid port number';
      }
      return null;
    },
  });

  if (!portStr) {
    return;
  }
  const port = parseInt(portStr, 10);

  // Database
  const database = await vscode.window.showInputBox({
    prompt: 'Database name',
    placeHolder: 'postgres',
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Database name is required';
      }
      return null;
    },
  });

  if (!database) {
    return;
  }

  // Username
  const user = await vscode.window.showInputBox({
    prompt: 'Username',
    placeHolder: 'postgres',
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Username is required';
      }
      return null;
    },
  });

  if (!user) {
    return;
  }

  // Connection name (used as key for password storage)
  const defaultName = `${host}:${port}/${database}`;
  const name = await vscode.window.showInputBox({
    prompt: 'Enter a name for this connection',
    placeHolder: defaultName,
    value: defaultName,
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Connection name is required';
      }
      return null;
    },
  });

  if (!name) {
    return;
  }

  // Password
  const password = await vscode.window.showInputBox({
    prompt: 'Password',
    password: true,
    ignoreFocusOut: true,
    validateInput: (value) => {
      if (!value || value.length === 0) {
        return 'Password is required';
      }
      return null;
    },
  });

  if (!password) {
    return;
  }

  // Store password securely
  const creds = connectionManager.getCredentialManager();
  await creds.setPostgresPassword(name, password);

  const config: PostgresConnectionConfig = {
    type: 'postgres',
    name,
    host,
    port,
    database,
    user,
  };

  await connectionManager.connect(config);
  void vscode.window.showInformationMessage(`Connected to PostgreSQL: ${name}`);
}

/**
 * Create an S3/cloud storage connection
 */
export async function createS3Connection(connectionManager: ConnectionManager): Promise<void> {
  // Auth method selection
  const authMethod = await vscode.window.showQuickPick(
    [
      {
        label: '$(key) IAM Authentication',
        description: 'Use AWS environment credentials or instance profile',
        value: 'iam',
      },
      {
        label: '$(lock) Access Keys',
        description: 'Provide AWS access key and secret key',
        value: 'keys',
      },
    ],
    {
      placeHolder: 'Select authentication method',
      title: 'S3 Authentication',
    }
  );

  if (!authMethod) {
    return;
  }

  const useIamAuth = authMethod.value === 'iam';
  const creds = connectionManager.getCredentialManager();

  // If using access keys, prompt for them
  if (!useIamAuth) {
    const hasKeys = await creds.hasS3Credentials();

    if (!hasKeys) {
      const accessKey = await vscode.window.showInputBox({
        prompt: 'AWS Access Key ID',
        placeHolder: 'AKIA...',
        ignoreFocusOut: true,
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Access key is required';
          }
          return null;
        },
      });

      if (!accessKey) {
        return;
      }

      const secretKey = await vscode.window.showInputBox({
        prompt: 'AWS Secret Access Key',
        password: true,
        ignoreFocusOut: true,
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Secret key is required';
          }
          return null;
        },
      });

      if (!secretKey) {
        return;
      }

      await creds.setS3Credentials(accessKey, secretKey);
      void vscode.window.showInformationMessage('S3 credentials saved');
    }
  }

  // Region
  const region = await vscode.window.showInputBox({
    prompt: 'AWS Region',
    placeHolder: extensionConfig.s3DefaultRegion,
    value: extensionConfig.s3DefaultRegion,
  });

  if (!region) {
    return;
  }

  // Optional bucket
  const bucket = await vscode.window.showInputBox({
    prompt: 'Default bucket (optional, leave empty for none)',
    placeHolder: 'my-bucket',
  });

  if (bucket === undefined) {
    return;
  }

  // Connection name
  const defaultName = bucket ? `S3: ${bucket}` : `S3 (${region})`;
  const name = await vscode.window.showInputBox({
    prompt: 'Enter a name for this connection',
    placeHolder: defaultName,
    value: defaultName,
  });

  if (!name) {
    return;
  }

  const config: S3ConnectionConfig = {
    type: 's3',
    name,
    region,
    bucket: bucket || undefined,
    useIamAuth,
  };

  await connectionManager.connect(config);
  void vscode.window.showInformationMessage(`Connected to S3: ${name}`);
}

/**
 * Show credentials management menu
 */
export async function showCredentialsMenu(connectionManager: ConnectionManager): Promise<void> {
  const creds = connectionManager.getCredentialManager();

  const items = [
    {
      label: '$(cloud) MotherDuck Token',
      description: (await creds.hasMotherDuckToken()) ? 'Configured' : 'Not set',
      action: 'motherduck',
    },
    {
      label: '$(cloud-upload) S3 Credentials',
      description: (await creds.hasS3Credentials()) ? 'Configured' : 'Not set',
      action: 's3',
    },
  ];

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select credentials to manage',
    title: 'Manage Credentials',
  });

  if (!selected) {
    return;
  }

  switch (selected.action) {
    case 'motherduck': {
      const hasToken = await creds.hasMotherDuckToken();
      const action = await vscode.window.showQuickPick(
        hasToken
          ? [
              { label: '$(edit) Update Token', action: 'update' },
              { label: '$(trash) Delete Token', action: 'delete' },
            ]
          : [{ label: '$(add) Set Token', action: 'update' }],
        { placeHolder: 'Choose action' }
      );

      if (!action) return;

      if (action.action === 'delete') {
        await creds.deleteMotherDuckToken();
        void vscode.window.showInformationMessage('MotherDuck token deleted');
      } else {
        const token = await vscode.window.showInputBox({
          prompt: 'Enter your MotherDuck token',
          password: true,
          ignoreFocusOut: true,
        });
        if (token) {
          await creds.setMotherDuckToken(token);
          void vscode.window.showInformationMessage('MotherDuck token saved');
        }
      }
      break;
    }

    case 's3': {
      const hasCreds = await creds.hasS3Credentials();
      const action = await vscode.window.showQuickPick(
        hasCreds
          ? [
              { label: '$(edit) Update Credentials', action: 'update' },
              { label: '$(trash) Delete Credentials', action: 'delete' },
            ]
          : [{ label: '$(add) Set Credentials', action: 'update' }],
        { placeHolder: 'Choose action' }
      );

      if (!action) return;

      if (action.action === 'delete') {
        await creds.deleteS3Credentials();
        void vscode.window.showInformationMessage('S3 credentials deleted');
      } else {
        const accessKey = await vscode.window.showInputBox({
          prompt: 'AWS Access Key ID',
          placeHolder: 'AKIA...',
          ignoreFocusOut: true,
        });
        if (!accessKey) return;

        const secretKey = await vscode.window.showInputBox({
          prompt: 'AWS Secret Access Key',
          password: true,
          ignoreFocusOut: true,
        });
        if (!secretKey) return;

        await creds.setS3Credentials(accessKey, secretKey);
        void vscode.window.showInformationMessage('S3 credentials saved');
      }
      break;
    }
  }
}
