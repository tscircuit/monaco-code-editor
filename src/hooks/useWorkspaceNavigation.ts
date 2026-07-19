import * as monaco from "monaco-editor"
import { type RefObject, useCallback, useEffect, useRef } from "react"
import type { MonacoWorkspaceModelManager } from "../monaco/monacoWorkspace"

type NavigableFile = {
  path: string
  isBinary?: boolean
}

function getLineFromSelection(
  selectionOrPosition?: monaco.IRange | monaco.IPosition,
): number | undefined {
  if (!selectionOrPosition) return undefined
  if ("startLineNumber" in selectionOrPosition) {
    return selectionOrPosition.startLineNumber
  }
  if ("lineNumber" in selectionOrPosition) {
    return selectionOrPosition.lineNumber
  }
  return undefined
}

/**
 * Cross-file navigation for the workspace editor: routes "go to definition"
 * through onFileSelect so navigating into another workspace file switches the
 * active file instead of failing silently, swaps the editor's model when the
 * active file changes while preserving per-file cursor/scroll state, and
 * applies any pending reveal once the target file becomes active.
 */
export function useWorkspaceNavigation({
  isReady,
  editorReady,
  files,
  currentFile,
  onFileSelect,
  editorRef,
  manager,
}: {
  isReady: boolean
  editorReady: boolean
  files: NavigableFile[]
  currentFile: string | null
  onFileSelect: (path: string, lineNumber?: number) => void
  editorRef: RefObject<monaco.editor.IStandaloneCodeEditor | null>
  manager: MonacoWorkspaceModelManager
}) {
  const viewStatesRef = useRef<
    Record<string, monaco.editor.ICodeEditorViewState | null>
  >({})
  const previousFileRef = useRef<string | null>(null)
  const pendingRevealRef = useRef<{
    path: string
    line?: number
    column?: number
  } | null>(null)

  // Refs that the (once-registered) editor opener and reveal callback read so
  // they always see the latest props without re-registering.
  const filesRef = useRef(files)
  filesRef.current = files
  const onFileSelectRef = useRef(onFileSelect)
  onFileSelectRef.current = onFileSelect
  const currentFileRef = useRef(currentFile)
  currentFileRef.current = currentFile

  const revealLocation = useCallback(
    (path: string, line = 1, column = 1) => {
      const file = filesRef.current.find((candidate) => candidate.path === path)
      if (!file || file.isBinary) return false

      const location = {
        path: file.path,
        line: Math.max(1, line),
        column: Math.max(1, column),
      }
      pendingRevealRef.current = location

      if (currentFileRef.current !== file.path) {
        onFileSelectRef.current(file.path, location.line)
        return true
      }

      const editorInstance = editorRef.current
      if (!editorInstance) return true
      editorInstance.revealPositionInCenter({
        lineNumber: location.line,
        column: location.column,
      })
      editorInstance.setPosition({
        lineNumber: location.line,
        column: location.column,
      })
      editorInstance.focus()
      pendingRevealRef.current = null
      return true
    },
    [editorRef],
  )

  // Route cross-file "go to definition" through onFileSelect so navigation into
  // another workspace file switches the active file instead of failing silently.
  useEffect(() => {
    if (!isReady) return
    if (typeof monaco.editor.registerEditorOpener !== "function") return

    const disposable = monaco.editor.registerEditorOpener({
      openCodeEditor(_source, resource, selectionOrPosition) {
        const stripped = resource.path.replace(/^\/+/, "")
        const file = filesRef.current.find(
          (candidate) =>
            candidate.path === stripped ||
            `/${candidate.path}` === resource.path,
        )
        if (!file) return false

        const line = getLineFromSelection(selectionOrPosition)
        pendingRevealRef.current = { path: file.path, line }
        onFileSelectRef.current(file.path, line)
        return true
      },
    })

    return () => disposable.dispose()
  }, [isReady])

  // Swap the editor's model when the active file changes, preserving per-file
  // cursor/scroll state and applying any pending go-to-definition reveal.
  useEffect(() => {
    if (!isReady || !editorReady || !editorRef.current || !currentFile) return
    const editorInstance = editorRef.current

    const model = manager.getModel(currentFile)
    if (model && editorInstance.getModel() !== model) {
      const previousFile = previousFileRef.current
      if (previousFile) {
        viewStatesRef.current[previousFile] = editorInstance.saveViewState()
      }
      editorInstance.setModel(model)
      const restored = viewStatesRef.current[currentFile]
      if (restored) editorInstance.restoreViewState(restored)
      previousFileRef.current = currentFile
    }

    const pending = pendingRevealRef.current
    if (pending && pending.path === currentFile && pending.line) {
      const position = {
        lineNumber: pending.line,
        column: pending.column ?? 1,
      }
      editorInstance.revealPositionInCenter(position)
      editorInstance.setPosition(position)
      editorInstance.focus()
      pendingRevealRef.current = null
    }
  }, [currentFile, isReady, editorReady, files, editorRef, manager])

  // Called from the editor's onMount so the initial model is attached before
  // the first paint of the mounted editor.
  const attachEditor = useCallback(
    (editorInstance: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editorInstance
      const path = currentFileRef.current
      if (!path) return
      const model = manager.getModel(path)
      if (model) {
        editorInstance.setModel(model)
        previousFileRef.current = path
      }
    },
    [editorRef, manager],
  )

  return { revealLocation, attachEditor }
}
