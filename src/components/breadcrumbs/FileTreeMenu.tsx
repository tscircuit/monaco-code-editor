import { Folder } from "lucide-react"
import type { KeyboardEvent, ReactNode, RefObject } from "react"
import { useContext, useEffect, useMemo, useRef, useState } from "react"
import { collectFiles, type FileTreeNode } from "../../utils/build-file-tree"
import { getFileIcon } from "../../utils/icons"
import { fuzzyMatch } from "../../utils/quickOpen"
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "../ui/dropdown-menu"
import {
  CloseMenuContext,
  getMenuItemClassName,
  menuItemBaseClassName,
} from "./shared"

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

export function FileTreeMenu({
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
