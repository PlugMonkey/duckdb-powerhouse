import * as vscode from 'vscode';

import { CONFIG_KEYS, DEFAULTS, EXTENSION_ID } from '../constants';

/**
 * Get a configuration value with type safety
 */
function getConfig<T>(key: string, defaultValue: T): T {
  return vscode.workspace.getConfiguration(EXTENSION_ID).get(key, defaultValue);
}

/**
 * Typed configuration accessor for extension settings.
 * All settings are defined in package.json under contributes.configuration.
 */
export const config = {
  /**
   * Maximum number of rows to display in results panel.
   * Rows beyond this limit will be paginated.
   */
  get maxResultRows(): number {
    return getConfig(CONFIG_KEYS.MAX_RESULT_ROWS, DEFAULTS.MAX_RESULT_ROWS);
  },

  /**
   * Custom path to DuckDB binary.
   * If empty, uses the bundled version from duckdb-async.
   */
  get duckdbPath(): string | undefined {
    const path = getConfig(CONFIG_KEYS.DUCKDB_PATH, '');
    return path || undefined;
  },

  /**
   * Default LIMIT applied to preview queries.
   */
  get defaultResultLimit(): number {
    return getConfig(CONFIG_KEYS.DEFAULT_RESULT_LIMIT, DEFAULTS.DEFAULT_RESULT_LIMIT);
  },

  /**
   * Automatically create in-memory connection on startup.
   */
  get autoConnect(): boolean {
    return getConfig(CONFIG_KEYS.AUTO_CONNECT, false);
  },

  /**
   * Show row numbers in results panel.
   */
  get showRowNumbers(): boolean {
    return getConfig(CONFIG_KEYS.SHOW_ROW_NUMBERS, true);
  },

  /**
   * Confirm before fetching large result sets.
   */
  get confirmLargeResults(): boolean {
    return getConfig(CONFIG_KEYS.CONFIRM_LARGE_RESULTS, true);
  },

  /**
   * Query execution timeout in seconds.
   * 0 means no timeout.
   */
  get queryTimeout(): number {
    return getConfig(CONFIG_KEYS.QUERY_TIMEOUT, 0);
  },
};

/**
 * Update a configuration value
 */
export async function updateConfig<T>(
  key: string,
  value: T,
  target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
): Promise<void> {
  await vscode.workspace.getConfiguration(EXTENSION_ID).update(key, value, target);
}
