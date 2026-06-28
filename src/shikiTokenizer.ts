import { shikiToMonaco } from "@shikijs/monaco"
import { EncodedTokenMetadata, INITIAL } from "@shikijs/vscode-textmate"
import * as monaco from "monaco-editor"

const FONT_STYLE_NONE = 0
const FONT_STYLE_ITALIC = 1
const FONT_STYLE_BOLD = 2
const FONT_STYLE_UNDERLINE = 4
const FONT_STYLE_STRIKETHROUGH = 8
type ThemeSetting = {
  scope?: string | string[]
  settings?: {
    foreground?: string
    fontStyle?: string
  }
}

class TokenizerState implements monaco.languages.IState {
  constructor(private readonly ruleStack: unknown) {}

  clone() {
    return new TokenizerState(this.ruleStack)
  }

  equals(other: monaco.languages.IState) {
    return (
      other instanceof TokenizerState &&
      other === this &&
      other.ruleStack === this.ruleStack
    )
  }
}

const normalizeColor = (color: string | string[] | undefined) => {
  if (Array.isArray(color)) color = color[0]
  if (!color) return undefined

  const normalized = (
    color.charCodeAt(0) === 35 ? color.slice(1) : color
  ).toLowerCase()

  if (normalized.length === 3 || normalized.length === 4) {
    return normalized
      .split("")
      .map((value) => value + value)
      .join("")
  }

  return normalized
}

const normalizeFontStyleBits = (fontStyle: number) => {
  if (fontStyle <= FONT_STYLE_NONE) return ""

  const styles = []
  if (fontStyle & FONT_STYLE_ITALIC) styles.push("italic")
  if (fontStyle & FONT_STYLE_BOLD) styles.push("bold")
  if (fontStyle & FONT_STYLE_UNDERLINE) styles.push("underline")
  if (fontStyle & FONT_STYLE_STRIKETHROUGH) styles.push("strikethrough")
  return styles.join(" ")
}

const normalizeFontStyleString = (fontStyle?: string) => {
  if (!fontStyle) return ""

  const styles = new Set(
    fontStyle
      .split(/[\s,]+/)
      .map((style) => style.trim().toLowerCase())
      .map((style) => (style === "line-through" ? "strikethrough" : style))
      .filter(Boolean),
  )

  return ["italic", "bold", "underline", "strikethrough"]
    .filter((style) => styles.has(style))
    .join(" ")
}

const getColorStyleKey = (color: string, fontStyle: string) =>
  fontStyle ? `${color}|${fontStyle}` : color

export const installShikiMonaco = (highlighter: any, theme: string) => {
  shikiToMonaco(highlighter, monaco)
  monaco.editor.setTheme(theme)
}

export const installShikiTokenizer = ({
  highlighter,
  languageId,
  shikiLanguage,
  tokenizeMaxLineLength = 20000,
  tokenizeTimeLimit = 500,
}: {
  highlighter: any
  languageId: string
  shikiLanguage: "tsx" | "typescript" | "jsx" | "javascript"
  tokenizeMaxLineLength?: number
  tokenizeTimeLimit?: number
}) => {
  const colorMapResult = highlighter.setTheme(highlighter.getLoadedThemes()[0]!)
  const colorMap = colorMapResult.colorMap
  const language = highlighter.getLanguage(shikiLanguage)
  const theme = highlighter.getTheme(highlighter.getLoadedThemes()[0]!)
  const colorStyleToScopeMap = new Map<string, string>()

  theme.settings?.forEach(({ scope, settings }: ThemeSetting) => {
    const foreground = normalizeColor(settings?.foreground)
    if (!foreground) return

    const scopes = Array.isArray(scope) ? scope : scope ? [scope] : []
    const key = getColorStyleKey(
      foreground,
      normalizeFontStyleString(settings?.fontStyle),
    )

    for (const tokenScope of scopes) {
      if (!colorStyleToScopeMap.has(key)) {
        colorStyleToScopeMap.set(key, tokenScope)
      }
    }
  })

  monaco.languages.setTokensProvider(languageId, {
    getInitialState() {
      return new TokenizerState(INITIAL)
    },
    tokenize(line, state) {
      if (line.length >= tokenizeMaxLineLength) {
        return {
          endState: state,
          tokens: [{ startIndex: 0, scopes: "" }],
        }
      }

      const result = language.tokenizeLine2(
        line,
        (state as TokenizerState)["ruleStack"] as never,
        tokenizeTimeLimit,
      )

      const tokens = []
      const tokenCount = result.tokens.length / 2

      for (let index = 0; index < tokenCount; index += 1) {
        const startIndex = result.tokens[2 * index] ?? 0
        const metadata = result.tokens[2 * index + 1] ?? 0
        const color = normalizeColor(
          colorMap[EncodedTokenMetadata.getForeground(metadata)] || "",
        )
        const fontStyle = normalizeFontStyleBits(
          EncodedTokenMetadata.getFontStyle(metadata),
        )
        const scope = color
          ? colorStyleToScopeMap.get(getColorStyleKey(color, fontStyle)) || ""
          : ""

        tokens.push({
          startIndex,
          scopes: scope,
        })
      }

      return {
        endState: new TokenizerState(result.ruleStack),
        tokens,
      }
    },
  })
}
