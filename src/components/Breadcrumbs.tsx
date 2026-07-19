import type * as monaco from "monaco-editor"
import { useMemo } from "react"
import { useDocumentSymbols } from "../hooks/useDocumentSymbols"
import { isCodeFile } from "../monaco/monacoTypeScript"
import { buildFileTree, type FileTreeNode } from "../utils/build-file-tree"
import { getFileIcon, getSymbolIcon } from "../utils/icons"
import { isHiddenFile } from "../utils/isHiddenFile"
import { BreadcrumbSegment } from "./breadcrumbs/BreadcrumbSegment"
import { FileTreeMenu } from "./breadcrumbs/FileTreeMenu"
import {
  revealDocumentSymbol,
  SymbolMenuItems,
} from "./breadcrumbs/SymbolMenuItems"
import { Breadcrumb, BreadcrumbList } from "./ui/breadcrumb"

export type BreadcrumbsProps = {
  editor: monaco.editor.IStandaloneCodeEditor | null
  model: monaco.editor.ITextModel | null
  filePath: string | null
  files?: { path: string }[]
  onFileSelect?: (path: string) => void
}

export function Breadcrumbs({
  editor,
  model,
  filePath,
  files,
  onFileSelect,
}: BreadcrumbsProps) {
  // Only code files have a TypeScript outline; other files (md, json, …)
  // still get file-path breadcrumbs.
  const hasSymbolOutline = isCodeFile(filePath)

  const { symbols, symbolPath } = useDocumentSymbols({
    editor,
    model,
    enabled: hasSymbolOutline,
  })

  const visiblePaths = useMemo(
    () =>
      (files ?? [])
        .map((file) => file.path)
        .filter((path) => !isHiddenFile(path)),
    [files],
  )

  // The current file is normally part of visiblePaths, so switching between
  // visible files reuses the cached tree; only a hidden current file forces
  // a rebuild that includes it.
  const hiddenCurrentPath =
    filePath &&
    isHiddenFile(filePath) &&
    files?.some((file) => file.path === filePath)
      ? filePath
      : null

  const fileTree = useMemo(
    () =>
      buildFileTree(
        hiddenCurrentPath ? [...visiblePaths, hiddenCurrentPath] : visiblePaths,
      ),
    [visiblePaths, hiddenCurrentPath],
  )

  // Sibling list per path depth, computed with a single downward walk so
  // cursor-move re-renders don't re-walk the tree per segment.
  const siblingsByDepth = useMemo(() => {
    if (!filePath) return []
    const segments = filePath.split("/")
    const lists: FileTreeNode[][] = []
    let nodes = fileTree
    for (const segment of segments) {
      lists.push(nodes)
      nodes = nodes.find((node) => node.name === segment)?.children ?? []
    }
    return lists
  }, [fileTree, filePath])

  if (!filePath) return null

  const pathSegments = filePath.split("/")

  return (
    <Breadcrumb className="min-w-0 flex-1 px-1 py-1">
      <BreadcrumbList className="flex-nowrap gap-0.5 overflow-x-auto whitespace-nowrap text-xs sm:gap-0.5">
        {pathSegments.map((segment, index) => {
          const isLast = index === pathSegments.length - 1
          const siblings = siblingsByDepth[index] ?? []
          const segmentPath = pathSegments.slice(0, index + 1).join("/")
          return (
            <BreadcrumbSegment
              key={segmentPath}
              isLast={isLast && symbolPath.length === 0}
              icon={isLast ? getFileIcon(segment, "h-3.5 w-3.5") : undefined}
              dropdown={
                onFileSelect && siblings.length > 0 ? (
                  <FileTreeMenu
                    nodes={siblings}
                    currentPath={segmentPath}
                    onFileSelect={onFileSelect}
                  />
                ) : undefined
              }
            >
              {segment}
            </BreadcrumbSegment>
          )
        })}
        {symbolPath.map((symbol, index) => {
          const siblings =
            index === 0 ? symbols : (symbolPath[index - 1]?.children ?? [])
          return (
            <BreadcrumbSegment
              key={`${symbol.name}@${symbol.selectionRange.startLineNumber}:${symbol.selectionRange.startColumn}`}
              isLast={index === symbolPath.length - 1}
              icon={getSymbolIcon(symbol.kind, "h-3.5 w-3.5")}
              onClick={() => revealDocumentSymbol({ editor, symbol })}
              dropdown={
                siblings.length > 0 ? (
                  <SymbolMenuItems
                    symbols={siblings}
                    currentSymbol={symbol}
                    onReveal={(symbol) =>
                      revealDocumentSymbol({ editor, symbol })
                    }
                  />
                ) : undefined
              }
            >
              {symbol.name}
            </BreadcrumbSegment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
