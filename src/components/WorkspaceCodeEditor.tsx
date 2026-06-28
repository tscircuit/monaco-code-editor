import Editor, { type OnChange, type OnMount } from "@monaco-editor/react"
import { useEffect, useMemo, useRef, useState } from "react"
import * as monaco from "monaco-editor"
import {
  defaultCodeEditorOptions,
  defaultEditorTheme,
} from "../monaco/editorDefaults"
import { useMonacoReady } from "../hooks/useMonacoReady"
import { useTscircuitTypeAcquisition } from "../hooks/useTscircuitTypeAcquisition"
import {
  createMonacoWorkspaceModelManager,
  type MonacoWorkspaceModelManager,
} from "../monaco/monacoWorkspace"

export type EditorFile = {
  path: string
  content: string
  isBinary?: boolean
  downloadUrl?: string
}

/**
 * File-management callback shapes, kept structurally compatible with
 * tscircuit.com's `useFileManagement` hook so the component can be used as a
 * drop-in for its CodeEditor.
 */
export type CreateFileProps = {
  newFileName: string
  content?: string
  onError: (error: Error) => void
  openFile?: boolean
}
export type CreateFileResult = { newFileCreated: boolean }
export type DeleteFileProps = {
  filename: string
  onError: (error: Error) => void
}
export type DeleteFileResult = { fileDeleted: boolean }
export type RenameFileProps = {
  oldFilename: string
  newFilename: string
  onError: (error: Error) => void
}
export type RenameFileResult = { fileRenamed: boolean }

export type WorkspaceCodeEditorProps = {
  files: EditorFile[]
  currentFile: string | null
  onFileSelect: (path: string, lineNumber?: number) => void
  onCodeChange: (code: string, filename?: string) => void
  onFileContentChanged?: (path: string, content: string) => void
  handleCreateFile?: (props: CreateFileProps) => CreateFileResult
  handleDeleteFile?: (props: DeleteFileProps) => DeleteFileResult
  handleRenameFile?: (props: RenameFileProps) => RenameFileResult
  readOnly?: boolean
  isSaving?: boolean
  isStreaming?: boolean
  isPriorityFileFetched?: boolean
  isFullyLoaded?: boolean
  totalFilesCount?: number
  loadedFilesCount?: number
  pkgFilesLoaded?: boolean
  /** Accepted for drop-in compatibility; unused by the standalone editor. */
  pkg?: unknown
  /** Accepted for drop-in compatibility; unused by the standalone editor. */
  showImportAndFormatButtons?: boolean
  showSidebar?: boolean
  className?: string
  height?: string | number
  options?: monaco.editor.IStandaloneEditorConstructionOptions
}

const sidebarIconButtonClassName =
  "rounded px-1 py-0.5 text-xs leading-none transition hover:bg-slate-200/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"

const isCodeFile = (path: string | null): path is string =>
  !!path && /\.(ts|tsx|js|jsx)$/.test(path)

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

export function WorkspaceCodeEditor({
  files,
  currentFile,
  onFileSelect,
  onCodeChange,
  onFileContentChanged,
  handleCreateFile,
  handleDeleteFile,
  handleRenameFile,
  readOnly = false,
  isSaving = false,
  isStreaming = false,
  isPriorityFileFetched = false,
  showSidebar = true,
  className,
  height = "100%",
  options,
}: WorkspaceCodeEditorProps) {
  const isReady = useMonacoReady()
  const [editorReady, setEditorReady] = useState(false)

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const managerRef = useRef<MonacoWorkspaceModelManager | null>(null)
  if (!managerRef.current) {
    managerRef.current = createMonacoWorkspaceModelManager()
  }
  const viewStatesRef = useRef<
    Record<string, monaco.editor.ICodeEditorViewState | null>
  >({})
  const previousFileRef = useRef<string | null>(null)
  const pendingRevealRef = useRef<{ path: string; line?: number } | null>(null)

  // Refs that the (once-registered) editor opener and editor callbacks read so
  // they always see the latest props without re-registering.
  const filesRef = useRef(files)
  filesRef.current = files
  const onFileSelectRef = useRef(onFileSelect)
  onFileSelectRef.current = onFileSelect

  const currentFileData = useMemo(
    () => files.find((file) => file.path === currentFile),
    [files, currentFile],
  )
  const currentContent = currentFileData?.content ?? ""
  const currentContentRef = useRef(currentContent)
  currentContentRef.current = currentContent
  const currentFileIsBinary = currentFileData?.isBinary === true

  const editorOptions =
    useMemo<monaco.editor.IStandaloneEditorConstructionOptions>(
      () => ({
        ...defaultCodeEditorOptions,
        readOnly: readOnly || isSaving,
        ...options,
      }),
      [readOnly, isSaving, options],
    )

  // Dispose every model this component created when it unmounts.
  useEffect(() => {
    const manager = managerRef.current
    return () => manager?.dispose()
  }, [])

  // Keep a live model for every (text) file so the TypeScript language service
  // can resolve cross-file imports and surface diagnostics project-wide.
  useEffect(() => {
    if (!isReady) return
    managerRef.current?.syncFiles(
      files
        .filter((file) => !file.isBinary)
        .map((file) => ({ path: file.path, content: file.content })),
    )
  }, [isReady, files])

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

    const model = managerRef.current?.getModel(currentFile)
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
      editorInstance.revealLineInCenter(pending.line)
      editorInstance.setPosition({ lineNumber: pending.line, column: 1 })
      editorInstance.focus()
      pendingRevealRef.current = null
    }
  }, [currentFile, isReady, editorReady, files])

  // Acquire tscircuit/dependency types for the active file (debounced).
  useTscircuitTypeAcquisition(currentContent, {
    enabled: isReady && isCodeFile(currentFile),
  })

  const handleMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance
    if (currentFile) {
      const model = managerRef.current?.getModel(currentFile)
      if (model) {
        editorInstance.setModel(model)
        previousFileRef.current = currentFile
      }
    }
    setEditorReady(true)
  }

  const handleChange: OnChange = (value) => {
    const nextValue = value ?? ""
    if (!currentFile) return
    // Ignore echoes from programmatic model updates (external sync/streaming).
    if (nextValue === currentContentRef.current) return
    onCodeChange(nextValue, currentFile)
    onFileContentChanged?.(currentFile, nextValue)
  }

  const promptCreateFile = () => {
    if (!handleCreateFile) return
    const newFileName = window.prompt("New file name")?.trim()
    if (!newFileName) return
    handleCreateFile({
      newFileName,
      openFile: true,
      onError: (error) => window.alert(error.message),
    })
  }

  const promptRenameFile = (path: string) => {
    if (!handleRenameFile) return
    const newFilename = window.prompt("Rename file", path)?.trim()
    if (!newFilename || newFilename === path) return
    handleRenameFile({
      oldFilename: path,
      newFilename,
      onError: (error) => window.alert(error.message),
    })
  }

  const confirmDeleteFile = (path: string) => {
    if (!handleDeleteFile) return
    if (!window.confirm(`Delete ${path}?`)) return
    handleDeleteFile({
      filename: path,
      onError: (error) => window.alert(error.message),
    })
  }

  return (
    <div
      className={`flex min-h-0 ${className ?? ""}`.trim()}
      style={{ height }}
    >
      {showSidebar && (
        <div className="w-[200px] shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 text-[13px] font-sans">
          <div className="flex items-center justify-between px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
            <span>Files</span>
            {handleCreateFile && (
              <button
                type="button"
                onClick={promptCreateFile}
                title="New file"
                className={sidebarIconButtonClassName}
              >
                +
              </button>
            )}
          </div>
          {files.map((file) => {
            const isActive = file.path === currentFile
            return (
              <div
                key={file.path}
                className={`flex cursor-pointer items-center gap-1 px-2 py-1 ${
                  isActive
                    ? "bg-indigo-100 text-indigo-900"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                onClick={() => onFileSelect(file.path)}
              >
                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {file.path}
                </span>
                {handleRenameFile && (
                  <button
                    type="button"
                    title="Rename"
                    className={sidebarIconButtonClassName}
                    onClick={(event) => {
                      event.stopPropagation()
                      promptRenameFile(file.path)
                    }}
                  >
                    ✎
                  </button>
                )}
                {handleDeleteFile && (
                  <button
                    type="button"
                    title="Delete"
                    className={sidebarIconButtonClassName}
                    onClick={(event) => {
                      event.stopPropagation()
                      confirmDeleteFile(file.path)
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="relative min-h-0 min-w-0 flex-1">
        {isStreaming ? (
          <pre className="m-0 h-full overflow-auto whitespace-pre-wrap p-4 font-mono text-xs">
            {currentContent}
          </pre>
        ) : currentFileIsBinary ? (
          <BinaryFileNotice downloadUrl={currentFileData?.downloadUrl} />
        ) : !isReady || isPriorityFileFetched ? (
          <CenteredMessage>Loading editor…</CenteredMessage>
        ) : currentFile ? (
          <Editor
            height="100%"
            theme={defaultEditorTheme}
            options={editorOptions}
            onMount={handleMount}
            onChange={handleChange}
          />
        ) : (
          <CenteredMessage>Select a file to start editing</CenteredMessage>
        )}
      </div>
    </div>
  )
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-full place-items-center font-sans text-sm text-slate-400">
      {children}
    </div>
  )
}

function BinaryFileNotice({ downloadUrl }: { downloadUrl?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 font-sans text-slate-500">
      <p className="font-semibold">Binary file</p>
      <p className="text-[13px]">
        This file cannot be displayed in the editor.
      </p>
      {downloadUrl && (
        <a
          href={downloadUrl}
          download
          className="text-sm text-blue-600 underline underline-offset-2 hover:text-blue-700"
        >
          Download file
        </a>
      )}
    </div>
  )
}
