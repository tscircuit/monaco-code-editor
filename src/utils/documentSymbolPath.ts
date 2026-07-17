import type { DocumentSymbol } from "../monaco/monacoTypeScript"

const containsPosition = (
  range: DocumentSymbol["range"],
  lineNumber: number,
  column: number,
): boolean => {
  if (lineNumber < range.startLineNumber || lineNumber > range.endLineNumber)
    return false
  if (lineNumber === range.startLineNumber && column < range.startColumn)
    return false
  if (lineNumber === range.endLineNumber && column > range.endColumn)
    return false
  return true
}

/** Root-to-innermost chain of symbols enclosing a cursor position. */
export function getDocumentSymbolPath(
  symbols: DocumentSymbol[],
  lineNumber: number,
  column: number,
): DocumentSymbol[] {
  for (const symbol of symbols) {
    if (!containsPosition(symbol.range, lineNumber, column)) continue
    return [
      symbol,
      ...getDocumentSymbolPath(symbol.children, lineNumber, column),
    ]
  }
  return []
}
