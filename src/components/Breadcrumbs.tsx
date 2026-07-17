import { ChevronRight } from "lucide-react"
import type * as monaco from "monaco-editor"
import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import {
  getDocumentSymbols,
  type DocumentSymbol,
} from "../monaco/monacoTypeScript"
import { getDocumentSymbolPath } from "../utils/documentSymbolPath"
import { Breadcrumb, BreadcrumbList } from "./ui/breadcrumb"

export type BreadcrumbsProps = {
  editor: monaco.editor.IStandaloneCodeEditor | null
  model: monaco.editor.ITextModel | null
  filePath: string | null
}

type BreadcrumbEntry = {
  key: string
  label: string
  onClick?: () => void
}

export function Breadcrumbs({ editor, model, filePath }: BreadcrumbsProps) {
  const [symbols, setSymbols] = useState<DocumentSymbol[]>([])
  const [cursor, setCursor] = useState<monaco.Position | null>(null)

  // Refetch the file outline whenever the active model or its content
  // changes; the TS worker call is cheap since it reuses the language
  // service's already-parsed source file.
  useEffect(() => {
    if (!editor || !model) {
      setSymbols([])
      setCursor(null)
      return
    }

    let isActive = true
    const refreshSymbols = () => {
      getDocumentSymbols(model)
        .then((next) => {
          if (isActive) setSymbols(next)
        })
        .catch((error) => {
          console.warn("Failed to load document symbols", error)
        })
    }
    refreshSymbols()
    setCursor(editor.getPosition())

    const changeDisposable = model.onDidChangeContent(refreshSymbols)
    const cursorDisposable = editor.onDidChangeCursorPosition((event) =>
      setCursor(event.position),
    )

    return () => {
      isActive = false
      changeDisposable.dispose()
      cursorDisposable.dispose()
    }
  }, [editor, model])

  const symbolPath = useMemo(
    () =>
      cursor
        ? getDocumentSymbolPath(symbols, cursor.lineNumber, cursor.column)
        : [],
    [symbols, cursor],
  )

  const revealSymbol = (symbol: DocumentSymbol) => {
    if (!editor) return
    const position = {
      lineNumber: symbol.selectionRange.startLineNumber,
      column: symbol.selectionRange.startColumn,
    }
    editor.revealPositionInCenter(position)
    editor.setPosition(position)
    editor.focus()
  }

  if (!filePath) return null

  const entries: BreadcrumbEntry[] = [
    ...filePath.split("/").map((segment, index) => ({
      key: `file-${index}`,
      label: segment,
    })),
    ...symbolPath.map((symbol, index) => ({
      key: `symbol-${index}`,
      label: symbol.name,
      onClick: () => revealSymbol(symbol),
    })),
  ]

  return (
    <Breadcrumb className="border-b border-gray-200 px-3 py-1">
      <BreadcrumbList className="flex-nowrap gap-1 overflow-x-auto whitespace-nowrap text-xs sm:gap-1">
        {entries.map((entry, index) => (
          <BreadcrumbSegment
            key={entry.key}
            onClick={entry.onClick}
            isLast={index === entries.length - 1}
          >
            {entry.label}
          </BreadcrumbSegment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function BreadcrumbSegment({
  children,
  onClick,
  isLast,
}: {
  children: ReactNode
  onClick?: () => void
  isLast: boolean
}) {
  return (
    <li className="flex shrink-0 items-center gap-1">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="rounded px-1 py-0.5 font-mono text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          {children}
        </button>
      ) : (
        <span
          className={`px-1 py-0.5 font-mono ${isLast ? "text-slate-900" : "text-slate-500"}`}
        >
          {children}
        </span>
      )}
      {!isLast && (
        <ChevronRight
          aria-hidden="true"
          className="h-3 w-3 shrink-0 text-slate-300"
        />
      )}
    </li>
  )
}
