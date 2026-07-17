import {
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  X,
} from "lucide-react"
import { useMemo, useState } from "react"
import { cn } from "../lib/utils"
import {
  constructFilePath,
  getCurrentFolderPath,
  getFolderPlaceholder,
} from "../utils/fileSidebarPaths"
import { transformFilesToTreeData } from "../utils/transformFilesToTreeData"
import { Input } from "./ui/input"
import { TreeView } from "./ui/tree-view"
import type { EditorFile } from "./WorkspaceCodeEditor"

export type FileSidebarProps = {
  files: EditorFile[]
  currentFile: string | null
  onFileSelect: (filename: string) => void
  onCreateFile?: (path: string, content?: string) => void
  onDeleteFile?: (path: string) => void
  onRenameFile?: (oldPath: string, newPath: string) => void
  isLoadingFiles?: boolean
  loadingProgress?: string | null
  /** Controlled open state. When omitted the sidebar manages its own. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

const noopRename = () => {}
const noopDelete = () => {}

export function FileSidebar({
  files,
  currentFile,
  onFileSelect,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  isLoadingFiles = false,
  loadingProgress = null,
  open,
  onOpenChange,
  className,
}: FileSidebarProps) {
  const [internalOpen, setInternalOpen] = useState(true)
  const sidebarOpen = open ?? internalOpen
  const setSidebarOpen = (next: boolean) => {
    onOpenChange?.(next)
    if (open !== undefined) return
    setInternalOpen(next)
  }
  const [isCreatingFile, setIsCreatingFile] = useState(false)
  const [newFileName, setNewFileName] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [renamingFile, setRenamingFile] = useState<string | null>(null)
  const [selectedFolderForCreation, setSelectedFolderForCreation] = useState<
    string | null
  >(null)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [fileSearchQuery, setFileSearchQuery] = useState("")

  const selectedItemId = currentFile ?? ""
  const canModifyFiles =
    Boolean(onRenameFile && onDeleteFile) && !isLoadingFiles
  const currentFolderPath = getCurrentFolderPath(
    selectedFolderForCreation,
    selectedItemId,
  )

  const normalizedFileSearchQuery = fileSearchQuery.trim()
  const filteredFiles = useMemo(() => {
    const query = normalizedFileSearchQuery.toLocaleLowerCase()
    return query
      ? files.filter((file) => file.path.toLocaleLowerCase().includes(query))
      : files
  }, [files, normalizedFileSearchQuery])

  const filesRecord = useMemo(
    () =>
      Object.fromEntries(
        filteredFiles.map((file) => [file.path, file.content]),
      ),
    [filteredFiles],
  )

  const fileTree = transformFilesToTreeData({
    files: filesRecord,
    currentFile,
    renamingFile,
    onRenameFile: onRenameFile ?? noopRename,
    onDeleteFile: onDeleteFile ?? noopDelete,
    setRenamingFile,
    onFileSelect,
    onFolderSelect: setSelectedFolderForCreation,
    canModifyFiles,
    onError: (error) => setErrorMessage(error.message),
    onOperationSuccess: () => setErrorMessage(""),
    setSelectedFolderForCreation,
    openDropdownId,
    setOpenDropdownId,
  })

  const resetCreateFileState = () => {
    setIsCreatingFile(false)
    setNewFileName("")
    setErrorMessage("")
    setSelectedFolderForCreation(null)
  }

  const handleCreateFileInline = () => {
    if (!onCreateFile) return
    const finalFileName = constructFilePath(newFileName, currentFolderPath)
    if (!finalFileName) {
      setErrorMessage("File name cannot be empty")
      return
    }

    try {
      onCreateFile(finalFileName)
      resetCreateFileState()
      onFileSelect(finalFileName)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create file",
      )
    }
  }

  const handleCreateFileBlur = () => {
    if (newFileName.trim() === "") {
      resetCreateFileState()
      return
    }
    handleCreateFileInline()
  }

  const isControlled = open !== undefined

  if (!sidebarOpen && !isControlled) {
    return (
      <div
        className={cn(
          "flex h-full w-9 shrink-0 flex-col items-center border-r border-slate-200 bg-slate-50 py-2",
          className,
        )}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          title="Show files"
          aria-label="Show files"
          className="text-gray-400 hover:text-gray-600"
        >
          <PanelRightClose />
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative h-full shrink-0 border-r border-slate-200 bg-slate-50 transition-all duration-300",
        !sidebarOpen && "w-0 overflow-hidden border-r-0",
        sidebarOpen && "w-56",
        className,
      )}
    >
      <div className="flex h-10 items-center justify-between border-b border-slate-200 px-2">
        <button
          onClick={() => {
            setSidebarOpen(false)
            resetCreateFileState()
          }}
          title="Hide files"
          aria-label="Hide files"
          className="scale-90 text-gray-400 transition-opacity duration-200"
        >
          <PanelRightOpen />
        </button>
        <div className="flex items-center gap-2">
          {isLoadingFiles && (
            <div className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
              {loadingProgress && (
                <span className="text-xs text-slate-400">
                  {loadingProgress}
                </span>
              )}
            </div>
          )}
          {onCreateFile && (
            <button
              onClick={() => setIsCreatingFile(true)}
              aria-label="Create new file"
              title="New file"
              className="text-gray-400 hover:text-gray-600"
            >
              <Plus className="h-5 w-5 shrink-0" />
            </button>
          )}
        </div>
      </div>

      {isCreatingFile && (
        <div className="p-2">
          <Input
            autoFocus
            value={newFileName}
            spellCheck={false}
            onChange={(e) => {
              setNewFileName(e.target.value)
              if (errorMessage) {
                setErrorMessage("")
              }
            }}
            onBlur={handleCreateFileBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleCreateFileInline()
              } else if (e.key === "Escape") {
                e.preventDefault()
                resetCreateFileState()
              } else if (e.key === "Tab") {
                e.preventDefault()
                if (currentFolderPath && !newFileName.includes("/")) {
                  const displayPath = currentFolderPath.startsWith("/")
                    ? currentFolderPath.slice(1)
                    : currentFolderPath
                  setNewFileName(`${displayPath}/`)
                }
              }
            }}
            placeholder={getFolderPlaceholder(currentFolderPath)}
            className={
              errorMessage ? "border-red-500 focus-visible:ring-red-500" : ""
            }
          />
          <div className="mt-1 px-1 text-xs text-slate-400">
            Tip: Use / for subfolders, Tab to auto-complete current folder
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="px-3 py-2 text-xs text-red-600" role="alert">
          {errorMessage}
        </div>
      )}

      <div className="border-b border-slate-200 p-2">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <Input
            type="search"
            aria-label="Search files"
            autoComplete="off"
            spellCheck={false}
            placeholder="Search files..."
            value={fileSearchQuery}
            onChange={(event) => setFileSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && fileSearchQuery) {
                event.preventDefault()
                setFileSearchQuery("")
              }
            }}
            className="h-9 rounded-md border-slate-300 bg-white pl-8 pr-8 text-sm shadow-sm placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100 [&::-webkit-search-cancel-button]:hidden"
          />
          {fileSearchQuery && (
            <button
              type="button"
              aria-label="Clear file search"
              title="Clear search"
              onClick={() => setFileSearchQuery("")}
              className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {fileTree.length > 0 ? (
          <TreeView
            key={normalizedFileSearchQuery ? "file-search" : "all-files"}
            data={fileTree}
            setSelectedItemId={() => {}}
            selectedItemId={selectedItemId}
          />
        ) : (
          <div className="px-3 py-6 text-center text-xs text-slate-500">
            {normalizedFileSearchQuery
              ? `No files match “${normalizedFileSearchQuery}”`
              : "No files"}
          </div>
        )}
      </div>
    </div>
  )
}
