import { Connection } from 'duckdb-async';

import { Logger } from '../utils/logger';

/** DuckDB extensions we support loading */
export type DuckDBExtension = 'motherduck' | 'postgres' | 'httpfs' | 'aws';

/**
 * Manages DuckDB extension loading.
 * Tracks which extensions have been loaded to avoid redundant INSTALL/LOAD calls.
 */
export class ExtensionLoader {
  private loadedExtensions: Set<DuckDBExtension> = new Set();

  /**
   * Ensure an extension is installed and loaded.
   * @param conn Active DuckDB connection
   * @param ext Extension name to load
   */
  async ensureExtension(conn: Connection, ext: DuckDBExtension): Promise<void> {
    if (this.loadedExtensions.has(ext)) {
      Logger.debug(`Extension ${ext} already loaded, skipping`);
      return;
    }

    try {
      Logger.info(`Installing and loading extension: ${ext}`);
      await conn.run(`INSTALL ${ext}`);
      await conn.run(`LOAD ${ext}`);
      this.loadedExtensions.add(ext);
      Logger.info(`Extension ${ext} loaded successfully`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Logger.error(`Failed to load extension ${ext}`, { error: message });
      throw new Error(`Failed to load ${ext} extension. This may require a newer DuckDB version. Error: ${message}`);
    }
  }

  /**
   * Load the MotherDuck extension for cloud data warehouse access.
   */
  async loadMotherDuck(conn: Connection): Promise<void> {
    await this.ensureExtension(conn, 'motherduck');
  }

  /**
   * Load the PostgreSQL extension for external Postgres database access.
   */
  async loadPostgres(conn: Connection): Promise<void> {
    await this.ensureExtension(conn, 'postgres');
  }

  /**
   * Load S3/HTTP file system extensions.
   * @param conn Active DuckDB connection
   * @param useIam If true, also loads the aws extension for IAM authentication
   */
  async loadS3(conn: Connection, useIam: boolean): Promise<void> {
    await this.ensureExtension(conn, 'httpfs');

    if (useIam) {
      await this.ensureExtension(conn, 'aws');
    }
  }

  /**
   * Reset loaded extensions tracking.
   * Call this when disconnecting to ensure extensions are reloaded on reconnect.
   */
  reset(): void {
    this.loadedExtensions.clear();
    Logger.debug('ExtensionLoader reset');
  }

  /**
   * Check if an extension is currently loaded.
   */
  isLoaded(ext: DuckDBExtension): boolean {
    return this.loadedExtensions.has(ext);
  }

  /**
   * Get list of currently loaded extensions.
   */
  getLoadedExtensions(): DuckDBExtension[] {
    return Array.from(this.loadedExtensions);
  }
}
