import * as vscode from 'vscode';

import { BaseNode } from './base';

/**
 * Tree node representing a database schema.
 */
export class SchemaNode extends BaseNode {
  readonly nodeType = 'schema';

  constructor(
    public readonly name: string,
    public readonly databaseName: string
  ) {
    super(name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = 'schema';
    this.iconPath = new vscode.ThemeIcon('folder');
    this.tooltip = `Schema: ${name}`;
  }
}
