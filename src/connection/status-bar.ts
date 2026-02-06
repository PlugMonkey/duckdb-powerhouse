import * as vscode from 'vscode';

import { COMMANDS, EXTENSION_NAME } from '../constants';
import { ConnectionState, ConnectionType, getConnectionPath } from '../types';
import { ConnectionManager } from './manager';

/**
 * Status bar item showing current DuckDB connection state.
 * Clicking it opens the connection menu.
 */
export class ConnectionStatusBar implements vscode.Disposable {
  private readonly statusBarItem: vscode.StatusBarItem;
  private readonly unsubscribe: () => void;

  constructor(private readonly connectionManager: ConnectionManager) {
    // Create status bar item on the left side
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );

    // Clicking opens create connection command
    this.statusBarItem.command = COMMANDS.CREATE_CONNECTION;
    this.statusBarItem.name = EXTENSION_NAME;

    // Subscribe to state changes
    this.unsubscribe = connectionManager.onStateChange((state) => {
      this.update(state);
    });

    // Initial update
    this.update(connectionManager.state);
    this.statusBarItem.show();
  }

  /**
   * Update the status bar based on connection state
   */
  private update(state: ConnectionState): void {
    const config = this.connectionManager.currentConfig;

    switch (state) {
      case 'disconnected':
        this.statusBarItem.text = '$(database) DuckDB: Not Connected';
        this.statusBarItem.tooltip = 'Click to create a connection';
        this.statusBarItem.backgroundColor = undefined;
        break;

      case 'connecting':
        this.statusBarItem.text = '$(loading~spin) DuckDB: Connecting...';
        this.statusBarItem.tooltip = 'Establishing connection...';
        this.statusBarItem.backgroundColor = undefined;
        break;

      case 'connected': {
        const typeIcon = this.getTypeIcon(config?.type);
        const name = config?.name ?? 'Connected';
        this.statusBarItem.text = `${typeIcon} DuckDB: ${name}`;

        const path = config ? getConnectionPath(config) : undefined;
        this.statusBarItem.tooltip = new vscode.MarkdownString(
          `**${EXTENSION_NAME}**\n\n` +
          `Status: Connected\n\n` +
          `Type: ${this.connectionManager.getTypeDisplay()}\n\n` +
          `Name: ${name}` +
          (path ? `\n\nPath: \`${path}\`` : '')
        );
        this.statusBarItem.backgroundColor = undefined;
        break;
      }

      case 'error':
        this.statusBarItem.text = '$(error) DuckDB: Error';
        this.statusBarItem.tooltip = 'Connection error. Click to reconnect.';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.errorBackground'
        );
        break;
    }
  }

  /**
   * Get the icon for a connection type
   */
  private getTypeIcon(type: ConnectionType | undefined): string {
    if (!type) return '$(database)';

    const icons: Record<ConnectionType, string> = {
      memory: '$(vm)',
      file: '$(file)',
      motherduck: '$(cloud)',
      postgres: '$(server)',
      s3: '$(cloud-upload)',
    };
    return icons[type];
  }

  /**
   * Show the status bar item
   */
  show(): void {
    this.statusBarItem.show();
  }

  /**
   * Hide the status bar item
   */
  hide(): void {
    this.statusBarItem.hide();
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.unsubscribe();
    this.statusBarItem.dispose();
  }
}
