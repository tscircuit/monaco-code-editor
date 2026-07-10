import Editor, { type Monaco, type OnChange } from "@monaco-editor/react"
import type { editor } from "monaco-editor"
import type { ReactNode } from "react"
import { useMonacoReady } from "../hooks/useMonacoReady"
import { useTscircuitTypeAcquisition } from "../hooks/useTscircuitTypeAcquisition"
import {
  defaultCodeEditorOptions,
  defaultEditorTheme,
} from "../monaco/editorDefaults"

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
  const isMonacoReady = useMonacoReady()

  // Types improve diagnostics but must never delay editing the current file.
  useTscircuitTypeAcquisition(value ?? defaultValue, {
    enabled: isMonacoReady,
  })

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
