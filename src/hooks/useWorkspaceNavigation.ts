import * as monaco from "monaco-editor"
import { type RefObject, useCallback, useEffect, useRef, useState } from "react"
import type { MonacoWorkspaceModelManager } from "../monaco/monacoWorkspace"

type NavigableFile = {
  path: string
  isBinary?: boolean
}

type PendingNavigation = {
  path: string
  line?: number
  column?: number
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

function revealPosition(
  editorInstance: monaco.editor.IStandaloneCodeEditor,
  line: number | undefined,
  column = 1,
) {
  if (line) {
    const position = { lineNumber: line, column }
    editorInstance.revealPositionInCenter(position)
    editorInstance.setPosition(position)
  }
  editorInstance.focus()
}

/**
 * Cross-file navigation for the workspace editor: routes "go to definition"
 * through onFileSelect so navigating into another workspace file switches the
 * active file instead of failing silently. All navigation requests (file
 * picks, go-to-definition, reveal-in-place) just record intent; a single
 * effect below is the only place that swaps the editor's model and applies
 * the reveal, once the target model is actually attached.
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
  const pendingNavigationRef = useRef<PendingNavigation | null>(null)
  // Bumped on every navigation request so the apply effect below reruns even
  // when currentFile doesn't change (e.g. reselecting the active file).
  const [navTick, setNavTick] = useState(0)

  // Refs that the (once-registered) editor opener and reveal callback read so
  // they always see the latest props without re-registering.
  const filesRef = useRef(files)
  filesRef.current = files
  const onFileSelectRef = useRef(onFileSelect)
  onFileSelectRef.current = onFileSelect
  const currentFileRef = useRef(currentFile)
  currentFileRef.current = currentFile

  const requestNavigation = useCallback((pending: PendingNavigation) => {
    pendingNavigationRef.current = pending
    setNavTick((tick) => tick + 1)
  }, [])

  const selectFile = useCallback(
    (path: string, line?: number) => {
      onFileSelectRef.current(path, line)
      requestNavigation({ path, line })
    },
    [requestNavigation],
  )

  const revealLocation = useCallback(
    (path: string, line = 1, column = 1) => {
      const file = filesRef.current.find((candidate) => candidate.path === path)
      if (!file || file.isBinary) return false

      const clampedLine = Math.max(1, line)
      requestNavigation({
        path: file.path,
        line: clampedLine,
        column: Math.max(1, column),
      })
      if (currentFileRef.current !== file.path) {
        onFileSelectRef.current(file.path, clampedLine)
      }
      return true
    },
    [requestNavigation],
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
        requestNavigation({ path: file.path, line })
        onFileSelectRef.current(file.path, line)
        return true
      },
    })

    return () => disposable.dispose()
  }, [isReady, requestNavigation])

  // Swap the editor's model when the active file changes, preserving per-file
  // cursor/scroll state, then apply any pending reveal once the target model
  // is attached. The sole place that touches the editor for navigation.
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

    const pending = pendingNavigationRef.current
    if (
      pending &&
      pending.path === currentFile &&
      model &&
      editorInstance.getModel() === model
    ) {
      revealPosition(editorInstance, pending.line, pending.column)
      pendingNavigationRef.current = null
    }
  }, [currentFile, navTick, isReady, editorReady, files, editorRef, manager])

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

  return { revealLocation, selectFile, attachEditor }
}
