import { useState } from "react"
import type { EditorFile } from "../components/WorkspaceCodeEditor"

export type UseWorkspaceFilesOptions = {
  initialFiles: EditorFile[]
  initialCurrentFile?: string | null
}

export type WorkspaceFilesController = {
  files: EditorFile[]
  currentFile: string | null
  setCurrentFile: (path: string | null) => void
  onFileSelect: (path: string, lineNumber?: number) => void
  onFileContentChange: (path: string, content: string) => void
  onCreateFile: (path: string, content?: string) => void
  onRenameFile: (oldPath: string, newPath: string) => void
  onDeleteFile: (path: string) => void
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

  const onFileContentChange = (path: string, content: string) => {
    setFiles((prev) =>
      prev.map((file) => (file.path === path ? { ...file, content } : file)),
    )
  }

  const onCreateFile = (path: string, content = "") => {
    if (files.some((file) => file.path === path)) {
      throw new Error(`File "${path}" already exists`)
    }
    setFiles((prev) => [...prev, { path, content }])
  }

  const onRenameFile = (oldPath: string, newPath: string) => {
    if (!files.some((file) => file.path === oldPath)) {
      throw new Error(`File "${oldPath}" does not exist`)
    }
    if (files.some((file) => file.path === newPath)) {
      throw new Error(`File "${newPath}" already exists`)
    }
    setFiles((prev) =>
      prev.map((file) =>
        file.path === oldPath ? { ...file, path: newPath } : file,
      ),
    )
    setCurrentFile((current) => (current === oldPath ? newPath : current))
  }

  const onDeleteFile = (path: string) => {
    if (!files.some((file) => file.path === path)) {
      throw new Error(`File "${path}" does not exist`)
    }
    if (files.length <= 1) {
      throw new Error("Cannot delete the last file")
    }
    const fallback = files.find((file) => file.path !== path)?.path ?? null
    setFiles((prev) => prev.filter((file) => file.path !== path))
    setCurrentFile((current) => (current === path ? fallback : current))
  }

  return {
    files,
    currentFile,
    setCurrentFile,
    onFileSelect: (path) => setCurrentFile(path),
    onFileContentChange,
    onCreateFile,
    onRenameFile,
    onDeleteFile,
  }
}
