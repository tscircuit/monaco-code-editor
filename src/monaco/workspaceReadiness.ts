import type { WorkspaceFile } from "./monacoWorkspace"

export type WorkspaceLoadState = {
  isLoadingFiles?: boolean
}

export function isWorkspaceLoadPending({
  isLoadingFiles,
}: WorkspaceLoadState): boolean {
  return isLoadingFiles === true
}

export function getWorkspaceFileSetKey(
  files: readonly Pick<WorkspaceFile, "path">[],
): string {
  return files
    .map((file) => file.path)
    .sort()
    .join("\0")
}

export function orderWorkspaceFilesForModelCreation(
  files: readonly WorkspaceFile[],
  currentFile: string | null,
): WorkspaceFile[] {
  if (!currentFile) return [...files]

  // Monaco starts diagnostics as each model is created. Register dependencies
  // before the active importer so its first diagnostic pass sees every sibling.
  return [
    ...files.filter((file) => file.path !== currentFile),
    ...files.filter((file) => file.path === currentFile),
  ]
}

export function getWorkspaceTypeAcquisitionSource(
  files: readonly WorkspaceFile[],
): string {
  return files
    .filter((file) => /\.(?:[cm]?[jt]sx?)$/i.test(file.path))
    .map((file) => `// ${file.path}\n${file.content}`)
    .join("\n")
}
