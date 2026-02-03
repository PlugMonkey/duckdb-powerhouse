/**
 * Drop provider for inserting file queries into SQL editors.
 */

import * as vscode from 'vscode';

import { Logger } from '../utils/logger';
import { isSupportedFile, generateSelectQuery, getFileTypeName } from './utils';

/**
 * Document drop edit provider for SQL files.
 * Allows dragging data files (Parquet, CSV, JSON) into SQL editors.
 */
export class FileQueryDropProvider implements vscode.DocumentDropEditProvider {
  /**
   * Provide a drop edit for the given drop operation.
   */
  async provideDocumentDropEdits(
    _document: vscode.TextDocument,
    _position: vscode.Position,
    dataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken
  ): Promise<vscode.DocumentDropEdit | undefined> {
    // Get the dropped files
    const uriListItem = dataTransfer.get('text/uri-list');
    if (!uriListItem) {
      return undefined;
    }

    const uriList = await uriListItem.asString();
    const uris = uriList
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .map((line) => {
        try {
          return vscode.Uri.parse(line);
        } catch {
          return null;
        }
      })
      .filter((uri): uri is vscode.Uri => uri !== null);

    if (uris.length === 0) {
      return undefined;
    }

    // Filter to supported data files
    const supportedFiles = uris.filter((uri) => isSupportedFile(uri.fsPath));
    if (supportedFiles.length === 0) {
      return undefined;
    }

    Logger.info('Dropping data files into SQL editor', {
      count: supportedFiles.length,
    });

    // Generate SQL for each file
    const queries = supportedFiles.map((uri) => {
      const query = generateSelectQuery(uri.fsPath);
      const fileType = getFileTypeName(uri.fsPath);
      return `-- ${fileType} file: ${uri.fsPath}\n${query}`;
    });

    const insertText = queries.join('\n\n');

    return new vscode.DocumentDropEdit(insertText);
  }
}
