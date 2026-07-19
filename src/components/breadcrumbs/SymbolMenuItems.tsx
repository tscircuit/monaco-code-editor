import type * as monaco from "monaco-editor"
import type { DocumentSymbol } from "../../monaco/monacoTypeScript"
import { getSymbolIcon } from "../../utils/icons"
import { DropdownMenuItem } from "../ui/dropdown-menu"
import { getMenuItemClassName } from "./shared"

export function revealDocumentSymbol({
  editor,
  symbol,
}: {
  editor: monaco.editor.IStandaloneCodeEditor | null
  symbol: DocumentSymbol
}) {
  if (!editor) return

  const position = {
    lineNumber: symbol.selectionRange.startLineNumber,
    column: symbol.selectionRange.startColumn,
  }
  editor.revealPositionInCenter(position)
  editor.setPosition(position)
  editor.focus()
}

export function SymbolMenuItems({
  symbols,
  currentSymbol,
  onReveal,
}: {
  symbols: DocumentSymbol[]
  currentSymbol: DocumentSymbol
  onReveal: (symbol: DocumentSymbol) => void
}) {
  return (
    <>
      {symbols.map((symbol) => (
        <DropdownMenuItem
          key={`${symbol.name}@${symbol.selectionRange.startLineNumber}:${symbol.selectionRange.startColumn}`}
          onSelect={() => onReveal(symbol)}
          className={getMenuItemClassName(symbol === currentSymbol)}
        >
          {getSymbolIcon(symbol.kind)}
          {symbol.name}
        </DropdownMenuItem>
      ))}
    </>
  )
}
