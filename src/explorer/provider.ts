import * as vscode from 'vscode';

import { ConnectionManager } from '../connection';
import { Logger } from '../utils/logger';
import {
  BaseNode,
  MessageNode,
  DatabaseNode,
  SchemaNode,
  TableNode,
  ColumnNode,
} from './nodes';
import { SchemaLoader } from './schema-loader';

/**
 * TreeDataProvider for the DuckDB Explorer sidebar.
 * Shows database structure: Database → Schema → Table → Columns
 */
export class ExplorerProvider implements vscode.TreeDataProvider<BaseNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<BaseNode | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private readonly schemaLoader: SchemaLoader;
  private readonly unsubscribe: () => void;

  constructor(private readonly connectionManager: ConnectionManager) {
    this.schemaLoader = new SchemaLoader(connectionManager);

    // Refresh tree when connection state changes
    this.unsubscribe = connectionManager.onStateChange(() => {
      this.refresh();
    });
  }

  /**
   * Refresh the entire tree or a specific node.
   */
  refresh(node?: BaseNode): void {
    this._onDidChangeTreeData.fire(node);
  }

  /**
   * Get the tree item representation of a node.
   */
  getTreeItem(element: BaseNode): vscode.TreeItem {
    return element;
  }

  /**
   * Get children of a node (or root nodes if no element provided).
   */
  async getChildren(element?: BaseNode): Promise<BaseNode[]> {
    // Root level - show database or "not connected" message
    if (!element) {
      return this.getRootChildren();
    }

    // Database level - show schemas
    if (element instanceof DatabaseNode) {
      return this.getSchemaChildren();
    }

    // Schema level - show tables
    if (element instanceof SchemaNode) {
      return this.getTableChildren(element);
    }

    // Table level - show columns
    if (element instanceof TableNode) {
      return this.getColumnChildren(element);
    }

    return [];
  }

  /**
   * Get root level children (database or status message).
   * Returns empty array when disconnected to allow viewsWelcome to display.
   */
  private getRootChildren(): BaseNode[] {
    if (!this.connectionManager.isConnected) {
      // Return empty array to let viewsWelcome handle the UI
      return [];
    }

    const config = this.connectionManager.currentConfig;
    if (!config) {
      return [new MessageNode('No database', 'Connection configuration missing')];
    }

    return [new DatabaseNode(config.name, config.path)];
  }

  /**
   * Check if the database has any user tables.
   * Used for updating context keys.
   */
  async hasAnyTables(): Promise<boolean> {
    return this.schemaLoader.hasAnyTables();
  }

  /**
   * Get schema children for a database.
   */
  private async getSchemaChildren(): Promise<BaseNode[]> {
    try {
      const schemas = await this.schemaLoader.getSchemas();

      if (schemas.length === 0) {
        return [new MessageNode('No schemas found')];
      }

      const config = this.connectionManager.currentConfig;
      return schemas.map(
        (schema) => new SchemaNode(schema.schema_name, config?.name ?? 'Unknown')
      );
    } catch (err) {
      Logger.error('Failed to get schemas', err);
      return [new MessageNode('Error loading schemas', String(err))];
    }
  }

  /**
   * Get table children for a schema.
   */
  private async getTableChildren(schema: SchemaNode): Promise<BaseNode[]> {
    try {
      const tables = await this.schemaLoader.getTables(schema.name);

      if (tables.length === 0) {
        return [new MessageNode('No tables')];
      }

      return tables.map(
        (table) =>
          new TableNode(
            table.table_name,
            table.schema_name,
            table.estimated_size ?? undefined
          )
      );
    } catch (err) {
      Logger.error('Failed to get tables', err);
      return [new MessageNode('Error loading tables', String(err))];
    }
  }

  /**
   * Get column children for a table.
   */
  private async getColumnChildren(table: TableNode): Promise<BaseNode[]> {
    try {
      const columns = await this.schemaLoader.getColumns(table.schemaName, table.name);

      if (columns.length === 0) {
        return [new MessageNode('No columns')];
      }

      return columns.map(
        (col) =>
          new ColumnNode(
            col.column_name,
            col.data_type,
            col.is_nullable,
            col.table_name,
            col.schema_name
          )
      );
    } catch (err) {
      Logger.error('Failed to get columns', err);
      return [new MessageNode('Error loading columns', String(err))];
    }
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.unsubscribe();
    this._onDidChangeTreeData.dispose();
  }
}
