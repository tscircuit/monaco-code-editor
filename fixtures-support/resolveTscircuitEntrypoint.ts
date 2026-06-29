import type { EditorFile } from "../src"

// Fixture-only helper that mirrors tscircuit.com's entrypoint selection so the
// Cosmos runframe example runs the selected runnable file instead of always
// falling back to index.tsx. This stays outside src/ because it is not part of
// the public editor/workspace library API.
export const hasDefaultEntrypointExport = (code: string) => {
  return (
    /export default\s+\w+/.test(code) ||
    /export default\s+function\s*(\w*)\s*\(/.test(code) ||
    /export default\s*\(\s*\)\s*=>/.test(code) ||
    /export default\s*\(.*?\)\s*=>/.test(code) ||
    /export\s*\{\s*\w+\s+as\s+default\s*\}/.test(code)
  )
}

const findConfiguredEntrypoint = (
  files: EditorFile[],
  field: "mainEntrypoint" | "previewComponentPath",
) => {
  const configFile = files.find((file) => file.path === "tscircuit.config.json")
  if (!configFile) return null

  try {
    const config = JSON.parse(configFile.content) as Record<string, unknown>
    const configuredPath = config[field]
    if (typeof configuredPath !== "string") return null

    const normalizedPath = configuredPath.startsWith("./")
      ? configuredPath.slice(2)
      : configuredPath

    return files.find((file) => file.path === normalizedPath) ?? null
  } catch {
    return null
  }
}

export const resolveTscircuitEntrypoint = (
  files: EditorFile[],
  currentFile: string | null,
) => {
  const currentFileData = currentFile
    ? files.find((file) => file.path === currentFile)
    : null

  if (
    currentFileData &&
    /\.(ts|tsx)$/.test(currentFileData.path) &&
    hasDefaultEntrypointExport(currentFileData.content)
  ) {
    return currentFileData.path
  }

  return (
    findConfiguredEntrypoint(files, "mainEntrypoint")?.path ??
    findConfiguredEntrypoint(files, "previewComponentPath")?.path ??
    files.find((file) => file.path === "index.tsx" || file.path === "index.ts")
      ?.path ??
    files.find((file) => file.path.endsWith(".circuit.tsx"))?.path ??
    files.find((file) => file.path === "main.tsx" || file.path === "main.ts")
      ?.path ??
    files.find((file) => file.path.endsWith(".tsx"))?.path ??
    null
  )
}
