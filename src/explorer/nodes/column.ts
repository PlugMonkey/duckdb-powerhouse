import * as vscode from 'vscode';

import { BaseNode } from './base';

/**
 * Tree node representing a table column.
 */
export class ColumnNode extends BaseNode {
  readonly nodeType = 'column';

  constructor(
    public readonly name: string,
    public readonly dataType: string,
    public readonly nullable: boolean,
    public readonly tableName: string,
    public readonly schemaName: string
  ) {
    super(name, vscode.TreeItemCollapsibleState.None);

    this.contextValue = 'column';
    this.iconPath = this.getIconForType(dataType);
    this.description = this.formatType();
    this.tooltip = this.buildTooltip();
  }

  private formatType(): string {
    const nullability = this.nullable ? '' : ' NOT NULL';
    return `${this.dataType}${nullability}`;
  }

  private buildTooltip(): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**Column:** ${this.name}\n\n`);
    md.appendMarkdown(`Type: \`${this.dataType}\`\n\n`);
    md.appendMarkdown(`Nullable: ${this.nullable ? 'Yes' : 'No'}\n\n`);
    md.appendMarkdown(`Table: ${this.schemaName}.${this.tableName}`);
    return md;
  }

  /**
   * Get an appropriate icon based on the column data type.
   */
  private getIconForType(type: string): vscode.ThemeIcon {
    const upperType = type.toUpperCase();

    // Numeric types
    if (
      upperType.includes('INT') ||
      upperType.includes('DECIMAL') ||
      upperType.includes('NUMERIC') ||
      upperType.includes('FLOAT') ||
      upperType.includes('DOUBLE') ||
      upperType.includes('REAL')
    ) {
      return new vscode.ThemeIcon('symbol-number');
    }

    // String types
    if (upperType.includes('VARCHAR') || upperType.includes('TEXT') || upperType.includes('CHAR')) {
      return new vscode.ThemeIcon('symbol-string');
    }

    // Boolean
    if (upperType.includes('BOOL')) {
      return new vscode.ThemeIcon('symbol-boolean');
    }

    // Date/Time types
    if (
      upperType.includes('DATE') ||
      upperType.includes('TIME') ||
      upperType.includes('TIMESTAMP')
    ) {
      return new vscode.ThemeIcon('calendar');
    }

    // Binary/Blob
    if (upperType.includes('BLOB') || upperType.includes('BINARY')) {
      return new vscode.ThemeIcon('file-binary');
    }

    // Array types
    if (upperType.includes('[]') || upperType.includes('ARRAY')) {
      return new vscode.ThemeIcon('symbol-array');
    }

    // Struct/Object types
    if (upperType.includes('STRUCT') || upperType.includes('MAP')) {
      return new vscode.ThemeIcon('symbol-object');
    }

    // Default
    return new vscode.ThemeIcon('symbol-field');
  }
}
