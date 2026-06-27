import Editor, {
  loader,
  type Monaco,
  type OnChange,
} from "@monaco-editor/react"
import { useEffect, type ReactNode } from "react"
import * as monaco from "monaco-editor"
import type { editor } from "monaco-editor"
import { configureMonacoTypeScript } from "./monacoTypeScript"
import { acquireTscircuitTypes } from "./typeAcquisition"

loader.config({ monaco })
configureMonacoTypeScript()

const defaultOptions: editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontLigatures: true,
  fontSize: 14,
  minimap: { enabled: false },
  padding: { top: 16, bottom: 16 },
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  tabSize: 2,
  wordWrap: "on",
}

export type CodeEditorProps = {
  className?: string
  defaultValue?: string
  height?: number | string
  language?: string
  loading?: ReactNode
  onChange?: (
    value: string,
    event: editor.IModelContentChangedEvent | undefined,
  ) => void
  onMount?: (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => void
  options?: editor.IStandaloneEditorConstructionOptions
  path?: string
  theme?: string
  value?: string
  width?: number | string
}

export function CodeEditor({
  className,
  defaultValue = "",
  height = "100%",
  language = "typescript",
  loading = "Loading editor...",
  onChange,
  onMount,
  options,
  path,
  theme = "vs-light",
  value,
  width = "100%",
}: CodeEditorProps) {
  useEffect(() => {
    const source = value ?? defaultValue
    const timer = window.setTimeout(() => {
      void acquireTscircuitTypes(source)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [defaultValue, value])

  const handleChange: OnChange = (nextValue, event) => {
    onChange?.(nextValue ?? "", event)
  }

  return (
    <Editor
      className={className}
      defaultLanguage={language}
      defaultValue={defaultValue}
      height={height}
      keepCurrentModel={path != null}
      language={language}
      loading={loading}
      onChange={handleChange}
      onMount={onMount}
      options={{ ...defaultOptions, ...options }}
      path={path}
      theme={theme}
      value={value}
      width={width}
    />
  )
}

export { defaultOptions as defaultCodeEditorOptions }
