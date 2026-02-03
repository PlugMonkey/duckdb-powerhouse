import * as vscode from 'vscode';
import { Database, Connection, RowData, TableData } from 'duckdb-async';

import { ConnectionConfig, ConnectionState } from '../types';
import { Logger } from '../utils/logger';

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

  private readonly stateChangeListeners: Set<(state: ConnectionState) => void> = new Set();

  /**
   * Initialize the connection manager with VS Code extension context.
   * This enables connection history persistence.
   */
  initialize(context: vscode.ExtensionContext): void {
    this.globalState = context.globalState;
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
      // Create database instance
      const dbPath = config.type === 'memory' ? ':memory:' : config.path;
      if (!dbPath) {
        throw new Error('Database path is required for file-based connections');
      }

      this.database = await Database.create(dbPath);
      this.connection = await this.database.connect();
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
      Logger.error('Connection failed', { config, error: message });
      throw new Error(`Failed to connect: ${message}`);
    }
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
    return this.config.type === 'memory' ? 'In-Memory' : 'File';
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

    // Remove duplicate entries (same type and path)
    const filtered = history.filter(
      (h) => !(h.type === config.type && h.path === config.path && h.name === config.name)
    );

    // Add new entry at the beginning
    filtered.unshift(config);

    // Trim to max size
    const trimmed = filtered.slice(0, MAX_HISTORY_SIZE);

    await this.globalState.update(CONNECTION_HISTORY_KEY, trimmed);
    Logger.debug('Connection history updated', { count: trimmed.length });
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
