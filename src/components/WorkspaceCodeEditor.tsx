import Editor, { type OnChange, type OnMount } from "@monaco-editor/react"
import { PanelRightClose } from "lucide-react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
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
import { prepareMonacoTypeScriptWorkspace } from "../monaco/monacoTypeScript"
import {
  getWorkspaceFileSetKey,
  getWorkspaceTypeAcquisitionSource,
  isWorkspaceLoadPending,
  orderWorkspaceFilesForModelCreation,
} from "../monaco/workspaceReadiness"
import { isHiddenFile } from "../utils/isHiddenFile"
import { FileSidebar } from "./FileSidebar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"

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
  isPriorityFileFetched,
  isFullyLoaded,
  totalFilesCount,
  loadedFilesCount,
  pkgFilesLoaded,
  showSidebar = true,
  className,
  height = "100%",
  options,
}: WorkspaceCodeEditorProps) {
  const isReady = useMonacoReady()
  const [editorReady, setEditorReady] = useState(false)
  const [preparedWorkspaceKey, setPreparedWorkspaceKey] = useState<
    string | null
  >(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

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

  const currentEditorFile = useMemo(
    () => files.find((file) => file.path === currentFile),
    [files, currentFile],
  )
  const currentContent = currentEditorFile?.content ?? ""
  const currentContentRef = useRef(currentContent)
  currentContentRef.current = currentContent
  const currentFileIsBinary = currentEditorFile?.isBinary === true
  const isPriorityFilePending = isPriorityFileFetched === false
  const isWorkspacePending = isWorkspaceLoadPending({
    isFullyLoaded,
    totalFilesCount,
    loadedFilesCount,
    pkgFilesLoaded,
  })
  const workspaceFiles = useMemo(
    () =>
      files
        .filter((file) => !file.isBinary)
        .map((file) => ({ path: file.path, content: file.content })),
    [files],
  )
  const workspaceKey = getWorkspaceFileSetKey(workspaceFiles)
  const workspaceTypeSource = useMemo(
    () => getWorkspaceTypeAcquisitionSource(workspaceFiles),
    [workspaceFiles],
  )
  const isWorkspacePrepared =
    isReady && !isWorkspacePending && preparedWorkspaceKey === workspaceKey

  // Acquire dependencies only after Monaco can see the complete local module
  // graph. Scanning every code file also covers imports outside the active file.
  const areTypesReady = useTscircuitTypeAcquisition(workspaceTypeSource, {
    enabled: isWorkspacePrepared && isCodeFile(currentFile),
    readinessKey: workspaceKey,
  })

  // Files offered in the top-bar dropdown: hide noise (lockfiles, dist, …) but
  // always keep the active file selectable even when it is itself hidden.
  const dropdownFiles = useMemo(
    () =>
      files.filter(
        (file) => !isHiddenFile(file.path) || file.path === currentFile,
      ),
    [files, currentFile],
  )

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
  useLayoutEffect(() => {
    if (!isReady || isWorkspacePending) {
      setPreparedWorkspaceKey(null)
      return
    }

    const manager = managerRef.current
    if (!manager) return

    const orderedFiles = orderWorkspaceFilesForModelCreation(
      workspaceFiles,
      currentFile,
    )
    manager.syncFiles(orderedFiles)

    if (preparedWorkspaceKey === workspaceKey) return

    setPreparedWorkspaceKey(null)
    const codeModelUris = orderedFiles
      .filter((file) => isCodeFile(file.path))
      .map((file) => manager.getUri(file.path))

    let isActive = true
    void prepareMonacoTypeScriptWorkspace(codeModelUris)
      .then(() => {
        if (isActive) setPreparedWorkspaceKey(workspaceKey)
      })
      .catch((error) => {
        console.warn("Failed to prepare TypeScript workspace", error)
      })

    return () => {
      isActive = false
    }
  }, [
    isReady,
    isWorkspacePending,
    workspaceFiles,
    workspaceKey,
    currentFile,
    preparedWorkspaceKey,
  ])

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

  const handleChange: OnChange = (updatedContent) => {
    const nextContent = updatedContent ?? ""
    if (!currentFile) return
    // Ignore echoes from programmatic model updates (external sync/streaming).
    if (nextContent === currentContentRef.current) return
    onCodeChange(nextContent, currentFile)
    onFileContentChanged?.(currentFile, nextContent)
  }

  let editorBody: React.ReactNode

  if (isStreaming) {
    editorBody = (
      <pre className="m-0 h-full overflow-auto whitespace-pre-wrap p-4 font-mono text-xs">
        {currentContent}
      </pre>
    )
  } else if (currentFileIsBinary) {
    editorBody = (
      <BinaryFileNotice downloadUrl={currentEditorFile?.downloadUrl} />
    )
  } else if (
    !isWorkspacePrepared ||
    (isCodeFile(currentFile) && !areTypesReady) ||
    isPriorityFilePending
  ) {
    editorBody = <CenteredMessage>Loading editor…</CenteredMessage>
  } else if (currentFile) {
    editorBody = (
      <Editor
        height="100%"
        theme={defaultEditorTheme}
        options={editorOptions}
        onMount={handleMount}
        onChange={handleChange}
      />
    )
  } else {
    editorBody = (
      <CenteredMessage>Select a file to start editing</CenteredMessage>
    )
  }

  return (
    <div
      className={`workspace-editor-shell flex h-full w-full min-h-0 overflow-hidden ${className ?? ""}`.trim()}
      style={{ height }}
    >
      {showSidebar && (
        <FileSidebar
          files={files}
          currentFile={currentFile}
          onFileSelect={onFileSelect}
          handleCreateFile={handleCreateFile}
          handleDeleteFile={handleDeleteFile}
          handleRenameFile={handleRenameFile}
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
        />
      )}

      <div className="flex h-full min-w-0 flex-1 flex-col">
        {showSidebar && (
          <EditorTopBar
            sidebarOpen={sidebarOpen}
            onShowSidebar={() => setSidebarOpen(true)}
            files={dropdownFiles}
            currentFile={currentFile}
            onFileSelect={onFileSelect}
          />
        )}

        <div className="relative min-h-0 flex-1">{editorBody}</div>
      </div>
    </div>
  )
}

function EditorTopBar({
  sidebarOpen,
  onShowSidebar,
  files,
  currentFile,
  onFileSelect,
}: {
  sidebarOpen: boolean
  onShowSidebar: () => void
  files: EditorFile[]
  currentFile: string | null
  onFileSelect: (path: string) => void
}) {
  const fileLabelWidthClass = sidebarOpen
    ? "max-w-[8rem] sm:max-w-[12rem]"
    : "max-w-[12rem] sm:max-w-[16rem]"

  return (
    <div className="flex items-center gap-2 border-b border-gray-200 px-2 md:py-2">
      <button
        className={`overflow-hidden p-0 text-gray-400 scale-90 transition-[width,opacity] duration-300 ease-in-out ${
          sidebarOpen ? "w-0 pointer-events-none opacity-0" : "w-6 opacity-100"
        }`}
        onClick={onShowSidebar}
        title="Show files"
        aria-label="Show files"
      >
        <div className="flex h-6 w-6 items-center justify-center">
          <PanelRightClose />
        </div>
      </button>
      <div>
        <Select
          value={currentFile ?? ""}
          onValueChange={(selectedFile) => onFileSelect(selectedFile)}
        >
          <SelectTrigger
            className={`h-7 w-32 bg-white px-3 select-none transition-[margin] duration-300 ease-in-out sm:w-48 ${
              sidebarOpen ? "-ml-2" : "-ml-1"
            }`}
          >
            <SelectValue placeholder="Select file" />
          </SelectTrigger>
          <SelectContent>
            {files.map((file) => (
              <SelectItem key={file.path} value={file.path} className="py-1">
                <span
                  className={`block truncate pr-1 text-xs ${fileLabelWidthClass}`}
                >
                  {file.path}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
