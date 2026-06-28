import Editor, { type Monaco, type OnChange } from "@monaco-editor/react"
import { useEffect, useState, type ReactNode } from "react"
import type { editor } from "monaco-editor"
import { defaultCodeEditorOptions, defaultEditorTheme } from "./editorTheme"
import { ensureMonacoConfigured } from "./monacoSetup"
import { acquireTscircuitTypes } from "./typeAcquisition"

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
  value,
  width = "100%",
}: CodeEditorProps) {
  const [isMonacoReady, setIsMonacoReady] = useState(false)

  useEffect(() => {
    let isActive = true

    void ensureMonacoConfigured().then(() => {
      if (isActive) setIsMonacoReady(true)
    })

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (!isMonacoReady) return

    const source = value ?? defaultValue
    const timer = window.setTimeout(() => {
      void acquireTscircuitTypes(source)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [defaultValue, isMonacoReady, value])

  const handleChange: OnChange = (nextValue, event) => {
    onChange?.(nextValue ?? "", event)
  }

  if (!isMonacoReady) {
    return <>{loading}</>
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
      options={{ ...defaultCodeEditorOptions, ...options }}
      path={path}
      theme={defaultEditorTheme}
      value={value}
      width={width}
    />
  )
}

export { defaultCodeEditorOptions }
