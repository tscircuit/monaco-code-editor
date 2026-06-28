import type { editor } from "monaco-editor"

export const defaultEditorTheme = "github-light"

export const defaultCodeEditorOptions: editor.IStandaloneEditorConstructionOptions =
  {
    automaticLayout: true,
    bracketPairColorization: { enabled: false },
    fontFamily:
      '"JetBrains Mono", "SF Mono", Menlo, Monaco, Consolas, monospace',
    fontLigatures: true,
    fontSize: 14,
    glyphMargin: false,
    guides: {
      bracketPairs: false,
      highlightActiveBracketPair: false,
      indentation: false,
    },
    lineDecorationsWidth: 8,
    lineNumbersMinChars: 2,
    minimap: { enabled: false },
    overviewRulerBorder: false,
    padding: { top: 16, bottom: 16 },
    renderLineHighlight: "line",
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    tabSize: 2,
    wordWrap: "on",
  }
