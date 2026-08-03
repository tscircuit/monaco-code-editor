import { FilePlus2, Loader2, PanelLeftClose, PanelLeftOpen } from "lucide-react"
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
const DEFAULT_WIDTH = 224
const MIN_WIDTH = 160
const MAX_WIDTH = 480
const COLLAPSE_AT = 120
const headerButtonClassName =
  "grid h-6 w-6 place-items-center rounded text-slate-500 outline-none hover:bg-slate-200/70 hover:text-slate-800 focus-visible:ring-1 focus-visible:ring-slate-400"

function clampWidth(width: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width))
}

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
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [resizeOrigin, setResizeOrigin] = useState<number | null>(null)
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

  const selectedItemId = currentFile ?? ""
  const showLoadingFiles = isLoadingFiles && files.length > 0
  const canModifyFiles =
    Boolean(onRenameFile && onDeleteFile) && !showLoadingFiles
  const currentFolderPath = getCurrentFolderPath(
    selectedFolderForCreation,
    selectedItemId,
  )

  const filesRecord = useMemo(
    () => Object.fromEntries(files.map((file) => [file.path, file.content])),
    [files],
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

  const handleResizeKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()

    if (event.key === "ArrowLeft" && width === MIN_WIDTH) {
      setSidebarOpen(false)
      return
    }

    const direction = event.key === "ArrowLeft" ? -1 : 1
    const step = event.shiftKey ? 32 : 8
    setWidth((current) => clampWidth(current + direction * step))
  }

  const handleResizePointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const left = event.currentTarget.parentElement?.getBoundingClientRect().left
    if (left !== undefined) setResizeOrigin(left)
  }

  const handleResizePointerMove = (event: React.PointerEvent) => {
    if (resizeOrigin === null) return
    event.preventDefault()
    const nextWidth = event.clientX - resizeOrigin

    if (nextWidth <= COLLAPSE_AT) {
      setResizeOrigin(null)
      setSidebarOpen(false)
    } else {
      setWidth(clampWidth(nextWidth))
    }
  }
  const stopResizing = () => setResizeOrigin(null)

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
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative flex h-full shrink-0 flex-col border-r border-slate-200 bg-slate-50",
        resizeOrigin === null &&
          "transition-[width] duration-150 ease-out motion-reduce:transition-none",
        !sidebarOpen && "w-0 overflow-hidden border-r-0",
        className,
      )}
      style={{ width: sidebarOpen ? width : 0 }}
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-200 px-2">
        <button
          onClick={() => {
            setSidebarOpen(false)
            resetCreateFileState()
          }}
          title="Hide files"
          aria-label="Hide files"
          className={headerButtonClassName}
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1">
          {showLoadingFiles && (
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
              className={headerButtonClassName}
            >
              <FilePlus2 className="h-4 w-4" />
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

      <div className="min-h-0 flex-1 overflow-y-auto">
        {fileTree.length > 0 ? (
          <TreeView
            data={fileTree}
            setSelectedItemId={() => {}}
            selectedItemId={selectedItemId}
          />
        ) : (
          <div className="px-3 py-6 text-center text-xs text-slate-500">
            No files
          </div>
        )}
      </div>

      {sidebarOpen && (
        <div
          role="separator"
          aria-label="Resize explorer"
          aria-orientation="vertical"
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={MAX_WIDTH}
          aria-valuenow={width}
          tabIndex={0}
          className={cn(
            "absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize touch-none outline-none",
            "after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-transparent after:transition-colors",
            "hover:after:bg-blue-500 focus-visible:after:bg-blue-500",
            resizeOrigin !== null && "after:bg-blue-500",
          )}
          onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
          onKeyDown={handleResizeKeyDown}
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={stopResizing}
          onPointerCancel={stopResizing}
          title="Drag to resize. Double-click to reset."
        />
      )}
    </div>
  )
}
