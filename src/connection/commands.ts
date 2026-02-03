import * as vscode from 'vscode';

import { ConnectionConfig } from '../types';
import { Logger } from '../utils/logger';
import { ConnectionManager } from './manager';

interface ConnectionQuickPickItem extends vscode.QuickPickItem {
  action: 'memory' | 'openFile' | 'createFile' | 'disconnect' | 'reconnect' | 'history' | 'clearHistory';
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
      const icon = config.type === 'memory' ? '$(vm)' : '$(file)';
      const path = config.path ? ` - ${config.path}` : '';
      items.push({
        label: `${icon} ${config.name}`,
        description: config.type === 'memory' ? 'In-Memory' : path,
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
