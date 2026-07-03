import type { WorkspaceFile } from "./monacoWorkspace"

export type WorkspaceLoadState = {
  isFullyLoaded?: boolean
  totalFilesCount?: number
  loadedFilesCount?: number
  pkgFilesLoaded?: boolean
}

export function isWorkspaceLoadPending({
  isFullyLoaded,
  totalFilesCount,
  loadedFilesCount,
  pkgFilesLoaded,
}: WorkspaceLoadState): boolean {
  return (
    isFullyLoaded === false ||
    pkgFilesLoaded === false ||
    (totalFilesCount != null &&
      loadedFilesCount != null &&
      loadedFilesCount < totalFilesCount)
  )
}

export function getWorkspaceFileSetKey(
  files: readonly Pick<WorkspaceFile, "path">[],
): string {
  return files
    .map((file) => file.path)
    .sort()
    .join("\0")
}

export function getWorkspaceTypeAcquisitionSource(
  files: readonly WorkspaceFile[],
): string {
  return files
    .filter((file) => /\.(?:[cm]?[jt]sx?)$/i.test(file.path))
    .map((file) => `// ${file.path}\n${file.content}`)
    .join("\n")
}
