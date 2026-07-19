import { useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  isCodeFile,
  prepareMonacoTypeScriptWorkspace,
} from "../monaco/monacoTypeScript"
import {
  createMonacoWorkspaceModelManager,
  type MonacoWorkspaceModelManager,
  type WorkspaceFile,
} from "../monaco/monacoWorkspace"
import { orderWorkspaceFilesForModelCreation } from "../monaco/workspaceReadiness"

/**
 * Owns the workspace's Monaco model manager. Keeps a live model for every
 * (text) file so the TypeScript language service can resolve cross-file
 * imports and surface diagnostics project-wide, and initializes the
 * TypeScript worker graph once the workspace settles.
 */
export function useWorkspaceModelManager({
  isReady,
  workspaceFiles,
  workspaceKey,
  currentFile,
  isWorkspacePending,
}: {
  isReady: boolean
  workspaceFiles: WorkspaceFile[]
  workspaceKey: string
  currentFile: string | null
  isWorkspacePending: boolean
}): MonacoWorkspaceModelManager {
  const managerRef = useRef<MonacoWorkspaceModelManager | null>(null)
  if (!managerRef.current) {
    managerRef.current = createMonacoWorkspaceModelManager()
  }
  const manager = managerRef.current

  const [preparedWorkspaceKey, setPreparedWorkspaceKey] = useState<
    string | null
  >(null)

  // Dispose every model this hook created when the owner unmounts.
  useEffect(() => {
    return () => manager.dispose()
  }, [manager])

  useLayoutEffect(() => {
    if (!isReady) {
      setPreparedWorkspaceKey(null)
      return
    }

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
    manager,
  ])

  return manager
}
