import { Loader2, PanelRightClose, PanelRightOpen, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { Input } from "./ui/input"
import { TreeView } from "./ui/tree-view"
import type {
  CreateFileProps,
  CreateFileResult,
  DeleteFileProps,
  DeleteFileResult,
  EditorFile,
  RenameFileProps,
  RenameFileResult,
} from "./WorkspaceCodeEditor"
import { cn } from "../lib/utils"
import {
  constructFilePath,
  getCurrentFolderPath,
  getFolderPlaceholder,
} from "../utils/fileSidebarPaths"
import { transformFilesToTreeData } from "../utils/transformFilesToTreeData"

export type FileSidebarProps = {
  files: EditorFile[]
  currentFile: string | null
  onFileSelect: (filename: string) => void
  handleCreateFile?: (props: CreateFileProps) => CreateFileResult
  handleDeleteFile?: (props: DeleteFileProps) => DeleteFileResult
  handleRenameFile?: (props: RenameFileProps) => RenameFileResult
  isLoadingFiles?: boolean
  loadingProgress?: string | null
  /** Controlled open state. When omitted the sidebar manages its own. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

const noopRename = (): RenameFileResult => ({ fileRenamed: false })
const noopDelete = (): DeleteFileResult => ({ fileDeleted: false })

export function FileSidebar({
  files,
  currentFile,
  onFileSelect,
  handleCreateFile,
  handleDeleteFile,
  handleRenameFile,
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

  const selectedItemId = currentFile ?? ""
  const canModifyFiles =
    Boolean(handleRenameFile && handleDeleteFile) && !isLoadingFiles
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
    handleRenameFile: handleRenameFile ?? noopRename,
    handleDeleteFile: handleDeleteFile ?? noopDelete,
    setRenamingFile,
    onFileSelect,
    onFolderSelect: setSelectedFolderForCreation,
    canModifyFiles,
    setErrorMessage,
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
    if (!handleCreateFile) return
    const finalFileName = constructFilePath(newFileName, currentFolderPath)
    if (!finalFileName) {
      setErrorMessage("File name cannot be empty")
      return
    }

    const { newFileCreated } = handleCreateFile({
      newFileName: finalFileName,
      openFile: true,
      onError: (error) => {
        setErrorMessage(error.message)
      },
    })

    if (newFileCreated) {
      resetCreateFileState()
      onFileSelect(finalFileName)
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
          {handleCreateFile && (
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
          {errorMessage && (
            <div className="mt-1 px-1 text-xs text-red-500">{errorMessage}</div>
          )}
          <div className="mt-1 px-1 text-xs text-slate-400">
            Tip: Use / for subfolders, Tab to auto-complete current folder
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <TreeView
          data={fileTree}
          setSelectedItemId={(selectedFilePath) => {
            if (
              selectedFilePath &&
              filesRecord[selectedFilePath] !== undefined
            ) {
              onFileSelect(selectedFilePath)
            }
          }}
          selectedItemId={selectedItemId}
          onSelectChange={(item) => {
            if (item?.onClick) {
              item.onClick()
            }
          }}
        />
      </div>
    </div>
  )
}
