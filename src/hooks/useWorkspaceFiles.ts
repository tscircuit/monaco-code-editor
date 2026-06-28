import { useState } from "react"
import type {
  CreateFileProps,
  CreateFileResult,
  DeleteFileProps,
  DeleteFileResult,
  EditorFile,
  RenameFileProps,
  RenameFileResult,
} from "../components/WorkspaceCodeEditor"

export type UseWorkspaceFilesOptions = {
  initialFiles: EditorFile[]
  initialCurrentFile?: string | null
}

export type WorkspaceFilesController = {
  files: EditorFile[]
  currentFile: string | null
  setCurrentFile: (path: string | null) => void
  onFileSelect: (path: string, lineNumber?: number) => void
  onCodeChange: (code: string, filename?: string) => void
  handleCreateFile: (props: CreateFileProps) => CreateFileResult
  handleRenameFile: (props: RenameFileProps) => RenameFileResult
  handleDeleteFile: (props: DeleteFileProps) => DeleteFileResult
}

/**
 * In-memory file store wired to the props `WorkspaceCodeEditor` expects. Handy for
 * consumers (and examples) that don't have their own persistence layer; pass the
 * returned controller straight into `<WorkspaceCodeEditor {...controller} />`.
 */
export function useWorkspaceFiles({
  initialFiles,
  initialCurrentFile,
}: UseWorkspaceFilesOptions): WorkspaceFilesController {
  const [files, setFiles] = useState<EditorFile[]>(initialFiles)
  const [currentFile, setCurrentFile] = useState<string | null>(
    initialCurrentFile ?? initialFiles[0]?.path ?? null,
  )

  const onCodeChange = (code: string, filename?: string) => {
    const target = filename ?? currentFile
    if (!target) return
    setFiles((prev) =>
      prev.map((file) =>
        file.path === target ? { ...file, content: code } : file,
      ),
    )
  }

  const handleCreateFile = ({
    newFileName,
    content = "",
    openFile,
    onError,
  }: CreateFileProps): CreateFileResult => {
    if (files.some((file) => file.path === newFileName)) {
      onError(new Error(`File "${newFileName}" already exists`))
      return { newFileCreated: false }
    }
    setFiles((prev) => [...prev, { path: newFileName, content }])
    if (openFile) setCurrentFile(newFileName)
    return { newFileCreated: true }
  }

  const handleRenameFile = ({
    oldFilename,
    newFilename,
    onError,
  }: RenameFileProps): RenameFileResult => {
    if (files.some((file) => file.path === newFilename)) {
      onError(new Error(`File "${newFilename}" already exists`))
      return { fileRenamed: false }
    }
    setFiles((prev) =>
      prev.map((file) =>
        file.path === oldFilename ? { ...file, path: newFilename } : file,
      ),
    )
    setCurrentFile((current) =>
      current === oldFilename ? newFilename : current,
    )
    return { fileRenamed: true }
  }

  const handleDeleteFile = ({
    filename,
    onError,
  }: DeleteFileProps): DeleteFileResult => {
    if (files.length <= 1) {
      onError(new Error("Cannot delete the last file"))
      return { fileDeleted: false }
    }
    const fallback = files.find((file) => file.path !== filename)?.path ?? null
    setFiles((prev) => prev.filter((file) => file.path !== filename))
    setCurrentFile((current) => (current === filename ? fallback : current))
    return { fileDeleted: true }
  }

  return {
    files,
    currentFile,
    setCurrentFile,
    onFileSelect: (path) => setCurrentFile(path),
    onCodeChange,
    handleCreateFile,
    handleRenameFile,
    handleDeleteFile,
  }
}
