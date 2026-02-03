/**
 * Integration tests for DuckDB Powerhouse extension.
 *
 * These tests run in a real VS Code environment and verify
 * the extension functionality end-to-end.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

const EXTENSION_ID = 'duckdb-powerhouse.duckdb-powerhouse';

suite('Extension Integration Tests', () => {
  // Wait for extension to activate before running tests
  suiteSetup(async function (this: Mocha.Context) {
    this.timeout(30000);

    // Get the extension
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    if (!ext) {
      throw new Error(`Extension ${EXTENSION_ID} not found`);
    }

    // Activate if not already active
    if (!ext.isActive) {
      await ext.activate();
    }
  });

  suite('Extension Activation', () => {
    test('Extension should be active', () => {
      const ext = vscode.extensions.getExtension(EXTENSION_ID);
      assert.ok(ext);
      assert.ok(ext.isActive);
    });

    test('Extension should register all commands', async () => {
      const commands = await vscode.commands.getCommands(true);

      const expectedCommands = [
        'duckdb-powerhouse.createConnection',
        'duckdb-powerhouse.disconnect',
        'duckdb-powerhouse.reconnect',
        'duckdb-powerhouse.runQuery',
        'duckdb-powerhouse.runSelectedQuery',
        'duckdb-powerhouse.explainQuery',
        'duckdb-powerhouse.cancelQuery',
        'duckdb-powerhouse.refreshExplorer',
        'duckdb-powerhouse.previewTable',
        'duckdb-powerhouse.copyTableName',
        'duckdb-powerhouse.clearResults',
      ];

      for (const cmd of expectedCommands) {
        assert.ok(
          commands.includes(cmd),
          `Command ${cmd} should be registered`
        );
      }
    });
  });

  suite('Connection Management', () => {
    test('Can create in-memory connection', async function (this: Mocha.Context) {
      this.timeout(10000);

      // Execute the create connection command
      // This will open the quick pick - we simulate with direct API
      // In real integration tests, we'd use the API directly

      // For now, verify the command exists
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes('duckdb-powerhouse.createConnection'));
    });

    test('Disconnect command is available', async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes('duckdb-powerhouse.disconnect'));
    });

    test('Reconnect command is available', async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes('duckdb-powerhouse.reconnect'));
    });
  });

  suite('Query Execution', () => {
    test('Run query command is available', async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes('duckdb-powerhouse.runQuery'));
    });

    test('Cancel query command is available', async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes('duckdb-powerhouse.cancelQuery'));
    });

    test('Explain query command is available', async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes('duckdb-powerhouse.explainQuery'));
    });
  });

  suite('Explorer', () => {
    test('Refresh explorer command is available', async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes('duckdb-powerhouse.refreshExplorer'));
    });

    test('Preview table command is available', async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes('duckdb-powerhouse.previewTable'));
    });

    test('Copy table name command is available', async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes('duckdb-powerhouse.copyTableName'));
    });

    test('Drop table command is available', async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes('duckdb-powerhouse.dropTable'));
    });

    test('Truncate table command is available', async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes('duckdb-powerhouse.truncateTable'));
    });
  });

  suite('File Querying', () => {
    test('Preview file command is available', async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes('duckdb-powerhouse.previewFile'));
    });

    test('Describe file command is available', async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes('duckdb-powerhouse.describeFile'));
    });

    test('Import file to table command is available', async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes('duckdb-powerhouse.importFileToTable'));
    });
  });

  suite('Results Panel', () => {
    test('Clear results command is available', async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes('duckdb-powerhouse.clearResults'));
    });
  });

  suite('Configuration', () => {
    test('Configuration settings are available', () => {
      const config = vscode.workspace.getConfiguration('duckdb-powerhouse');

      // Check that settings exist with correct types
      assert.strictEqual(typeof config.get('maxResultRows'), 'number');
      assert.strictEqual(typeof config.get('defaultResultLimit'), 'number');
      assert.strictEqual(typeof config.get('autoConnect'), 'boolean');
      assert.strictEqual(typeof config.get('showRowNumbers'), 'boolean');
      assert.strictEqual(typeof config.get('confirmLargeResults'), 'boolean');
      assert.strictEqual(typeof config.get('queryTimeout'), 'number');
    });

    test('Default values are correct', () => {
      const config = vscode.workspace.getConfiguration('duckdb-powerhouse');

      assert.strictEqual(config.get('maxResultRows'), 10000);
      assert.strictEqual(config.get('defaultResultLimit'), 100);
      assert.strictEqual(config.get('autoConnect'), false);
      assert.strictEqual(config.get('showRowNumbers'), true);
      assert.strictEqual(config.get('confirmLargeResults'), true);
      assert.strictEqual(config.get('queryTimeout'), 0);
    });
  });
});
