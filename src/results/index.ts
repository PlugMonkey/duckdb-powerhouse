/**
 * Results panel module
 *
 * Provides:
 * - Webview-based tabular results display
 * - Column sorting
 * - Pagination for large result sets
 * - Row/execution time display
 */

export { ResultsPanel } from './panel';
export { serializeResult, getSortValue } from './serializer';
export type { WebviewResultData, WebviewColumn, WebviewCell } from './serializer';
export type { WebviewDisplayOptions } from './webview-content';
