import * as vscode from 'vscode';

import { BaseNode } from './base';

/**
 * Tree node representing a database table.
 */
export class TableNode extends BaseNode {
  readonly nodeType = 'table';

  constructor(
    public readonly name: string,
    public readonly schemaName: string,
    public readonly rowCount?: number
  ) {
    super(name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = 'table';
    this.iconPath = new vscode.ThemeIcon('table');
    this.tooltip = this.buildTooltip();
    this.description = rowCount !== undefined ? `${rowCount.toLocaleString()} rows` : undefined;

    // Double-click to view data
    this.command = {
      command: 'duckdb-powerhouse.previewTable',
      title: 'View Data',
      arguments: [this],
    };
  }

  private buildTooltip(): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**Table:** ${this.name}\n\n`);
    md.appendMarkdown(`Schema: ${this.schemaName}\n\n`);
    if (this.rowCount !== undefined) {
      md.appendMarkdown(`Rows: ${this.rowCount.toLocaleString()}`);
    }
    return md;
  }

  /**
   * Get the fully qualified table name for SQL queries.
   */
  get qualifiedName(): string {
    return `"${this.schemaName}"."${this.name}"`;
  }
}
