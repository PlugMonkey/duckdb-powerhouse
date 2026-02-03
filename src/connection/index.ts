/**
 * Connection management module
 *
 * Handles DuckDB database connections, including:
 * - In-memory databases
 * - File-based databases (.duckdb)
 * - Connection lifecycle management
 * - Status bar integration
 * - Connection history
 */

export { ConnectionManager, getConnectionManager, resetConnectionManager } from './manager';
export { ConnectionStatusBar } from './status-bar';
export { showConnectionMenu, quickConnectInMemory, disconnect, reconnect } from './commands';
