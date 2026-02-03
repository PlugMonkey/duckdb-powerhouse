import * as vscode from 'vscode';

import { EXTENSION_NAME } from '../constants';

/**
 * Centralized logging utility using VS Code's OutputChannel.
 * All logs are visible in Output panel under "DuckDB Powerhouse".
 */
class LoggerService {
  private outputChannel: vscode.OutputChannel | null = null;

  private getChannel(): vscode.OutputChannel {
    if (!this.outputChannel) {
      this.outputChannel = vscode.window.createOutputChannel(EXTENSION_NAME);
    }
    return this.outputChannel;
  }

  private formatMessage(level: string, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    let formatted = `[${timestamp}] [${level}] ${message}`;

    if (data !== undefined) {
      try {
        const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
        formatted += `\n${dataStr}`;
      } catch {
        formatted += '\n[Unable to serialize data]';
      }
    }

    return formatted;
  }

  /**
   * Log informational message
   */
  info(message: string, data?: unknown): void {
    this.getChannel().appendLine(this.formatMessage('INFO', message, data));
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: unknown): void {
    this.getChannel().appendLine(this.formatMessage('WARN', message, data));
  }

  /**
   * Log error message
   */
  error(message: string, data?: unknown): void {
    this.getChannel().appendLine(this.formatMessage('ERROR', message, data));
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, data?: unknown): void {
    // Could check for debug mode here
    this.getChannel().appendLine(this.formatMessage('DEBUG', message, data));
  }

  /**
   * Show the output channel
   */
  show(): void {
    this.getChannel().show();
  }

  /**
   * Dispose of the output channel
   */
  dispose(): void {
    this.outputChannel?.dispose();
    this.outputChannel = null;
  }
}

/** Singleton logger instance */
export const Logger = new LoggerService();
