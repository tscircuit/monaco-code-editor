import * as monaco from "monaco-editor"

export type WorkspaceFile = {
  path: string
  content: string
  language?: string
}

export type MonacoWorkspaceModelManagerOptions = {
  inferLanguage?: (path: string) => string
  toUri?: (path: string) => monaco.Uri
  /**
   * Upper bound on the number of live Monaco models the manager keeps. Each
   * model registers a listener on a shared Monaco emitter, so an unbounded
   * count trips Monaco's 200-listener leak monitor and grows memory without
   * limit. The active file is always kept; the least-recently-used models past
   * the cap are disposed and recreated on demand.
   */
  maxLiveModels?: number
}

export const DEFAULT_MAX_LIVE_MODELS = 100

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
  private readonly maxLiveModels: number
  // Insertion order doubles as least-recently-used order: `touch` re-inserts a
  // path so the eviction scan finds the coldest model at the front.
  private readonly models = new Map<string, monaco.editor.ITextModel>()
  // The last known content per path, so an evicted model can be recreated on
  // demand when the file is reopened or searched.
  private readonly files = new Map<string, WorkspaceFile>()
  // The active file is never evicted while it stays attached to the editor.
  private pinnedPath: string | null = null

  constructor(options: MonacoWorkspaceModelManagerOptions = {}) {
    this.inferLanguage = options.inferLanguage ?? defaultInferLanguage
    this.toUri = options.toUri ?? defaultToUri
    this.maxLiveModels = Math.max(
      1,
      options.maxLiveModels ?? DEFAULT_MAX_LIVE_MODELS,
    )
  }

  getUri(path: string) {
    return this.toUri(path)
  }

  // Look up a live model without creating one, reconciling the local map with
  // Monaco's global registry so an adopted or stale model never leaks.
  private findLiveModel(path: string) {
    const tracked = this.models.get(path)
    if (tracked) {
      if (!tracked.isDisposed()) return tracked
      this.models.delete(path)
    }

    const global = monaco.editor.getModel(this.getUri(path))
    if (global && !global.isDisposed()) return global
    return null
  }

  private touch(path: string) {
    const model = this.models.get(path)
    if (!model) return
    this.models.delete(path)
    this.models.set(path, model)
  }

  hasLiveModel(path: string) {
    return this.findLiveModel(path) !== null
  }

  getModel(path: string) {
    const existing = this.findLiveModel(path)
    if (existing) {
      this.models.set(path, existing)
      this.touch(path)
      return existing
    }

    // Recreate on demand for a known file whose model was evicted, so reopening
    // or searching a cold file still resolves to a live model.
    const file = this.files.get(path)
    if (!file) return null
    return this.getOrCreateModel(file)
  }

  private getLanguage(file: WorkspaceFile) {
    return file.language ?? this.inferLanguage(file.path)
  }

  private syncModel(file: WorkspaceFile, model: monaco.editor.ITextModel) {
    this.models.set(file.path, model)
    this.touch(file.path)

    if (model.getValue() !== file.content) {
      model.setValue(file.content)
    }

    const nextLanguage = this.getLanguage(file)
    if (model.getLanguageId() !== nextLanguage) {
      monaco.editor.setModelLanguage(model, nextLanguage)
    }

    return model
  }

  getOrCreateModel(file: WorkspaceFile) {
    this.files.set(file.path, file)

    const existingModel = this.findLiveModel(file.path)
    if (existingModel) return this.syncModel(file, existingModel)

    const model = monaco.editor.createModel(
      file.content,
      this.getLanguage(file),
      this.getUri(file.path),
    )

    this.models.set(file.path, model)
    this.enforceCap()
    return model
  }

  // Dispose the coldest models past the cap, never the pinned active file.
  private enforceCap() {
    if (this.models.size <= this.maxLiveModels) return

    for (const path of [...this.models.keys()]) {
      if (this.models.size <= this.maxLiveModels) break
      if (path === this.pinnedPath) continue
      this.disposeModelInstance(path)
    }
  }

  // Dispose a model and drop it from the map, reconciled with the global
  // registry so a model that fell out of the map cannot linger with its
  // listener attached.
  private disposeModelInstance(path: string) {
    const tracked = this.models.get(path)
    this.models.delete(path)

    const global = monaco.editor.getModel(this.getUri(path))
    for (const model of new Set([tracked, global])) {
      if (model && !model.isDisposed()) model.dispose()
    }
  }

  syncFiles(files: WorkspaceFile[], currentFile: string | null = null) {
    this.pinnedPath = currentFile
    this.files.clear()
    for (const file of files) this.files.set(file.path, file)

    const nextPaths = new Set(files.map((file) => file.path))

    for (const path of [...this.models.keys()]) {
      if (nextPaths.has(path)) continue
      this.disposeModelInstance(path)
    }

    for (const file of files) {
      if (this.findLiveModel(file.path)) {
        this.getOrCreateModel(file)
        continue
      }
      // Leave the cold tail without a model; it is recreated on demand.
      if (file.path !== currentFile && this.models.size >= this.maxLiveModels) {
        continue
      }
      this.getOrCreateModel(file)
    }

    // The active file must always have a live model to attach to the editor.
    if (currentFile && this.files.has(currentFile)) {
      this.getModel(currentFile)
    }

    this.enforceCap()
  }

  updateModel(path: string, nextContent: string) {
    const file = this.files.get(path)
    if (file) this.files.set(path, { ...file, content: nextContent })

    const model = this.findLiveModel(path)
    if (!model || model.getValue() === nextContent) return
    model.setValue(nextContent)
  }

  renameModel(oldPath: string, newPath: string) {
    const model = this.findLiveModel(oldPath)
    this.files.delete(oldPath)
    if (!model) return null

    const content = model.getValue()
    const language = model.getLanguageId()

    this.disposeModelInstance(oldPath)

    const nextModel = monaco.editor.createModel(
      content,
      language,
      this.getUri(newPath),
    )

    this.files.set(newPath, { path: newPath, content, language })
    this.models.set(newPath, nextModel)
    this.enforceCap()
    return nextModel
  }

  disposeModel(path: string) {
    this.files.delete(path)
    this.disposeModelInstance(path)
  }

  dispose() {
    for (const path of [...this.models.keys()]) {
      this.disposeModelInstance(path)
    }
    this.models.clear()
    this.files.clear()
    this.pinnedPath = null
  }
}

export function createMonacoWorkspaceModelManager(
  options?: MonacoWorkspaceModelManagerOptions,
) {
  return new MonacoWorkspaceModelManager(options)
}
