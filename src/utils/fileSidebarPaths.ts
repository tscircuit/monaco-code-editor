export function getCurrentFolderPath(
  selectedFolderForCreation: string | null,
  selectedItemId: string,
): string {
  if (selectedFolderForCreation) return selectedFolderForCreation
  if (!selectedItemId) return ""

  const hasLeadingSlash = selectedItemId.startsWith("/")
  const pathParts = selectedItemId.split("/")

  if (pathParts.length > 1) {
    const folderPath = pathParts.slice(0, -1).join("/")
    return hasLeadingSlash ? `/${folderPath}` : folderPath
  }

  return hasLeadingSlash ? "/" : ""
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

  if (!currentFolder || currentFolder === "/") {
    return currentFolder === "/" ? `/${trimmedFileName}` : trimmedFileName
  }

  return `${currentFolder}/${trimmedFileName}`
}

export function getFolderPlaceholder(currentFolder: string): string {
  if (!currentFolder || currentFolder === "/") {
    return "Enter file name (root folder)"
  }

  const displayPath = currentFolder.startsWith("/")
    ? currentFolder.slice(1)
    : currentFolder

  return `Enter file name (${displayPath}/)`
}
