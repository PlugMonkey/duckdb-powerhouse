import * as vscode from 'vscode';
import { Database, Connection, RowData, TableData } from 'duckdb-async';

import {
  ConnectionConfig,
  ConnectionState,
  ConnectionType,
  MotherDuckConnectionConfig,
  PostgresConnectionConfig,
  S3ConnectionConfig,
} from '../types';
import { Logger } from '../utils/logger';
import { ExtensionLoader } from './extension-loader';
import { CredentialManager, getCredentialManager } from './credentials';

/** Storage key for connection history */
const CONNECTION_HISTORY_KEY = 'connectionHistory';

/** Maximum number of connections to store in history */
const MAX_HISTORY_SIZE = 10;

/**
 * Manages DuckDB database connections.
 * Provides a singleton-like pattern for the active connection.
 */
export class ConnectionManager {
  private database: Database | null = null;
  private connection: Connection | null = null;
  private config: ConnectionConfig | null = null;
  private _state: ConnectionState = 'disconnected';
  private _lastConfig: ConnectionConfig | null = null;
  private globalState: vscode.Memento | null = null;
  private extensionLoader = new ExtensionLoader();
  private credentialManager: CredentialManager | null = null;

  private readonly stateChangeListeners: Set<(state: ConnectionState) => void> = new Set();

  /**
   * Initialize the connection manager with VS Code extension context.
   * This enables connection history persistence and credential storage.
   */
  initialize(context: vscode.ExtensionContext): void {
    this.globalState = context.globalState;
    this.credentialManager = getCredentialManager();
    this.credentialManager.initialize(context);
  }

  /**
   * Get the credential manager instance.
   * @throws Error if not initialized
   */
  getCredentialManager(): CredentialManager {
    if (!this.credentialManager) {
      throw new Error('ConnectionManager not initialized. Call initialize() first.');
    }
    return this.credentialManager;
  }

  /**
   * Current connection state
   */
  get state(): ConnectionState {
    return this._state;
  }

  /**
   * Get the last used connection config (for reconnect)
   */
  get lastConfig(): ConnectionConfig | null {
    return this._lastConfig;
  }

  /**
   * Whether there is an active connection
   */
  get isConnected(): boolean {
    return this._state === 'connected' && this.connection !== null;
  }

  /**
   * Current connection configuration
   */
  get currentConfig(): ConnectionConfig | null {
    return this.config;
  }

  /**
   * Get the active database connection for executing queries.
   * @throws Error if not connected
   */
  getConnection(): Connection {
    if (!this.connection) {
      throw new Error('No active database connection. Please connect first.');
    }
    return this.connection;
  }

  /**
   * Get the underlying Database instance.
   * @throws Error if not connected
   */
  getDatabase(): Database {
    if (!this.database) {
      throw new Error('No active database. Please connect first.');
    }
    return this.database;
  }

  /**
   * Register a listener for connection state changes
   */
  onStateChange(listener: (state: ConnectionState) => void): () => void {
    this.stateChangeListeners.add(listener);
    return () => this.stateChangeListeners.delete(listener);
  }

  private setState(state: ConnectionState): void {
    this._state = state;
    this.stateChangeListeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        Logger.error('State change listener error', err);
      }
    });
  }

  /**
   * Create a new in-memory database connection
   */
  async connectInMemory(name = 'In-Memory'): Promise<void> {
    await this.connect({
      type: 'memory',
      name,
    });
  }

  /**
   * Open a file-based database connection
   * @param path Path to the .duckdb file
   * @param name Optional display name
   */
  async connectToFile(path: string, name?: string): Promise<void> {
    await this.connect({
      type: 'file',
      path,
      name: name ?? path.split('/').pop() ?? path,
    });
  }

  /**
   * Connect to a database with the given configuration
   */
  async connect(config: ConnectionConfig): Promise<void> {
    // Close existing connection if any
    if (this.isConnected) {
      await this.disconnect();
    }

    this.setState('connecting');
    Logger.info('Connecting to database', { type: config.type, name: config.name });

    try {
      switch (config.type) {
        case 'memory':
          await this.connectMemoryInternal();
          break;
        case 'file':
          await this.connectFileInternal(config.path);
          break;
        case 'motherduck':
          await this.connectMotherDuckInternal(config);
          break;
        case 'postgres':
          await this.connectPostgresInternal(config);
          break;
        case 's3':
          await this.connectS3Internal(config);
          break;
        default:
          throw new Error(`Unknown connection type: ${(config as ConnectionConfig).type}`);
      }

      this.config = config;
      this._lastConfig = config;

      // Add to history
      await this.addToHistory(config);

      this.setState('connected');
      Logger.info('Connected successfully', { type: config.type, name: config.name });
    } catch (err) {
      this.setState('error');
      this.database = null;
      this.connection = null;
      this.config = null;

      const message = err instanceof Error ? err.message : String(err);
      Logger.error('Connection failed', { type: config.type, error: message });
      throw new Error(`Failed to connect: ${message}`);
    }
  }

  /**
   * Connect to an in-memory database
   */
  private async connectMemoryInternal(): Promise<void> {
    this.database = await Database.create(':memory:');
    this.connection = await this.database.connect();
  }

  /**
   * Connect to a file-based database
   */
  private async connectFileInternal(path: string): Promise<void> {
    if (!path) {
      throw new Error('Database path is required for file-based connections');
    }
    this.database = await Database.create(path);
    this.connection = await this.database.connect();
  }

  /**
   * Connect to MotherDuck cloud data warehouse
   */
  private async connectMotherDuckInternal(config: MotherDuckConnectionConfig): Promise<void> {
    const creds = this.getCredentialManager();
    const token = await creds.getMotherDuckToken();

    if (!token) {
      throw new Error('MotherDuck token not configured. Please set up your token first.');
    }

    this.database = await Database.create(':memory:');
    this.connection = await this.database.connect();

    await this.extensionLoader.loadMotherDuck(this.connection);
    await this.connection.run(`SET motherduck_token='${this.escapeValue(token)}'`);

    const dbName = config.database ? this.escapeValue(config.database) : '';
    await this.connection.run(`ATTACH 'md:${dbName}'`);
  }

  /**
   * Connect to a PostgreSQL database
   */
  private async connectPostgresInternal(config: PostgresConnectionConfig): Promise<void> {
    const creds = this.getCredentialManager();
    const password = await creds.getPostgresPassword(config.name);

    if (!password) {
      throw new Error('PostgreSQL password not configured. Please set up credentials first.');
    }

    this.database = await Database.create(':memory:');
    this.connection = await this.database.connect();

    await this.extensionLoader.loadPostgres(this.connection);

    // Build connection string with proper escaping
    const connStr = `postgresql://${encodeURIComponent(config.user)}:${encodeURIComponent(password)}@${config.host}:${config.port}/${config.database}`;
    await this.connection.run(`ATTACH '${this.escapeValue(connStr)}' AS pg (TYPE postgres)`);
  }

  /**
   * Connect to S3/cloud storage
   */
  private async connectS3Internal(config: S3ConnectionConfig): Promise<void> {
    this.database = await Database.create(':memory:');
    this.connection = await this.database.connect();

    await this.extensionLoader.loadS3(this.connection, config.useIamAuth);

    await this.connection.run(`SET s3_region='${this.escapeValue(config.region)}'`);

    if (!config.useIamAuth) {
      const creds = this.getCredentialManager();
      const s3Creds = await creds.getS3Credentials();

      if (!s3Creds) {
        throw new Error('S3 credentials not configured. Please set up your access keys first.');
      }

      await this.connection.run(`SET s3_access_key_id='${this.escapeValue(s3Creds.accessKey)}'`);
      await this.connection.run(`SET s3_secret_access_key='${this.escapeValue(s3Creds.secretKey)}'`);
    }
  }

  /**
   * Escape a value for use in SQL SET statements
   */
  private escapeValue(value: string): string {
    return value.replace(/'/g, "''");
  }

  /**
   * Close the current database connection
   */
  async disconnect(): Promise<void> {
    if (!this.database) {
      return;
    }

    Logger.info('Disconnecting from database', { name: this.config?.name });

    try {
      // Connection is automatically closed when database is closed
      await this.database.close();
    } catch (err) {
      Logger.error('Error during disconnect', err);
    } finally {
      this.database = null;
      this.connection = null;
      this.config = null;
      this.extensionLoader.reset();
      this.setState('disconnected');
    }
  }

  /**
   * Execute a SQL query and return results
   */
  async execute(sql: string): Promise<TableData> {
    const conn = this.getConnection();
    const startTime = performance.now();

    try {
      const results = await conn.all(sql);
      const elapsed = performance.now() - startTime;
      Logger.debug('Query executed', { sql: sql.slice(0, 100), rowCount: results.length, timeMs: elapsed.toFixed(2) });
      return results;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Logger.error('Query execution failed', { sql: sql.slice(0, 200), error: message });
      throw err;
    }
  }

  /**
   * Execute a SQL query and stream results row by row
   */
  async *stream(sql: string): AsyncGenerator<RowData> {
    const conn = this.getConnection();

    try {
      const stream = conn.stream(sql);
      for await (const row of stream) {
        yield row;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Logger.error('Stream query failed', { sql: sql.slice(0, 200), error: message });
      throw err;
    }
  }

  /**
   * Get connection type display string
   */
  getTypeDisplay(): string {
    if (!this.config) return 'Not connected';
    const labels: Record<ConnectionType, string> = {
      memory: 'In-Memory',
      file: 'File',
      motherduck: 'MotherDuck',
      postgres: 'PostgreSQL',
      s3: 'S3',
    };
    return labels[this.config.type];
  }

  /**
   * Reconnect to the last used connection.
   * @throws Error if no previous connection exists
   */
  async reconnect(): Promise<void> {
    if (!this._lastConfig) {
      throw new Error('No previous connection to reconnect to');
    }
    await this.connect(this._lastConfig);
  }

  /**
   * Get connection history from global state.
   */
  getHistory(): ConnectionConfig[] {
    if (!this.globalState) {
      return [];
    }
    return this.globalState.get<ConnectionConfig[]>(CONNECTION_HISTORY_KEY, []);
  }

  /**
   * Add a connection config to history.
   */
  private async addToHistory(config: ConnectionConfig): Promise<void> {
    if (!this.globalState) {
      return;
    }

    const history = this.getHistory();

    // Remove duplicate entries (same type and identifying properties)
    const filtered = history.filter((h) => !this.isSameConnection(h, config));

    // Add new entry at the beginning
    filtered.unshift(config);

    // Trim to max size
    const trimmed = filtered.slice(0, MAX_HISTORY_SIZE);

    await this.globalState.update(CONNECTION_HISTORY_KEY, trimmed);
    Logger.debug('Connection history updated', { count: trimmed.length });
  }

  /**
   * Check if two connections are the same based on type-specific properties.
   */
  private isSameConnection(a: ConnectionConfig, b: ConnectionConfig): boolean {
    if (a.type !== b.type || a.name !== b.name) {
      return false;
    }

    switch (a.type) {
      case 'memory':
        return true;
      case 'file':
        return a.path === (b as typeof a).path;
      case 'motherduck':
        return a.database === (b as typeof a).database;
      case 'postgres': {
        const bPostgres = b as typeof a;
        return a.host === bPostgres.host && a.port === bPostgres.port && a.database === bPostgres.database;
      }
      case 's3': {
        const bS3 = b as typeof a;
        return a.region === bS3.region && a.bucket === bS3.bucket;
      }
      default:
        return false;
    }
  }

  /**
   * Clear connection history.
   */
  async clearHistory(): Promise<void> {
    if (!this.globalState) {
      return;
    }
    await this.globalState.update(CONNECTION_HISTORY_KEY, []);
    Logger.info('Connection history cleared');
  }

  /**
   * Dispose of all resources
   */
  async dispose(): Promise<void> {
    await this.disconnect();
    this.stateChangeListeners.clear();
  }
}

/** Singleton instance for the active connection */
let instance: ConnectionManager | null = null;

/**
 * Get the global ConnectionManager instance
 */
export function getConnectionManager(): ConnectionManager {
  if (!instance) {
    instance = new ConnectionManager();
  }
  return instance;
}

/**
 * Reset the global instance (for testing)
 */
export function resetConnectionManager(): void {
  void instance?.dispose();
  instance = null;
}
