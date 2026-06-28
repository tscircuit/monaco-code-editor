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
      className={className}
      style={{ display: "flex", height, minHeight: 0 }}
    >
      {showSidebar && (
        <div
          style={{
            width: 200,
            flexShrink: 0,
            borderRight: "1px solid #e5e7eb",
            background: "#f9fafb",
            overflowY: "auto",
            fontSize: 13,
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px",
              fontWeight: 600,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontSize: 11,
            }}
          >
            <span>Files</span>
            {handleCreateFile && (
              <button
                type="button"
                onClick={promptCreateFile}
                title="New file"
                style={sidebarIconButtonStyle}
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
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 8px",
                  cursor: "pointer",
                  background: isActive ? "#e0e7ff" : "transparent",
                  color: isActive ? "#1e3a8a" : "#374151",
                }}
                onClick={() => onFileSelect(file.path)}
              >
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {file.path}
                </span>
                {handleRenameFile && (
                  <button
                    type="button"
                    title="Rename"
                    style={sidebarIconButtonStyle}
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
                    style={sidebarIconButtonStyle}
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

      <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: "relative" }}>
        {isStreaming ? (
          <pre
            style={{
              margin: 0,
              padding: 16,
              height: "100%",
              overflow: "auto",
              fontFamily: "ui-monospace, monospace",
              fontSize: 12,
              whiteSpace: "pre-wrap",
            }}
          >
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

const sidebarIconButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: "inherit",
  fontSize: 12,
  lineHeight: 1,
  padding: "2px 4px",
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        height: "100%",
        color: "#9ca3af",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: 14,
      }}
    >
      {children}
    </div>
  )
}

function BinaryFileNotice({ downloadUrl }: { downloadUrl?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 12,
        color: "#6b7280",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <p style={{ fontWeight: 600 }}>Binary file</p>
      <p style={{ fontSize: 13 }}>
        This file cannot be displayed in the editor.
      </p>
      {downloadUrl && (
        <a href={downloadUrl} download>
          Download file
        </a>
      )}
    </div>
  )
}
