import { Search } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  getFileIconClassName,
  getFileIconComponent,
} from "../utils/getFileIcon"
import { getQuickOpenMatches } from "../utils/quickOpen"
import type { EditorFile } from "./WorkspaceCodeEditor"
import { Input } from "./ui/input"

export type QuickOpenProps = {
  files: EditorFile[]
  currentFile: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onFileSelect: (path: string) => void
}

export function QuickOpen({
  files,
  currentFile,
  open,
  onOpenChange,
  onFileSelect,
}: QuickOpenProps) {
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedItemRef = useRef<HTMLButtonElement | null>(null)
  const matches = useMemo(
    () => getQuickOpenMatches(files, query, currentFile),
    [currentFile, files, query],
  )

  useEffect(() => {
    if (!open) return
    setQuery("")
    setSelectedIndex(0)
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    selectedItemRef.current?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex])

  const openFile = (path: string) => {
    onFileSelect(path)
    onOpenChange(false)
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[1px]" />
        <DialogPrimitive.Content className="fixed left-1/2 top-[12vh] z-50 flex max-h-[min(32rem,76vh)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 focus:outline-none">
          <DialogPrimitive.Title className="sr-only">
            Quick Open
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search workspace files and press Enter to open one.
          </DialogPrimitive.Description>

          <div className="flex items-center gap-2 border-b border-slate-200 px-3">
            <Search aria-hidden="true" className="h-4 w-4 text-slate-400" />
            <Input
              autoComplete="off"
              autoFocus
              aria-controls="quick-open-results"
              aria-activedescendant={
                matches[selectedIndex]
                  ? `quick-open-${selectedIndex}`
                  : undefined
              }
              aria-label="Search workspace files"
              className="h-11 border-0 bg-transparent px-0 font-mono text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0"
              placeholder="Search files…"
              spellCheck={false}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault()
                  setSelectedIndex((index) =>
                    Math.min(index + 1, Math.max(0, matches.length - 1)),
                  )
                } else if (event.key === "ArrowUp") {
                  event.preventDefault()
                  setSelectedIndex((index) => Math.max(index - 1, 0))
                } else if (event.key === "Home") {
                  event.preventDefault()
                  setSelectedIndex(0)
                } else if (event.key === "End") {
                  event.preventDefault()
                  setSelectedIndex(Math.max(0, matches.length - 1))
                } else if (event.key === "Enter") {
                  event.preventDefault()
                  const selectedMatch = matches[selectedIndex]
                  if (selectedMatch) openFile(selectedMatch.file.path)
                } else if (event.key === "Escape") {
                  event.preventDefault()
                  onOpenChange(false)
                }
              }}
            />
            <kbd className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[10px] text-slate-500 shadow-sm">
              ⌘/Ctrl P
            </kbd>
          </div>

          <div
            id="quick-open-results"
            role="listbox"
            aria-label="Workspace files"
            className="min-h-0 overflow-y-auto p-1.5"
          >
            {matches.length ? (
              matches.map((match, index) => {
                const FileIcon = getFileIconComponent(match.file.path)
                const matchedIndices = new Set(match.matchedIndices)
                const isSelected = index === selectedIndex

                return (
                  <button
                    key={match.file.path}
                    id={`quick-open-${index}`}
                    ref={isSelected ? selectedItemRef : null}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left font-mono text-sm outline-none ${
                      isSelected
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100 focus-visible:bg-slate-100"
                    }`}
                    onClick={() => openFile(match.file.path)}
                    onMouseMove={() => setSelectedIndex(index)}
                  >
                    <FileIcon
                      aria-hidden="true"
                      className={`h-4 w-4 shrink-0 ${
                        isSelected
                          ? "text-slate-300"
                          : getFileIconClassName(match.file.path)
                      }`}
                    />
                    <span className="min-w-0 truncate">
                      {Array.from(match.file.path).map(
                        (character, charIndex) =>
                          matchedIndices.has(charIndex) ? (
                            <mark
                              key={`${charIndex}-${character}`}
                              className={
                                isSelected
                                  ? "bg-transparent font-semibold text-white underline decoration-slate-400 underline-offset-2"
                                  : "bg-transparent font-semibold text-slate-950 underline decoration-slate-300 underline-offset-2"
                              }
                            >
                              {character}
                            </mark>
                          ) : (
                            character
                          ),
                      )}
                    </span>
                    {match.file.path === currentFile && (
                      <span className="ml-auto shrink-0 font-sans text-[10px] uppercase tracking-wide text-slate-400">
                        Current
                      </span>
                    )}
                  </button>
                )
              })
            ) : (
              <div className="grid min-h-24 place-items-center px-4 text-sm text-slate-500">
                {query ? `No files match “${query}”` : "No files"}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
            <span>Esc Close</span>
            <span className="ml-auto tabular-nums">
              {matches.length} {matches.length === 1 ? "file" : "files"}
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
