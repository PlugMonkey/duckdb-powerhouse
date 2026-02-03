import * as vscode from 'vscode';

import { BaseNode } from './base';

/**
 * Tree node representing a database connection.
 */
export class DatabaseNode extends BaseNode {
  readonly nodeType = 'database';

  constructor(
    public readonly name: string,
    public readonly path?: string
  ) {
    super(name, vscode.TreeItemCollapsibleState.Expanded);

    this.contextValue = 'database';
    this.iconPath = new vscode.ThemeIcon('database');
    this.tooltip = this.buildTooltip();
    this.description = path ? 'file' : 'in-memory';
  }

  private buildTooltip(): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**Database:** ${this.name}\n\n`);
    md.appendMarkdown(`Type: ${this.path ? 'File' : 'In-Memory'}\n\n`);
    if (this.path) {
      md.appendMarkdown(`Path: \`${this.path}\``);
    }
    return md;
  }
}
