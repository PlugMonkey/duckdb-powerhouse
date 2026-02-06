import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

/** Secret storage keys */
const KEYS = {
  MOTHERDUCK_TOKEN: 'motherduck.token',
  S3_ACCESS_KEY: 's3.accessKey',
  S3_SECRET_KEY: 's3.secretKey',
} as const;

/** S3 credentials */
export interface S3Credentials {
  accessKey: string;
  secretKey: string;
}

/**
 * Manages secure credential storage using VS Code SecretStorage.
 * All sensitive data (tokens, passwords, keys) is stored securely.
 */
export class CredentialManager {
  private secrets: vscode.SecretStorage | null = null;

  /**
   * Initialize the credential manager with VS Code context.
   * Must be called before using any credential methods.
   */
  initialize(context: vscode.ExtensionContext): void {
    this.secrets = context.secrets;
    Logger.debug('CredentialManager initialized');
  }

  private ensureInitialized(): vscode.SecretStorage {
    if (!this.secrets) {
      throw new Error('CredentialManager not initialized. Call initialize() first.');
    }
    return this.secrets;
  }

  // ===== MotherDuck Token =====

  /**
   * Get the stored MotherDuck token.
   */
  async getMotherDuckToken(): Promise<string | undefined> {
    const secrets = this.ensureInitialized();
    return secrets.get(KEYS.MOTHERDUCK_TOKEN);
  }

  /**
   * Store the MotherDuck token securely.
   */
  async setMotherDuckToken(token: string): Promise<void> {
    const secrets = this.ensureInitialized();
    await secrets.store(KEYS.MOTHERDUCK_TOKEN, token);
    Logger.info('MotherDuck token stored');
  }

  /**
   * Delete the stored MotherDuck token.
   */
  async deleteMotherDuckToken(): Promise<void> {
    const secrets = this.ensureInitialized();
    await secrets.delete(KEYS.MOTHERDUCK_TOKEN);
    Logger.info('MotherDuck token deleted');
  }

  /**
   * Check if a MotherDuck token is stored.
   */
  async hasMotherDuckToken(): Promise<boolean> {
    const token = await this.getMotherDuckToken();
    return token !== undefined && token.length > 0;
  }

  // ===== PostgreSQL Password =====

  /**
   * Get the stored PostgreSQL password for a connection.
   * @param connName Unique connection name/identifier
   */
  async getPostgresPassword(connName: string): Promise<string | undefined> {
    const secrets = this.ensureInitialized();
    const key = `postgres.password.${connName}`;
    return secrets.get(key);
  }

  /**
   * Store a PostgreSQL password securely.
   * @param connName Unique connection name/identifier
   * @param password The password to store
   */
  async setPostgresPassword(connName: string, password: string): Promise<void> {
    const secrets = this.ensureInitialized();
    const key = `postgres.password.${connName}`;
    await secrets.store(key, password);
    Logger.info('PostgreSQL password stored', { connName });
  }

  /**
   * Delete a stored PostgreSQL password.
   * @param connName Unique connection name/identifier
   */
  async deletePostgresPassword(connName: string): Promise<void> {
    const secrets = this.ensureInitialized();
    const key = `postgres.password.${connName}`;
    await secrets.delete(key);
    Logger.info('PostgreSQL password deleted', { connName });
  }

  // ===== S3 Credentials =====

  /**
   * Get the stored S3 credentials.
   */
  async getS3Credentials(): Promise<S3Credentials | undefined> {
    const secrets = this.ensureInitialized();
    const accessKey = await secrets.get(KEYS.S3_ACCESS_KEY);
    const secretKey = await secrets.get(KEYS.S3_SECRET_KEY);

    if (!accessKey || !secretKey) {
      return undefined;
    }

    return { accessKey, secretKey };
  }

  /**
   * Store S3 credentials securely.
   */
  async setS3Credentials(accessKey: string, secretKey: string): Promise<void> {
    const secrets = this.ensureInitialized();
    await secrets.store(KEYS.S3_ACCESS_KEY, accessKey);
    await secrets.store(KEYS.S3_SECRET_KEY, secretKey);
    Logger.info('S3 credentials stored');
  }

  /**
   * Delete the stored S3 credentials.
   */
  async deleteS3Credentials(): Promise<void> {
    const secrets = this.ensureInitialized();
    await secrets.delete(KEYS.S3_ACCESS_KEY);
    await secrets.delete(KEYS.S3_SECRET_KEY);
    Logger.info('S3 credentials deleted');
  }

  /**
   * Check if S3 credentials are stored.
   */
  async hasS3Credentials(): Promise<boolean> {
    const creds = await this.getS3Credentials();
    return creds !== undefined;
  }
}

/** Singleton instance */
let instance: CredentialManager | null = null;

/**
 * Get the global CredentialManager instance.
 */
export function getCredentialManager(): CredentialManager {
  if (!instance) {
    instance = new CredentialManager();
  }
  return instance;
}

/**
 * Reset the global instance (for testing).
 */
export function resetCredentialManager(): void {
  instance = null;
}
