import type * as monaco from "monaco-editor"
import { useEffect, useMemo, useState } from "react"
import {
  type DocumentSymbol,
  getDocumentSymbols,
} from "../monaco/monacoTypeScript"
import { getDocumentSymbolPath } from "../utils/documentSymbolPath"

function loadDocumentSymbols({
  model,
  isActive,
  setSymbols,
}: {
  model: monaco.editor.ITextModel
  isActive: () => boolean
  setSymbols: (symbols: DocumentSymbol[]) => void
}) {
  getDocumentSymbols(model)
    .then((symbols) => {
      if (isActive()) setSymbols(symbols)
    })
    .catch((error) => {
      console.warn("Failed to load document symbols", error)
    })
}

/**
 * Tracks the document-symbol outline of the active model and the symbol path
 * containing the cursor. Refetches the outline whenever the model or its
 * content changes; the TS worker call is cheap since it reuses the language
 * service's already-parsed source file.
 */
export function useDocumentSymbols({
  editor,
  model,
  enabled,
}: {
  editor: monaco.editor.IStandaloneCodeEditor | null
  model: monaco.editor.ITextModel | null
  enabled: boolean
}): { symbols: DocumentSymbol[]; symbolPath: DocumentSymbol[] } {
  const [symbols, setSymbols] = useState<DocumentSymbol[]>([])
  const [cursor, setCursor] = useState<monaco.Position | null>(null)

  useEffect(() => {
    if (!editor || !model || !enabled) {
      setSymbols([])
      setCursor(null)
      return
    }

    let isActive = true
    const symbolLoadRequest = {
      model,
      isActive: () => isActive,
      setSymbols,
    }
    loadDocumentSymbols(symbolLoadRequest)
    setCursor(editor.getPosition())

    const changeDisposable = model.onDidChangeContent(() =>
      loadDocumentSymbols(symbolLoadRequest),
    )
    const cursorDisposable = editor.onDidChangeCursorPosition((event) =>
      setCursor(event.position),
    )

    return () => {
      isActive = false
      changeDisposable.dispose()
      cursorDisposable.dispose()
    }
  }, [editor, model, enabled])

  const symbolPath = useMemo(
    () =>
      cursor
        ? getDocumentSymbolPath(symbols, cursor.lineNumber, cursor.column)
        : [],
    [symbols, cursor],
  )

  return { symbols, symbolPath }
}
