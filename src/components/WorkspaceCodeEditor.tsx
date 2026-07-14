import Editor, { type OnChange, type OnMount } from "@monaco-editor/react"
import { PanelRightClose } from "lucide-react"
import * as monaco from "monaco-editor"
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useMonacoReady } from "../hooks/useMonacoReady"
import { useTscircuitTypeAcquisition } from "../hooks/useTscircuitTypeAcquisition"
import {
  defaultCodeEditorOptions,
  defaultEditorTheme,
} from "../monaco/editorDefaults"
import { prepareMonacoTypeScriptWorkspace } from "../monaco/monacoTypeScript"
import {
  createMonacoWorkspaceModelManager,
  type MonacoWorkspaceModelManager,
} from "../monaco/monacoWorkspace"
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

export type WorkspaceCodeEditorProps = {
  files: EditorFile[]
  currentFile: string | null
  onFileSelect: (path: string, lineNumber?: number) => void
  onFileContentChange: (path: string, content: string) => void
  onCreateFile?: (path: string, content?: string) => void
  onDeleteFile?: (path: string) => void
  onRenameFile?: (oldPath: string, newPath: string) => void
  readOnly?: boolean
  isStreaming?: boolean
  isLoadingFiles?: boolean
  loadingProgress?: string | null
  showSidebar?: boolean
  className?: string
  height?: string | number
  options?: monaco.editor.IStandaloneEditorConstructionOptions
}

/** Commands intended for toolbars and other UI rendered outside the editor. */
export type WorkspaceCodeEditorHandle = {
  focus: () => boolean
  formatDocument: () => Promise<boolean>
  revealLocation: (path: string, line?: number, column?: number) => boolean
  setSidebarOpen: (open: boolean) => void
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

export const WorkspaceCodeEditor = forwardRef<
  WorkspaceCodeEditorHandle,
  WorkspaceCodeEditorProps
>(function WorkspaceCodeEditor(
  {
    files,
    currentFile,
    onFileSelect,
    onFileContentChange,
    onCreateFile,
    onDeleteFile,
    onRenameFile,
    readOnly = false,
    isStreaming = false,
    isLoadingFiles = false,
    loadingProgress = null,
    showSidebar = true,
    className,
    height = "100%",
    options,
  },
  forwardedRef,
) {
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
  const pendingRevealRef = useRef<{
    path: string
    line?: number
    column?: number
  } | null>(null)

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
  const currentFileRef = useRef(currentFile)
  currentFileRef.current = currentFile
  const currentFileIsBinary = currentEditorFile?.isBinary === true
  const isWorkspacePending = isWorkspaceLoadPending({ isLoadingFiles })
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
  // Dependencies and worker preparation improve diagnostics in the background;
  // neither should delay opening the active file.
  useTscircuitTypeAcquisition(workspaceTypeSource, {
    enabled: isReady && isCodeFile(currentFile),
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
        readOnly,
        ...options,
      }),
      [readOnly, options],
    )

  useImperativeHandle(
    forwardedRef,
    () => ({
      focus() {
        const editorInstance = editorRef.current
        if (!editorInstance) return false
        editorInstance.focus()
        return true
      },
      async formatDocument() {
        const action = editorRef.current?.getAction(
          "editor.action.formatDocument",
        )
        if (!action) return false
        await action.run()
        return true
      },
      revealLocation(path, line = 1, column = 1) {
        const file = filesRef.current.find(
          (candidate) => candidate.path === path,
        )
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
      setSidebarOpen,
    }),
    [],
  )

  // Dispose every model this component created when it unmounts.
  useEffect(() => {
    const manager = managerRef.current
    return () => manager?.dispose()
  }, [])

  // Do not expose an editor instance after Monaco has left the render tree.
  useEffect(() => {
    if (isStreaming || currentFileIsBinary || !currentFile) {
      editorRef.current = null
      setEditorReady(false)
    }
  }, [currentFile, currentFileIsBinary, isStreaming])

  // Keep a live model for every (text) file so the TypeScript language service
  // can resolve cross-file imports and surface diagnostics project-wide.
  useLayoutEffect(() => {
    if (!isReady) {
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

    // Keep the active model usable as files stream in, but wait until the
    // workspace settles before initializing the full TypeScript worker graph.
    if (isWorkspacePending) {
      setPreparedWorkspaceKey(null)
      return
    }

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
      const position = {
        lineNumber: pending.line,
        column: pending.column ?? 1,
      }
      editorInstance.revealPositionInCenter(position)
      editorInstance.setPosition(position)
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
    onFileContentChange(currentFile, nextContent)
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
  } else if (!isReady) {
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
          onCreateFile={onCreateFile}
          onDeleteFile={onDeleteFile}
          onRenameFile={onRenameFile}
          isLoadingFiles={isWorkspacePending}
          loadingProgress={loadingProgress}
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
})

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
