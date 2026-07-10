function stripTrailingSlash(path: string): string {
  return path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path
}

export function getCurrentFolderPath(
  selectedFolderForCreation: string | null,
  selectedItemId: string,
): string {
  if (selectedFolderForCreation) return selectedFolderForCreation
  if (!selectedItemId) return ""

  const normalizedItemId = stripTrailingSlash(selectedItemId)
  const lastSlashIndex = normalizedItemId.lastIndexOf("/")

  if (lastSlashIndex === -1) return ""
  if (lastSlashIndex === 0) return "/"

  return normalizedItemId.slice(0, lastSlashIndex)
}

export function constructFilePath(
  fileName: string,
  currentFolder: string,
): string {
  const trimmedFileName = fileName.trim()

  if (!trimmedFileName) return ""

  if (trimmedFileName.startsWith("/") || trimmedFileName.includes("/")) {
    return trimmedFileName
  }

  const normalizedFolder = stripTrailingSlash(currentFolder)
  if (!normalizedFolder) return trimmedFileName
  if (normalizedFolder === "/") return `/${trimmedFileName}`

  return `${normalizedFolder}/${trimmedFileName}`
}

export function getFolderPlaceholder(currentFolder: string): string {
  const normalizedFolder = stripTrailingSlash(currentFolder)
  if (!normalizedFolder || normalizedFolder === "/") {
    return "Enter file name (root folder)"
  }

  return `Enter file name (${normalizedFolder.replace(/^\//, "")}/)`
}
