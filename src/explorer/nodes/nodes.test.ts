import { describe, it, expect } from 'vitest';

import { MessageNode } from './base';
import { DatabaseNode } from './database';
import { SchemaNode } from './schema';
import { TableNode } from './table';
import { ColumnNode } from './column';

describe('Explorer Nodes', () => {
  describe('MessageNode', () => {
    it('should create message node with text', () => {
      const node = new MessageNode('Test message');
      expect(node.label).toBe('Test message');
      expect(node.nodeType).toBe('message');
    });

    it('should support optional description', () => {
      const node = new MessageNode('Test', 'Description');
      expect(node.description).toBe('Description');
    });
  });

  describe('DatabaseNode', () => {
    it('should create node for in-memory database', () => {
      const node = new DatabaseNode('Test DB');
      expect(node.label).toBe('Test DB');
      expect(node.name).toBe('Test DB');
      expect(node.path).toBeUndefined();
      expect(node.description).toBe('in-memory');
      expect(node.nodeType).toBe('database');
    });

    it('should create node for file database', () => {
      const node = new DatabaseNode('Test DB', '/path/to/db.duckdb');
      expect(node.path).toBe('/path/to/db.duckdb');
      expect(node.description).toBe('file');
    });

    it('should have expanded collapsible state', () => {
      const node = new DatabaseNode('Test');
      expect(node.collapsibleState).toBe(2); // TreeItemCollapsibleState.Expanded
    });

    it('should have database context value', () => {
      const node = new DatabaseNode('Test');
      expect(node.contextValue).toBe('database');
    });
  });

  describe('SchemaNode', () => {
    it('should create schema node', () => {
      const node = new SchemaNode('main', 'Test DB');
      expect(node.label).toBe('main');
      expect(node.name).toBe('main');
      expect(node.databaseName).toBe('Test DB');
      expect(node.nodeType).toBe('schema');
    });

    it('should have collapsed collapsible state', () => {
      const node = new SchemaNode('main', 'Test');
      expect(node.collapsibleState).toBe(1); // TreeItemCollapsibleState.Collapsed
    });

    it('should have schema context value', () => {
      const node = new SchemaNode('main', 'Test');
      expect(node.contextValue).toBe('schema');
    });
  });

  describe('TableNode', () => {
    it('should create table node', () => {
      const node = new TableNode('users', 'main');
      expect(node.label).toBe('users');
      expect(node.name).toBe('users');
      expect(node.schemaName).toBe('main');
      expect(node.nodeType).toBe('table');
    });

    it('should display row count when provided', () => {
      const node = new TableNode('users', 'main', 1000);
      expect(node.rowCount).toBe(1000);
      expect(node.description).toBe('1,000 rows');
    });

    it('should not display row count when not provided', () => {
      const node = new TableNode('users', 'main');
      expect(node.rowCount).toBeUndefined();
      expect(node.description).toBeUndefined();
    });

    it('should have collapsed collapsible state', () => {
      const node = new TableNode('users', 'main');
      expect(node.collapsibleState).toBe(1); // TreeItemCollapsibleState.Collapsed
    });

    it('should have table context value', () => {
      const node = new TableNode('users', 'main');
      expect(node.contextValue).toBe('table');
    });

    it('should generate qualified name', () => {
      const node = new TableNode('users', 'main');
      expect(node.qualifiedName).toBe('"main"."users"');
    });

    it('should handle schema with special characters in qualified name', () => {
      const node = new TableNode('user-data', 'my-schema');
      expect(node.qualifiedName).toBe('"my-schema"."user-data"');
    });
  });

  describe('ColumnNode', () => {
    it('should create column node', () => {
      const node = new ColumnNode('id', 'INTEGER', false, 'users', 'main');
      expect(node.label).toBe('id');
      expect(node.name).toBe('id');
      expect(node.dataType).toBe('INTEGER');
      expect(node.nullable).toBe(false);
      expect(node.tableName).toBe('users');
      expect(node.schemaName).toBe('main');
      expect(node.nodeType).toBe('column');
    });

    it('should show NOT NULL in description for non-nullable', () => {
      const node = new ColumnNode('id', 'INTEGER', false, 'users', 'main');
      expect(node.description).toBe('INTEGER NOT NULL');
    });

    it('should not show NOT NULL for nullable columns', () => {
      const node = new ColumnNode('name', 'VARCHAR', true, 'users', 'main');
      expect(node.description).toBe('VARCHAR');
    });

    it('should have none collapsible state', () => {
      const node = new ColumnNode('id', 'INTEGER', false, 'users', 'main');
      expect(node.collapsibleState).toBe(0); // TreeItemCollapsibleState.None
    });

    it('should have column context value', () => {
      const node = new ColumnNode('id', 'INTEGER', false, 'users', 'main');
      expect(node.contextValue).toBe('column');
    });

    it('should get number icon for integer types', () => {
      const node = new ColumnNode('id', 'INTEGER', false, 'users', 'main');
      expect(node.iconPath).toBeDefined();
    });

    it('should get string icon for varchar types', () => {
      const node = new ColumnNode('name', 'VARCHAR', true, 'users', 'main');
      expect(node.iconPath).toBeDefined();
    });

    it('should get boolean icon for bool types', () => {
      const node = new ColumnNode('active', 'BOOLEAN', false, 'users', 'main');
      expect(node.iconPath).toBeDefined();
    });

    it('should get calendar icon for date types', () => {
      const node = new ColumnNode('created_at', 'TIMESTAMP', false, 'users', 'main');
      expect(node.iconPath).toBeDefined();
    });
  });
});
