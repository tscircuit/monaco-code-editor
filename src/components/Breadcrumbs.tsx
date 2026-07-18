import { ChevronRight, Folder } from "lucide-react"
import type * as monaco from "monaco-editor"
import type { KeyboardEvent, ReactNode, RefObject } from "react"
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  type DocumentSymbol,
  getDocumentSymbols,
  isCodeFile,
} from "../monaco/monacoTypeScript"
import {
  buildFileTree,
  collectFiles,
  type FileTreeNode,
} from "../utils/build-file-tree"
import { getDocumentSymbolPath } from "../utils/documentSymbolPath"
import { getFileIcon, getSymbolIcon } from "../utils/icons"
import { isHiddenFile } from "../utils/isHiddenFile"
import { fuzzyMatch } from "../utils/quickOpen"
import { Breadcrumb, BreadcrumbList } from "./ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

export type BreadcrumbsProps = {
  editor: monaco.editor.IStandaloneCodeEditor | null
  model: monaco.editor.ITextModel | null
  filePath: string | null
  files?: { path: string }[]
  onFileSelect?: (path: string) => void
}

const menuItemBaseClassName =
  "gap-1.5 py-0.5 text-xs [&_svg:not([class*='size-'])]:size-3.5"

const getMenuItemClassName = (isActive: boolean) =>
  `${menuItemBaseClassName} ${isActive ? "bg-slate-100" : ""}`

/** Lets menu content close its enclosing breadcrumb dropdown. */
const CloseMenuContext = createContext<() => void>(() => {})

function loadDocumentSymbols({
  model,
  isActive,
  setSymbols,
}: {
  model: monaco.editor.ITextModel
  isActive: () => boolean
  setSymbols: (symbols: DocumentSymbol[]) => void
}) {
  getDocumentSymbols(model)
    .then((symbols) => {
      if (isActive()) setSymbols(symbols)
    })
    .catch((error) => {
      console.warn("Failed to load document symbols", error)
    })
}

function revealDocumentSymbol({
  editor,
  symbol,
}: {
  editor: monaco.editor.IStandaloneCodeEditor | null
  symbol: DocumentSymbol
}) {
  if (!editor) return

  const position = {
    lineNumber: symbol.selectionRange.startLineNumber,
    column: symbol.selectionRange.startColumn,
  }
  editor.revealPositionInCenter(position)
  editor.setPosition(position)
  editor.focus()
}

export function Breadcrumbs({
  editor,
  model,
  filePath,
  files,
  onFileSelect,
}: BreadcrumbsProps) {
  const [symbols, setSymbols] = useState<DocumentSymbol[]>([])
  const [cursor, setCursor] = useState<monaco.Position | null>(null)

  // Only code files have a TypeScript outline; other files (md, json, …)
  // still get file-path breadcrumbs.
  const hasSymbolOutline = isCodeFile(filePath)

  // Refetch the file outline whenever the active model or its content
  // changes; the TS worker call is cheap since it reuses the language
  // service's already-parsed source file.
  useEffect(() => {
    if (!editor || !model || !hasSymbolOutline) {
      setSymbols([])
      setCursor(null)
      return
    }

    let isActive = true
    const symbolLoadRequest = {
      model,
      isActive: () => isActive,
      setSymbols,
    }
    loadDocumentSymbols(symbolLoadRequest)
    setCursor(editor.getPosition())

    const changeDisposable = model.onDidChangeContent(() =>
      loadDocumentSymbols(symbolLoadRequest),
    )
    const cursorDisposable = editor.onDidChangeCursorPosition((event) =>
      setCursor(event.position),
    )

    return () => {
      isActive = false
      changeDisposable.dispose()
      cursorDisposable.dispose()
    }
  }, [editor, model, hasSymbolOutline])

  const symbolPath = useMemo(
    () =>
      cursor
        ? getDocumentSymbolPath(symbols, cursor.lineNumber, cursor.column)
        : [],
    [symbols, cursor],
  )

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

function FileLeafItem({
  node,
  isHighlighted,
  onFileSelect,
}: {
  node: FileTreeNode
  isHighlighted: boolean
  onFileSelect: (path: string) => void
}) {
  return (
    <DropdownMenuItem
      onSelect={() => onFileSelect(node.path)}
      className={getMenuItemClassName(isHighlighted)}
    >
      {getFileIcon(node.name)}
      {node.name}
      {node.path.includes("/") && (
        <span className="truncate text-slate-400">
          {node.path.slice(0, node.path.lastIndexOf("/"))}
        </span>
      )}
    </DropdownMenuItem>
  )
}

function FileTreeMenu({
  nodes,
  currentPath,
  onFileSelect,
}: {
  nodes: FileTreeNode[]
  currentPath: string
  onFileSelect: (path: string) => void
}) {
  const closeMenu = useContext(CloseMenuContext)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const firstItemRef = useRef<HTMLDivElement>(null)

  // Radix focuses the menu content when it opens; grab focus afterwards so
  // the user can type immediately.
  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [])

  const allFiles = useMemo(() => collectFiles(nodes), [nodes])

  // Same fuzzy matching as the Quick Open palette, scoped to this subtree.
  const matches = useMemo(() => {
    const needle = query.trim()
    if (!needle) return null
    return allFiles
      .map((node) => ({ node, match: fuzzyMatch(needle, node.path) }))
      .filter((entry) => entry.match !== null)
      .sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0))
      .map((entry) => entry.node)
  }, [allFiles, query])

  const highlightedIndex = matches
    ? Math.min(selectedIndex, matches.length - 1)
    : 0

  let menuItems: ReactNode
  if (matches === null) {
    menuItems = (
      <FileTreeMenuItems
        nodes={nodes}
        currentPath={currentPath}
        onFileSelect={onFileSelect}
        firstItemRef={firstItemRef}
      />
    )
  } else if (matches.length === 0) {
    menuItems = (
      <div className="px-1.5 py-1 text-xs text-slate-400">
        No matching files
      </div>
    )
  } else {
    menuItems = matches.map((node, index) => (
      <FileLeafItem
        key={node.path}
        node={node}
        isHighlighted={index === highlightedIndex}
        onFileSelect={onFileSelect}
      />
    ))
  }

  return (
    <>
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setSelectedIndex(0)
        }}
        onKeyDown={(event) =>
          handleFileMenuKeyDown({
            event,
            matches,
            highlightedIndex,
            firstItemRef,
            setSelectedIndex,
            onFileSelect,
            closeMenu,
          })
        }
        placeholder="Search files…"
        className="mb-1 w-full rounded border border-slate-200 bg-transparent px-1.5 py-0.5 font-mono text-xs outline-none placeholder:text-slate-400 focus:border-slate-300"
      />
      {menuItems}
    </>
  )
}

function handleFileMenuKeyDown({
  event,
  matches,
  highlightedIndex,
  firstItemRef,
  setSelectedIndex,
  onFileSelect,
  closeMenu,
}: {
  event: KeyboardEvent<HTMLInputElement>
  matches: FileTreeNode[] | null
  highlightedIndex: number
  firstItemRef: RefObject<HTMLDivElement | null>
  setSelectedIndex: (index: number) => void
  onFileSelect: (path: string) => void
  closeMenu: () => void
}) {
  if (event.key === "Escape") return

  if (matches === null) {
    if (event.key === "ArrowDown") {
      firstItemRef.current?.focus()
      event.preventDefault()
    }
    event.stopPropagation()
    return
  }

  if (event.key === "Enter") {
    const file = matches[highlightedIndex]
    if (file) {
      onFileSelect(file.path)
      closeMenu()
    }
  } else if (event.key === "ArrowDown") {
    setSelectedIndex(Math.min(highlightedIndex + 1, matches.length - 1))
  } else if (event.key === "ArrowUp") {
    setSelectedIndex(Math.max(highlightedIndex - 1, 0))
  } else {
    event.stopPropagation()
    return
  }

  event.preventDefault()
  event.stopPropagation()
}

function FileTreeMenuItems({
  nodes,
  currentPath,
  onFileSelect,
  firstItemRef,
}: {
  nodes: FileTreeNode[]
  currentPath: string
  onFileSelect: (path: string) => void
  firstItemRef?: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <>
      {nodes.map((node, index) =>
        node.children ? (
          <DropdownMenuSub key={node.path}>
            <DropdownMenuSubTrigger
              ref={index === 0 ? firstItemRef : undefined}
              className={menuItemBaseClassName}
            >
              <Folder className="text-slate-400" />
              {node.name}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
              <FileTreeMenuItems
                nodes={node.children}
                currentPath={currentPath}
                onFileSelect={onFileSelect}
              />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : (
          <DropdownMenuItem
            key={node.path}
            ref={index === 0 ? firstItemRef : undefined}
            onSelect={() => onFileSelect(node.path)}
            className={getMenuItemClassName(node.path === currentPath)}
          >
            {getFileIcon(node.name)}
            {node.name}
          </DropdownMenuItem>
        ),
      )}
    </>
  )
}

function SymbolMenuItems({
  symbols,
  currentSymbol,
  onReveal,
}: {
  symbols: DocumentSymbol[]
  currentSymbol: DocumentSymbol
  onReveal: (symbol: DocumentSymbol) => void
}) {
  return (
    <>
      {symbols.map((symbol) => (
        <DropdownMenuItem
          key={`${symbol.name}@${symbol.selectionRange.startLineNumber}:${symbol.selectionRange.startColumn}`}
          onSelect={() => onReveal(symbol)}
          className={getMenuItemClassName(symbol === currentSymbol)}
        >
          {getSymbolIcon(symbol.kind)}
          {symbol.name}
        </DropdownMenuItem>
      ))}
    </>
  )
}

function BreadcrumbSegment({
  children,
  icon,
  onClick,
  dropdown,
  isLast,
}: {
  children: ReactNode
  icon?: ReactNode
  onClick?: () => void
  dropdown?: ReactNode
  isLast: boolean
}) {
  const [open, setOpen] = useState(false)
  const label = (
    <>
      {icon}
      {children}
    </>
  )
  const labelClassName = `flex items-center gap-1 rounded px-1 py-0.5 font-mono ${
    isLast ? "text-slate-900" : "text-slate-500"
  }`

  let content: ReactNode
  if (dropdown) {
    content = (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`${labelClassName} transition-colors hover:bg-slate-100 hover:text-slate-900 data-[state=open]:bg-slate-100 data-[state=open]:text-slate-900`}
          >
            {label}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-72 w-auto min-w-[10rem] overflow-y-auto"
        >
          <CloseMenuContext.Provider value={() => setOpen(false)}>
            {dropdown}
          </CloseMenuContext.Provider>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  } else if (onClick) {
    content = (
      <button
        type="button"
        onClick={onClick}
        className={`${labelClassName} transition-colors hover:bg-slate-100 hover:text-slate-900`}
      >
        {label}
      </button>
    )
  } else {
    content = <span className={labelClassName}>{label}</span>
  }

  return (
    <li className="flex shrink-0 items-center gap-0.5">
      {content}
      {!isLast && (
        <ChevronRight
          aria-hidden="true"
          className="h-3 w-3 shrink-0 text-slate-300"
        />
      )}
    </li>
  )
}
