import * as monaco from "monaco-editor"

export type WorkspaceFile = {
  path: string
  content: string
  language?: string
}

export type MonacoWorkspaceModelManagerOptions = {
  inferLanguage?: (path: string) => string
  toUri?: (path: string) => monaco.Uri
}

const defaultLanguageByExtension: Record<string, string> = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".json": "json",
  ".ts": "typescript",
  ".tsx": "typescript",
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`
}

function getExtension(path: string) {
  const normalizedPath = path.toLowerCase()
  const lastDotIndex = normalizedPath.lastIndexOf(".")
  return lastDotIndex === -1 ? "" : normalizedPath.slice(lastDotIndex)
}

function defaultInferLanguage(path: string) {
  return defaultLanguageByExtension[getExtension(path)] ?? "plaintext"
}

function defaultToUri(path: string) {
  return monaco.Uri.file(normalizePath(path))
}

export class MonacoWorkspaceModelManager {
  private readonly inferLanguage: (path: string) => string
  private readonly toUri: (path: string) => monaco.Uri
  private readonly models = new Map<string, monaco.editor.ITextModel>()

  constructor(options: MonacoWorkspaceModelManagerOptions = {}) {
    this.inferLanguage = options.inferLanguage ?? defaultInferLanguage
    this.toUri = options.toUri ?? defaultToUri
  }

  getUri(path: string) {
    return this.toUri(path)
  }

  getModel(path: string) {
    return this.models.get(path) ?? monaco.editor.getModel(this.getUri(path))
  }

  getOrCreateModel(file: WorkspaceFile) {
    const existingModel = this.getModel(file.path)
    if (existingModel) {
      this.models.set(file.path, existingModel)
      if (existingModel.getValue() !== file.content) {
        existingModel.setValue(file.content)
      }

      const nextLanguage = file.language ?? this.inferLanguage(file.path)
      if (existingModel.getLanguageId() !== nextLanguage) {
        monaco.editor.setModelLanguage(existingModel, nextLanguage)
      }

      return existingModel
    }

    const model = monaco.editor.createModel(
      file.content,
      file.language ?? this.inferLanguage(file.path),
      this.getUri(file.path),
    )

    this.models.set(file.path, model)
    return model
  }

  syncFiles(files: WorkspaceFile[]) {
    const nextPaths = new Set(files.map((file) => file.path))

    for (const file of files) {
      this.getOrCreateModel(file)
    }

    for (const [path, model] of this.models) {
      if (nextPaths.has(path)) continue
      model.dispose()
      this.models.delete(path)
    }
  }

  updateModel(path: string, nextContent: string) {
    const model = this.getModel(path)
    if (!model || model.getValue() === nextContent) return
    model.setValue(nextContent)
  }

  refreshModel(path: string) {
    const model = this.getModel(path)
    if (!model) return

    // A flush event makes Monaco's TypeScript diagnostics adapter revalidate
    // imports after new sibling models have been added to the workspace.
    model.setValue(model.getValue())
  }

  renameModel(oldPath: string, newPath: string) {
    const model = this.getModel(oldPath)
    if (!model) return null

    const content = model.getValue()
    const language = model.getLanguageId()

    model.dispose()
    this.models.delete(oldPath)

    const nextModel = monaco.editor.createModel(
      content,
      language,
      this.getUri(newPath),
    )

    this.models.set(newPath, nextModel)
    return nextModel
  }

  disposeModel(path: string) {
    const model = this.getModel(path)
    if (!model) return
    model.dispose()
    this.models.delete(path)
  }

  dispose() {
    for (const model of this.models.values()) {
      model.dispose()
    }
    this.models.clear()
  }
}

export function createMonacoWorkspaceModelManager(
  options?: MonacoWorkspaceModelManagerOptions,
) {
  return new MonacoWorkspaceModelManager(options)
}
