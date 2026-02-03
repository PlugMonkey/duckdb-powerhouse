import * as vscode from 'vscode';

/**
 * Base class for all tree nodes in the explorer.
 */
export abstract class BaseNode extends vscode.TreeItem {
  /**
   * Unique identifier for this node type, used in context menus.
   */
  abstract readonly nodeType: string;

  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
  ) {
    super(label, collapsibleState);
  }
}

/**
 * Message node for displaying status messages (e.g., "Not connected")
 */
export class MessageNode extends BaseNode {
  readonly nodeType = 'message';

  constructor(message: string, description?: string) {
    super(message, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.contextValue = 'message';
  }
}
