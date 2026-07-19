import Editor, { type OnChange, type OnMount } from "@monaco-editor/react"
import { PanelRightClose } from "lucide-react"
import type * as monaco from "monaco-editor"
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { useMonacoReady } from "../hooks/useMonacoReady"
import { useTscircuitTypeAcquisition } from "../hooks/useTscircuitTypeAcquisition"
import { useWorkspaceModelManager } from "../hooks/useWorkspaceModelManager"
import { useWorkspaceNavigation } from "../hooks/useWorkspaceNavigation"
import { useWorkspacePalettes } from "../hooks/useWorkspacePalettes"
import {
  defaultCodeEditorOptions,
  defaultEditorTheme,
} from "../monaco/editorDefaults"
import { isCodeFile } from "../monaco/monacoTypeScript"
import {
  getWorkspaceFileSetKey,
  getWorkspaceTypeAcquisitionSource,
  isWorkspaceLoadPending,
} from "../monaco/workspaceReadiness"
import {
  applyWorkspaceReplacements,
  type WorkspaceSearchMatch,
} from "../utils/workspaceSearch"
import { Breadcrumbs } from "./Breadcrumbs"
import { FileSidebar } from "./FileSidebar"
import { QuickOpen } from "./QuickOpen"
import { WorkspaceSearch } from "./WorkspaceSearch"

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
  openQuickOpen: () => void
  openWorkspaceSearch: () => void
  revealLocation: (path: string, line?: number, column?: number) => boolean
  setSidebarOpen: (open: boolean) => void
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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const {
    quickOpenOpen,
    setQuickOpenOpen,
    workspaceSearchOpen,
    setWorkspaceSearchOpen,
    openQuickOpen,
    openWorkspaceSearch,
  } = useWorkspacePalettes()

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)

  // Refs that the editor callbacks read so they always see the latest props
  // without re-registering.
  const onFileContentChangeRef = useRef(onFileContentChange)
  onFileContentChangeRef.current = onFileContentChange

  const currentEditorFile = useMemo(
    () => files.find((file) => file.path === currentFile),
    [files, currentFile],
  )
  const currentContent = currentEditorFile?.content ?? ""
  const currentContentRef = useRef(currentContent)
  currentContentRef.current = currentContent
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

  const manager = useWorkspaceModelManager({
    isReady,
    workspaceFiles,
    workspaceKey,
    currentFile,
    isWorkspacePending,
  })

  const { revealLocation, attachEditor } = useWorkspaceNavigation({
    isReady,
    editorReady,
    files,
    currentFile,
    onFileSelect,
    editorRef,
    manager,
  })

  const editorOptions =
    useMemo<monaco.editor.IStandaloneEditorConstructionOptions>(
      () => ({
        ...defaultCodeEditorOptions,
        readOnly,
        ...options,
      }),
      [readOnly, options],
    )

  const replaceWorkspaceMatches = useCallback(
    ({
      matches,
      replacement,
      useRegex,
    }: {
      matches: WorkspaceSearchMatch[]
      replacement: string
      useRegex: boolean
    }) => {
      applyWorkspaceReplacements({
        matches,
        replacement,
        useRegex,
        getModel: (path) => manager.getModel(path) ?? undefined,
        isActiveModel: (model) => editorRef.current?.getModel() === model,
        onHiddenModelEdit: (path, content) =>
          onFileContentChangeRef.current(path, content),
      })
    },
    [manager],
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
      openQuickOpen,
      openWorkspaceSearch,
      revealLocation,
      setSidebarOpen,
    }),
    [revealLocation, openQuickOpen, openWorkspaceSearch],
  )

  // Do not expose an editor instance after Monaco has left the render tree.
  useEffect(() => {
    if (isStreaming || currentFileIsBinary || !currentFile) {
      editorRef.current = null
      setEditorReady(false)
    }
  }, [currentFile, currentFileIsBinary, isStreaming])

  const handleMount: OnMount = (editorInstance) => {
    attachEditor(editorInstance)
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
        {(showSidebar || currentFile) && (
          <div className="flex min-h-[30px] items-center border-b border-gray-200 px-2">
            {showSidebar && (
              <button
                className={`overflow-hidden p-0 text-gray-400 scale-90 transition-[width,opacity] duration-300 ease-in-out ${
                  sidebarOpen
                    ? "w-0 pointer-events-none opacity-0"
                    : "w-6 opacity-100"
                }`}
                onClick={() => setSidebarOpen(true)}
                title="Show files"
                aria-label="Show files"
              >
                <div className="flex h-6 w-6 items-center justify-center">
                  <PanelRightClose />
                </div>
              </button>
            )}
            <Breadcrumbs
              editor={editorReady ? editorRef.current : null}
              model={
                editorReady && currentFile
                  ? (manager.getModel(currentFile) ?? null)
                  : null
              }
              filePath={currentFile}
              files={files}
              onFileSelect={onFileSelect}
            />
          </div>
        )}

        <div className="relative min-h-0 flex-1">{editorBody}</div>
      </div>

      <QuickOpen
        files={files}
        currentFile={currentFile}
        open={quickOpenOpen}
        onOpenChange={setQuickOpenOpen}
        onFileSelect={onFileSelect}
      />

      <WorkspaceSearch
        files={files}
        currentFile={currentFile}
        open={workspaceSearchOpen}
        canReplace={!readOnly}
        getModel={(path) => manager.getModel(path) ?? undefined}
        onOpenChange={setWorkspaceSearchOpen}
        onNavigate={(match) => {
          setWorkspaceSearchOpen(false)
          revealLocation(
            match.path,
            match.range.startLineNumber,
            match.range.startColumn,
          )
        }}
        onReplace={replaceWorkspaceMatches}
      />
    </div>
  )
})

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
