import * as vscode from 'vscode';

import { QueryExecutionResult } from '../editor/commands';
import { formatAsCsv, formatAsJson, formatAsTsv } from '../export';
import { config } from '../utils/config';
import { Logger } from '../utils/logger';
import { serializeResult, WebviewResultData } from './serializer';
import { getWebviewContent } from './webview-content';

/**
 * Manages the results panel webview.
 */
export class ResultsPanel {
  private static instance: ResultsPanel | undefined;
  private panel: vscode.WebviewPanel | undefined;
  private results: WebviewResultData[] = [];
  private readonly maxResults = 10; // Keep last 10 results

  private constructor(private readonly extensionUri: vscode.Uri) {}

  /**
   * Get or create the singleton ResultsPanel instance.
   */
  static getInstance(extensionUri: vscode.Uri): ResultsPanel {
    if (!ResultsPanel.instance) {
      ResultsPanel.instance = new ResultsPanel(extensionUri);
    }
    return ResultsPanel.instance;
  }

  /**
   * Show a query result in the panel.
   */
  showResult(result: QueryExecutionResult): void {
    let data: WebviewResultData;
    try {
      data = serializeResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Logger.error('Failed to serialize result', { error: message });
      void vscode.window.showErrorMessage(`Failed to display results: ${message}`);
      return;
    }

    this.results.unshift(data);
    if (this.results.length > this.maxResults) {
      this.results = this.results.slice(0, this.maxResults);
    }

    this.ensurePanel();
    this.updateContent();
    this.panel?.reveal(vscode.ViewColumn.Two, true);
  }

  /**
   * Ensure the webview panel exists.
   */
  private ensurePanel(): void {
    if (this.panel) {
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'duckdbResults',
      'DuckDB Results',
      {
        viewColumn: vscode.ViewColumn.Two,
        preserveFocus: true,
      },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.extensionUri],
      }
    );

    this.panel.iconPath = new vscode.ThemeIcon('table');

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      (message: WebviewMessage) => {
        this.handleMessage(message);
      },
      undefined,
      []
    );

    // Handle panel disposal
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    Logger.info('Results panel created');
  }

  /**
   * Update the webview content.
   */
  private updateContent(): void {
    if (!this.panel) {
      return;
    }

    const currentResult = this.results[0];

    // Build history items for dropdown
    const historyItems = this.results.map(r => ({
      id: r.id,
      sql: r.sql,
      rowCount: r.rowCount,
      timestamp: r.timestamp,
      error: r.error,
    }));

    let html: string;
    try {
      html = getWebviewContent(
        this.panel.webview,
        this.extensionUri,
        currentResult,
        historyItems,
        { showRowNumbers: config.showRowNumbers }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Logger.error('Failed to generate results HTML', { error: message });
      void vscode.window.showErrorMessage(`Failed to display results: ${message}`);
      return;
    }

    this.panel.webview.html = html;

    // Update title with row count
    if (currentResult) {
      if (currentResult.error) {
        this.panel.title = 'DuckDB Results (Error)';
      } else {
        this.panel.title = `DuckDB Results (${currentResult.rowCount} rows)`;
      }
    }
  }

  /**
   * Handle messages from the webview.
   */
  private handleMessage(message: WebviewMessage): void {
    switch (message.command) {
      case 'copyCell':
        if (message.value !== undefined) {
          void vscode.env.clipboard.writeText(String(message.value));
          void vscode.window.showInformationMessage('Copied to clipboard');
        }
        break;

      case 'copyRow':
        if (message.row !== undefined) {
          const result = this.results[0];
          const row = result?.rows[message.row];
          if (row) {
            const values = row.map((cell) => cell.display);
            void vscode.env.clipboard.writeText(values.join('\t'));
            void vscode.window.showInformationMessage('Row copied to clipboard');
          }
        }
        break;

      case 'copyAll':
        this.copyAllResults();
        break;

      case 'exportCsv':
        void this.exportToCsv();
        break;

      case 'exportJson':
        void this.exportToJson();
        break;

      case 'exportTsv':
        void this.exportToTsv();
        break;

      case 'switchResult':
        if (message.index !== undefined && this.results[message.index]) {
          // Move the selected result to the front
          const selected = this.results.splice(message.index, 1)[0];
          if (selected) {
            this.results.unshift(selected);
            this.updateContent();
          }
        }
        break;

      case 'clearResults':
        this.results = [];
        this.updateContent();
        break;

      default:
        Logger.warn('Unknown webview message', message);
    }
  }

  /**
   * Copy all results to clipboard.
   */
  private copyAllResults(): void {
    const result = this.results[0];
    if (!result) {
      return;
    }

    const tsv = formatAsTsv(result);
    void vscode.env.clipboard.writeText(tsv);
    void vscode.window.showInformationMessage(
      `Copied ${result.rowCount} rows to clipboard`
    );
  }

  /**
   * Export results to CSV file.
   */
  private async exportToCsv(): Promise<void> {
    const result = this.results[0];
    if (!result) {
      return;
    }

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('query-results.csv'),
      filters: { 'CSV Files': ['csv'] },
    });

    if (!uri) {
      return;
    }

    const content = formatAsCsv(result);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
    void vscode.window.showInformationMessage(`Exported ${result.rowCount} rows to CSV`);
  }

  /**
   * Export results to JSON file.
   */
  private async exportToJson(): Promise<void> {
    const result = this.results[0];
    if (!result) {
      return;
    }

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('query-results.json'),
      filters: { 'JSON Files': ['json'] },
    });

    if (!uri) {
      return;
    }

    const content = formatAsJson(result);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
    void vscode.window.showInformationMessage(`Exported ${result.rowCount} rows to JSON`);
  }

  /**
   * Export results to TSV file.
   */
  private async exportToTsv(): Promise<void> {
    const result = this.results[0];
    if (!result) {
      return;
    }

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('query-results.tsv'),
      filters: { 'TSV Files': ['tsv'] },
    });

    if (!uri) {
      return;
    }

    const content = formatAsTsv(result);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
    void vscode.window.showInformationMessage(`Exported ${result.rowCount} rows to TSV`);
  }

  /**
   * Clear all results.
   */
  clearResults(): void {
    this.results = [];
    this.updateContent();
  }

  /**
   * Get the last query result (for export operations).
   */
  getLastResult(): { sql: string; error?: string } | undefined {
    const result = this.results[0];
    if (!result) {
      return undefined;
    }
    return {
      sql: result.sql,
      error: result.error,
    };
  }

  /**
   * Dispose of the panel.
   */
  dispose(): void {
    this.panel?.dispose();
    this.panel = undefined;
    ResultsPanel.instance = undefined;
  }
}

/**
 * Messages from the webview.
 */
interface WebviewMessage {
  command: string;
  value?: unknown;
  row?: number;
  index?: number;
}
