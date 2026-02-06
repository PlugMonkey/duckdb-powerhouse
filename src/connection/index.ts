/**
 * Connection management module
 *
 * Handles DuckDB database connections, including:
 * - In-memory databases
 * - File-based databases (.duckdb)
 * - MotherDuck cloud connections
 * - PostgreSQL external connections
 * - S3/cloud storage connections
 * - Connection lifecycle management
 * - Status bar integration
 * - Connection history
 * - Secure credential storage
 */

export { ConnectionManager, getConnectionManager, resetConnectionManager } from './manager';
export { ConnectionStatusBar } from './status-bar';
export {
  showConnectionMenu,
  quickConnectInMemory,
  disconnect,
  reconnect,
  createMotherDuckConnection,
  createPostgresConnection,
  createS3Connection,
  showCredentialsMenu,
} from './commands';
export { CredentialManager, getCredentialManager, resetCredentialManager } from './credentials';
export { ExtensionLoader, type DuckDBExtension } from './extension-loader';
