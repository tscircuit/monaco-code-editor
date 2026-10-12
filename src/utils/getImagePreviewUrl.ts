import type { EditorFile } from "../components/WorkspaceCodeEditor"

export function getImagePreviewUrl(file: EditorFile): string | null {
  if (
    !file.isBinary ||
    !/\.(png|apng|jpe?g|gif|webp|avif|bmp|ico|svg)$/i.test(file.path)
  ) {
    return null
  }

  // Package loaders put the already-fetched binary in a blob URL. Prefer it
  // because fetching downloadUrl again may require authorization headers.
  if (/^(blob:|data:image\/)/i.test(file.content)) return file.content

  return file.downloadUrl || null
}
