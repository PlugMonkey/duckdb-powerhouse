import * as vscode from 'vscode';

import { WebviewResultData } from './serializer';

/** Number of rows per page for pagination */
const ROWS_PER_PAGE = 100;

/**
 * Generate a nonce for CSP.
 */
function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Escape HTML to prevent XSS.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Safely stringify a value, handling BigInt and other non-JSON-serializable types.
 */
function safeStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (typeof val === 'bigint') {
      return val.toString();
    }
    return val;
  });
}

/**
 * Display options for the webview.
 */
export interface WebviewDisplayOptions {
  showRowNumbers: boolean;
}

/**
 * History item for dropdown
 */
interface HistoryItem {
  id: string;
  sql: string;
  rowCount: number;
  timestamp: number;
  error?: string;
}

/**
 * Generate the webview HTML content.
 */
export function getWebviewContent(
  _webview: vscode.Webview,
  _extensionUri: vscode.Uri,
  result: WebviewResultData | undefined,
  historyItems: HistoryItem[],
  options: WebviewDisplayOptions = { showRowNumbers: true }
): string {
  const nonce = getNonce();
  const totalResults = historyItems.length;

  // Build the content based on result state
  let bodyContent: string;

  if (!result) {
    bodyContent = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <h2>No Results</h2>
        <p>Run a query to see results here.</p>
        <p class="hint">Press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> (or <kbd>Cmd</kbd>+<kbd>Enter</kbd> on Mac) to run a query.</p>
      </div>
    `;
  } else if (result.error) {
    bodyContent = `
      ${buildToolbarHtml(historyItems, result.id)}
      <div class="error-state">
        <div class="error-icon">❌</div>
        <h2>Query Error</h2>
        <pre class="error-message">${escapeHtml(result.error)}</pre>
        <details>
          <summary>Query</summary>
          <pre class="sql">${escapeHtml(result.sql)}</pre>
        </details>
      </div>
    `;
  } else if (result.rows.length === 0) {
    // Handle empty result set with a helpful message
    bodyContent = `
      ${buildToolbarHtml(historyItems, result.id)}
      <div class="empty-result">
        <div class="empty-icon">📭</div>
        <h2>No Data</h2>
        <p>The query returned 0 rows.</p>
        <p class="execution-time">Executed in ${result.executionTimeMs.toFixed(0)}ms</p>
        <details class="query-details">
          <summary>SQL Query</summary>
          <pre class="sql">${escapeHtml(result.sql)}</pre>
        </details>
      </div>
    `;
  } else {
    const needsPagination = result.rows.length > ROWS_PER_PAGE;
    const totalPages = Math.ceil(result.rows.length / ROWS_PER_PAGE);

    const statsHtml = `
      <div class="stats">
        <span class="stat">${result.rowCount.toLocaleString()} rows</span>
        <span class="stat">${result.executionTimeMs.toFixed(0)}ms</span>
        ${result.truncated ? '<span class="stat warning">Results truncated</span>' : ''}
        <span class="stat-spacer"></span>
        <button class="btn" onclick="insertRow()" title="Generate INSERT statement">➕ Insert</button>
        <button class="btn" onclick="copyAll()" title="Copy all to clipboard">📋 Copy All</button>
        <button class="btn" onclick="exportCsv()" title="Export to CSV">📄 CSV</button>
        <button class="btn" onclick="exportTsv()" title="Export to TSV">📋 TSV</button>
        <button class="btn" onclick="exportJson()" title="Export to JSON">📦 JSON</button>
      </div>
    `;

    // Query SQL editor (editable)
    const querySqlHtml = `
      <div class="query-editor">
        <div class="query-editor-header">
          <span class="query-label">SQL Query</span>
          <button class="btn btn-run" onclick="runQuery()" title="Run query (Ctrl+Enter)">▶ Run</button>
        </div>
        <textarea id="sql-editor" class="sql-textarea" spellcheck="false">${escapeHtml(result.sql)}</textarea>
      </div>
    `;

    const rowNumHeader = options.showRowNumbers ? '<th class="row-num-header">#</th>' : '';
    const rowNumFilter = options.showRowNumbers ? '<th class="row-num-header filter-cell"></th>' : '';

    // Add type hints to column headers
    const headerHtml = result.columns.map((col, i) => {
      // Infer type from first non-null cell
      const firstCell = result.rows.find(row => row[i]?.type !== 'null')?.[i];
      const typeHint = firstCell ? firstCell.type : 'unknown';
      return `
        <th data-col="${i}" onclick="sortColumn(${i})" title="${escapeHtml(col.name)} (${typeHint}) - Click to sort">
          <span class="col-name">${escapeHtml(col.name)}</span>
          <span class="col-type">${typeHint}</span>
          <span class="sort-indicator"></span>
        </th>
      `;
    }).join('');

    // Filter row with inputs for each column
    const filterRowHtml = result.columns.map((col, i) => {
      const firstCell = result.rows.find(row => row[i]?.type !== 'null')?.[i];
      const typeHint = firstCell ? firstCell.type : 'string';
      const isNumeric = typeHint === 'number';
      return `
        <th class="filter-cell">
          <div class="filter-wrapper">
            <select class="filter-op" data-col="${i}" onchange="applyFilters()" title="Filter operator">
              <option value="">-</option>
              <option value="=" ${!isNumeric ? 'selected' : ''}>=</option>
              <option value="!=">\u2260</option>
              ${isNumeric ? '<option value=">" selected>&gt;</option>' : ''}
              ${isNumeric ? '<option value=">=">\u2265</option>' : ''}
              ${isNumeric ? '<option value="<">&lt;</option>' : ''}
              ${isNumeric ? '<option value="<=">\u2264</option>' : ''}
              <option value="contains">contains</option>
              <option value="starts">starts</option>
              <option value="ends">ends</option>
              <option value="null">is null</option>
              <option value="notnull">not null</option>
            </select>
            <input type="text" class="filter-input" data-col="${i}"
                   placeholder="Filter..."
                   onkeyup="applyFilters()"
                   title="Type to filter ${escapeHtml(col.name)}">
          </div>
        </th>
      `;
    }).join('');

    const rowsHtml = result.rows.map((row, rowIndex) => {
      const rowNumCell = options.showRowNumbers
        ? `<td class="row-num">${rowIndex + 1}</td>`
        : '';
      const cellsHtml = row.map((cell, colIndex) => `
        <td class="cell-${cell.type}"
            data-row="${rowIndex}"
            data-col="${colIndex}"
            data-raw="${escapeHtml(safeStringify(cell.raw))}"
            onclick="selectCell(this)"
            ondblclick="copyCell(this)">
          ${escapeHtml(cell.display)}
        </td>
      `).join('');
      return `<tr data-row="${rowIndex}">${rowNumCell}${cellsHtml}</tr>`;
    }).join('');

    // Pagination controls
    const paginationHtml = needsPagination ? `
      <div class="pagination">
        <button class="btn" onclick="goToPage(0)" disabled id="btn-first">⏮ First</button>
        <button class="btn" onclick="goToPage(currentPage - 1)" disabled id="btn-prev">◀ Prev</button>
        <span class="page-info">Page <span id="current-page">1</span> of ${totalPages}</span>
        <button class="btn" onclick="goToPage(currentPage + 1)" id="btn-next">Next ▶</button>
        <button class="btn" onclick="goToPage(${totalPages - 1})" id="btn-last">Last ⏭</button>
      </div>
    ` : '';

    bodyContent = `
      ${buildToolbarHtml(historyItems, result.id)}
      ${statsHtml}
      ${querySqlHtml}
      <div class="table-container" data-total-rows="${result.rows.length}" data-rows-per-page="${ROWS_PER_PAGE}">
        <table id="results-table">
          <thead>
            <tr class="header-row">${rowNumHeader}${headerHtml}</tr>
            <tr class="filter-row">${rowNumFilter}${filterRowHtml}</tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
      <div class="filter-status" id="filter-status"></div>
      ${paginationHtml}
    `;
  }

  // Build the final HTML
  return buildHtml(nonce, bodyContent, totalResults);
}

/**
 * Build the toolbar with history dropdown and clear button.
 */
function buildToolbarHtml(historyItems: HistoryItem[], currentId: string): string {
  if (historyItems.length === 0) {
    return '';
  }

  const historyOptions = historyItems.map((item, index) => {
    const timeAgo = formatTimeAgo(item.timestamp);
    const sqlPreview = item.sql.slice(0, 40).replace(/\n/g, ' ') + (item.sql.length > 40 ? '...' : '');
    const status = item.error ? '❌' : `${item.rowCount} rows`;
    const selected = item.id === currentId ? 'selected' : '';
    return `<option value="${index}" ${selected}>${status} - ${escapeHtml(sqlPreview)} (${timeAgo})</option>`;
  }).join('');

  return `
    <div class="toolbar">
      <div class="toolbar-left">
        <label for="history-select">History:</label>
        <select id="history-select" onchange="switchResult(this.value)">
          ${historyOptions}
        </select>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-clear" onclick="clearResults()" title="Clear all results">Clear</button>
      </div>
    </div>
  `;
}

/**
 * Format timestamp as relative time ago.
 */
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Build the full HTML document.
 */
function buildHtml(nonce: string, bodyContent: string, _totalResults: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>DuckDB Results</title>
  <style nonce="${nonce}">
    :root {
      --bg-color: var(--vscode-editor-background);
      --fg-color: var(--vscode-editor-foreground);
      --border-color: var(--vscode-panel-border);
      --header-bg: var(--vscode-editorGroupHeader-tabsBackground);
      --row-hover: var(--vscode-list-hoverBackground);
      --selected-bg: var(--vscode-list-activeSelectionBackground);
      --selected-fg: var(--vscode-list-activeSelectionForeground);
      --null-color: var(--vscode-descriptionForeground);
      --number-color: var(--vscode-debugTokenExpression-number);
      --string-color: var(--vscode-debugTokenExpression-string);
      --boolean-color: var(--vscode-debugTokenExpression-boolean);
      --btn-bg: var(--vscode-button-secondaryBackground);
      --btn-fg: var(--vscode-button-secondaryForeground);
      --btn-hover: var(--vscode-button-secondaryHoverBackground);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      background: var(--bg-color);
      color: var(--fg-color);
    }

    .stats {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: var(--header-bg);
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .stat {
      font-size: 12px;
      opacity: 0.8;
    }

    .stat.warning {
      color: var(--vscode-editorWarning-foreground);
    }

    .stat-spacer {
      flex: 1;
    }

    .btn {
      background: var(--btn-bg);
      color: var(--btn-fg);
      border: none;
      padding: 4px 8px;
      font-size: 12px;
      cursor: pointer;
      border-radius: 3px;
    }

    .btn:hover {
      background: var(--btn-hover);
    }

    .table-container {
      overflow: auto;
      max-height: calc(100vh - 80px);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    th, td {
      padding: 6px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 300px;
    }

    th {
      background: var(--header-bg);
      position: sticky;
      top: 0;
      cursor: pointer;
      user-select: none;
      font-weight: 600;
    }

    th:hover {
      background: var(--row-hover);
    }

    .sort-indicator {
      margin-left: 4px;
      opacity: 0.5;
    }

    th.sort-asc .sort-indicator::after {
      content: '▲';
    }

    th.sort-desc .sort-indicator::after {
      content: '▼';
    }

    tr:hover td {
      background: var(--row-hover);
    }

    td.selected {
      background: var(--selected-bg) !important;
      color: var(--selected-fg);
    }

    .cell-null {
      color: var(--null-color);
      font-style: italic;
    }

    .row-num-header,
    .row-num {
      color: var(--null-color);
      text-align: right;
      padding-right: 8px;
      width: 50px;
      min-width: 50px;
      max-width: 50px;
      user-select: none;
      border-right: 1px solid var(--border-color);
    }

    .row-num-header {
      font-weight: normal;
    }

    .cell-number {
      color: var(--number-color);
      text-align: right;
    }

    .cell-boolean {
      color: var(--boolean-color);
    }

    .cell-string {
      color: var(--string-color);
    }

    .cell-object, .cell-array {
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
    }

    .empty-state, .error-state, .empty-result {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: calc(100vh - 50px);
      text-align: center;
      padding: 20px;
    }

    .empty-icon, .error-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .empty-state h2, .error-state h2, .empty-result h2 {
      margin: 0 0 8px 0;
      font-weight: 500;
    }

    .empty-state p, .empty-result p {
      margin: 4px 0;
      opacity: 0.7;
    }

    .empty-result .execution-time {
      font-size: 12px;
      margin-top: 8px;
    }

    .empty-result .query-details {
      margin-top: 20px;
      text-align: left;
      max-width: 600px;
    }

    .hint {
      margin-top: 16px !important;
    }

    kbd {
      background: var(--header-bg);
      border: 1px solid var(--border-color);
      border-radius: 3px;
      padding: 2px 6px;
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
    }

    .error-message {
      background: var(--vscode-inputValidation-errorBackground);
      border: 1px solid var(--vscode-inputValidation-errorBorder);
      padding: 12px;
      border-radius: 4px;
      max-width: 600px;
      overflow: auto;
      text-align: left;
      white-space: pre-wrap;
      word-break: break-word;
    }

    details {
      margin-top: 16px;
    }

    summary {
      cursor: pointer;
      opacity: 0.7;
    }

    .sql {
      background: var(--header-bg);
      padding: 12px;
      border-radius: 4px;
      max-width: 600px;
      overflow: auto;
      text-align: left;
      white-space: pre-wrap;
      font-family: var(--vscode-editor-font-family);
    }

    .result-count {
      padding: 8px 12px;
      font-size: 11px;
      opacity: 0.6;
      border-top: 1px solid var(--border-color);
    }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: var(--header-bg);
      border-bottom: 1px solid var(--border-color);
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toolbar label {
      font-size: 12px;
      opacity: 0.8;
    }

    .toolbar select {
      background: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      padding: 4px 8px;
      font-size: 12px;
      border-radius: 3px;
      min-width: 200px;
      max-width: 400px;
    }

    .btn-clear {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .btn-clear:hover {
      background: var(--vscode-inputValidation-errorBackground);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .query-editor {
      border-bottom: 1px solid var(--border-color);
    }

    .query-editor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 12px;
      background: var(--header-bg);
      border-bottom: 1px solid var(--border-color);
    }

    .query-label {
      font-size: 12px;
      font-weight: 500;
      opacity: 0.8;
    }

    .btn-run {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .btn-run:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .sql-textarea {
      width: 100%;
      min-height: 60px;
      max-height: 200px;
      padding: 8px 12px;
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
      line-height: 1.4;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: none;
      border-bottom: 1px solid var(--border-color);
      resize: vertical;
      outline: none;
    }

    .sql-textarea:focus {
      border-color: var(--vscode-focusBorder);
    }

    .query-details {
      margin: 0;
      padding: 8px 12px;
      border-bottom: 1px solid var(--border-color);
    }

    .query-details summary {
      font-size: 12px;
      cursor: pointer;
      opacity: 0.7;
    }

    .query-details .sql {
      margin-top: 8px;
      max-width: none;
      font-size: 12px;
    }

    .col-type {
      display: block;
      font-size: 10px;
      font-weight: normal;
      opacity: 0.6;
    }

    /* Filter row styles */
    .filter-row th {
      background: var(--header-bg);
      padding: 4px;
      border-bottom: 2px solid var(--border-color);
    }

    .filter-cell {
      padding: 2px 4px !important;
    }

    .filter-wrapper {
      display: flex;
      gap: 2px;
    }

    .filter-op {
      width: 50px;
      padding: 2px;
      font-size: 11px;
      background: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 2px;
    }

    .filter-input {
      flex: 1;
      min-width: 60px;
      padding: 2px 4px;
      font-size: 11px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
    }

    .filter-input:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }

    .filter-status {
      padding: 4px 12px;
      font-size: 11px;
      background: var(--vscode-editorInfo-background);
      color: var(--vscode-editorInfo-foreground);
      display: none;
    }

    .filter-status.active {
      display: block;
    }

    tr.filtered-out {
      display: none;
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-top: 1px solid var(--border-color);
      background: var(--header-bg);
    }

    .page-info {
      font-size: 12px;
      opacity: 0.8;
    }

    .hidden-row {
      display: none;
    }
  </style>
</head>
<body>
  ${bodyContent}
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let sortColumn = -1;
    let sortDirection = 'none';
    let selectedCell = null;

    function selectCell(td) {
      if (selectedCell) {
        selectedCell.classList.remove('selected');
      }
      td.classList.add('selected');
      selectedCell = td;
    }

    function copyCell(td) {
      const raw = td.dataset.raw;
      try {
        const value = JSON.parse(raw);
        vscode.postMessage({ command: 'copyCell', value: value === null ? 'NULL' : value });
      } catch {
        vscode.postMessage({ command: 'copyCell', value: td.textContent });
      }
    }

    function copyAll() {
      vscode.postMessage({ command: 'copyAll' });
    }

    function exportCsv() {
      vscode.postMessage({ command: 'exportCsv' });
    }

    function exportJson() {
      vscode.postMessage({ command: 'exportJson' });
    }

    function exportTsv() {
      vscode.postMessage({ command: 'exportTsv' });
    }

    function insertRow() {
      vscode.postMessage({ command: 'insertRow' });
    }

    function switchResult(indexStr) {
      const index = parseInt(indexStr, 10);
      vscode.postMessage({ command: 'switchResult', index });
    }

    function clearResults() {
      vscode.postMessage({ command: 'clearResults' });
    }

    function runQuery() {
      const editor = document.getElementById('sql-editor');
      if (editor) {
        const sql = editor.value.trim();
        if (sql) {
          vscode.postMessage({ command: 'runQuery', sql: sql });
        }
      }
    }

    // Column filtering
    function applyFilters() {
      const table = document.getElementById('results-table');
      if (!table) return;

      const tbody = table.querySelector('tbody');
      const rows = tbody.querySelectorAll('tr');
      const filterOps = document.querySelectorAll('.filter-op');
      const filterInputs = document.querySelectorAll('.filter-input');

      // Collect active filters
      const filters = [];
      filterOps.forEach((select, i) => {
        const op = select.value;
        const input = filterInputs[i];
        const value = input ? input.value.trim().toLowerCase() : '';

        if (op && (value || op === 'null' || op === 'notnull')) {
          filters.push({ col: i, op, value });
        }
      });

      let visibleCount = 0;
      let totalCount = rows.length;

      rows.forEach(row => {
        const cells = row.querySelectorAll('td:not(.row-num)');
        let match = true;

        for (const filter of filters) {
          const cell = cells[filter.col];
          if (!cell) continue;

          const rawValue = cell.dataset.raw;
          let cellValue;
          try {
            cellValue = JSON.parse(rawValue);
          } catch {
            cellValue = cell.textContent;
          }

          const cellText = (cellValue === null ? '' : String(cellValue)).toLowerCase();
          const isNull = cellValue === null;

          switch (filter.op) {
            case '=':
              match = cellText === filter.value;
              break;
            case '!=':
              match = cellText !== filter.value;
              break;
            case '>':
              match = !isNull && parseFloat(cellValue) > parseFloat(filter.value);
              break;
            case '>=':
              match = !isNull && parseFloat(cellValue) >= parseFloat(filter.value);
              break;
            case '<':
              match = !isNull && parseFloat(cellValue) < parseFloat(filter.value);
              break;
            case '<=':
              match = !isNull && parseFloat(cellValue) <= parseFloat(filter.value);
              break;
            case 'contains':
              match = cellText.includes(filter.value);
              break;
            case 'starts':
              match = cellText.startsWith(filter.value);
              break;
            case 'ends':
              match = cellText.endsWith(filter.value);
              break;
            case 'null':
              match = isNull;
              break;
            case 'notnull':
              match = !isNull;
              break;
          }

          if (!match) break;
        }

        if (match) {
          row.classList.remove('filtered-out');
          visibleCount++;
        } else {
          row.classList.add('filtered-out');
        }
      });

      // Update filter status
      const statusEl = document.getElementById('filter-status');
      if (statusEl) {
        if (filters.length > 0) {
          statusEl.textContent = \`Showing \${visibleCount} of \${totalCount} rows (filtered)\`;
          statusEl.classList.add('active');
        } else {
          statusEl.classList.remove('active');
        }
      }
    }

    // Handle Ctrl+Enter in SQL editor to run query
    document.addEventListener('keydown', (e) => {
      const target = e.target;
      if (target && target.id === 'sql-editor') {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          runQuery();
        }
      }
    });

    // Pagination state
    let currentPage = 0;
    const container = document.querySelector('.table-container');
    const totalRows = container ? parseInt(container.dataset.totalRows || '0', 10) : 0;
    const rowsPerPage = container ? parseInt(container.dataset.rowsPerPage || '100', 10) : 100;
    const totalPages = Math.ceil(totalRows / rowsPerPage);

    function goToPage(page) {
      if (page < 0 || page >= totalPages) return;
      currentPage = page;

      const tbody = document.querySelector('#results-table tbody');
      if (!tbody) return;

      const rows = tbody.querySelectorAll('tr');
      const start = page * rowsPerPage;
      const end = start + rowsPerPage;

      rows.forEach((row, index) => {
        if (index >= start && index < end) {
          row.classList.remove('hidden-row');
        } else {
          row.classList.add('hidden-row');
        }
      });

      // Update page info
      const pageSpan = document.getElementById('current-page');
      if (pageSpan) pageSpan.textContent = String(page + 1);

      // Update button states
      const btnFirst = document.getElementById('btn-first');
      const btnPrev = document.getElementById('btn-prev');
      const btnNext = document.getElementById('btn-next');
      const btnLast = document.getElementById('btn-last');

      if (btnFirst) btnFirst.disabled = page === 0;
      if (btnPrev) btnPrev.disabled = page === 0;
      if (btnNext) btnNext.disabled = page >= totalPages - 1;
      if (btnLast) btnLast.disabled = page >= totalPages - 1;
    }

    // Initialize pagination on load
    if (totalRows > rowsPerPage) {
      goToPage(0);
    }

    function sortColumn(colIndex) {
      const table = document.getElementById('results-table');
      const headers = table.querySelectorAll('th');
      const tbody = table.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr'));

      // Update sort direction
      if (sortColumn === colIndex) {
        sortDirection = sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? 'none' : 'asc';
      } else {
        sortColumn = colIndex;
        sortDirection = 'asc';
      }

      // Update header classes
      headers.forEach((th, i) => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (i === colIndex) {
          if (sortDirection === 'asc') th.classList.add('sort-asc');
          else if (sortDirection === 'desc') th.classList.add('sort-desc');
        }
      });

      // Sort rows
      if (sortDirection === 'none') {
        // Restore original order
        rows.sort((a, b) => {
          return parseInt(a.dataset.row) - parseInt(b.dataset.row);
        });
      } else {
        rows.sort((a, b) => {
          const cellA = a.cells[colIndex];
          const cellB = b.cells[colIndex];

          let rawA, rawB;
          try {
            rawA = JSON.parse(cellA.dataset.raw);
            rawB = JSON.parse(cellB.dataset.raw);
          } catch {
            rawA = cellA.textContent;
            rawB = cellB.textContent;
          }

          // Handle nulls
          if (rawA === null && rawB === null) return 0;
          if (rawA === null) return sortDirection === 'asc' ? -1 : 1;
          if (rawB === null) return sortDirection === 'asc' ? 1 : -1;

          // Compare values
          let comparison = 0;
          if (typeof rawA === 'number' && typeof rawB === 'number') {
            comparison = rawA - rawB;
          } else {
            comparison = String(rawA).localeCompare(String(rawB));
          }

          return sortDirection === 'asc' ? comparison : -comparison;
        });
      }

      // Re-append sorted rows
      rows.forEach(row => tbody.appendChild(row));
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!selectedCell) return;

      const row = parseInt(selectedCell.dataset.row);
      const col = parseInt(selectedCell.dataset.col);
      const table = document.getElementById('results-table');
      let newCell = null;

      switch (e.key) {
        case 'ArrowUp':
          newCell = table.querySelector(\`td[data-row="\${row - 1}"][data-col="\${col}"]\`);
          break;
        case 'ArrowDown':
          newCell = table.querySelector(\`td[data-row="\${row + 1}"][data-col="\${col}"]\`);
          break;
        case 'ArrowLeft':
          newCell = table.querySelector(\`td[data-row="\${row}"][data-col="\${col - 1}"]\`);
          break;
        case 'ArrowRight':
          newCell = table.querySelector(\`td[data-row="\${row}"][data-col="\${col + 1}"]\`);
          break;
        case 'c':
          if (e.ctrlKey || e.metaKey) {
            copyCell(selectedCell);
            e.preventDefault();
          }
          break;
      }

      if (newCell) {
        selectCell(newCell);
        newCell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        e.preventDefault();
      }
    });
  </script>
</body>
</html>`;
}
