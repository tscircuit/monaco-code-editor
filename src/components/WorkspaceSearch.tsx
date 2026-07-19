import {
  CaseSensitive,
  ChevronDown,
  ChevronRight,
  FileSearch,
  Regex,
  Replace,
  ReplaceAll,
  Search,
  WholeWord,
} from "lucide-react"
import type * as monaco from "monaco-editor"
import { Dialog as DialogPrimitive } from "radix-ui"
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import {
  searchWorkspaceModels,
  type WorkspaceSearchMatch,
} from "../utils/workspaceSearch"
import type { EditorFile } from "./WorkspaceCodeEditor"
import { Button } from "./ui/button"
import { Input } from "./ui/input"

export type WorkspaceSearchProps = {
  files: EditorFile[]
  currentFile: string | null
  open: boolean
  canReplace: boolean
  getModel: (path: string) => monaco.editor.ITextModel | undefined
  onOpenChange: (open: boolean) => void
  onNavigate: (match: WorkspaceSearchMatch) => void
  onReplace: (params: {
    matches: WorkspaceSearchMatch[]
    replacement: string
    useRegex: boolean
  }) => void
}

function SearchOptionButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={active ? "bg-slate-200 text-slate-950" : "text-slate-500"}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function MatchPreview({ match }: { match: WorkspaceSearchMatch }) {
  const matchStart = Math.max(0, match.range.startColumn - 1)
  const matchEnd =
    match.range.startLineNumber === match.range.endLineNumber
      ? Math.max(matchStart, match.range.endColumn - 1)
      : match.linePreview.length
  const windowStart = Math.max(0, matchStart - 48)
  const windowEnd = Math.min(match.linePreview.length, matchEnd + 72)
  const before = match.linePreview.slice(windowStart, matchStart)
  const matched = match.linePreview.slice(matchStart, matchEnd)
  const after = match.linePreview.slice(matchEnd, windowEnd)

  return (
    <span className="min-w-0 flex-1 truncate text-left font-mono text-xs text-slate-600">
      {windowStart > 0 && "…"}
      {before}
      <mark className="rounded-sm bg-amber-200 px-0.5 font-semibold text-slate-950">
        {matched || match.matchText}
      </mark>
      {after}
      {windowEnd < match.linePreview.length && "…"}
    </span>
  )
}

export function WorkspaceSearch({
  files,
  currentFile,
  open,
  canReplace,
  getModel,
  onOpenChange,
  onNavigate,
  onReplace,
}: WorkspaceSearchProps) {
  const [query, setQuery] = useState("")
  const [replacement, setReplacement] = useState("")
  const [matchCase, setMatchCase] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set())
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchRevision, setSearchRevision] = useState(0)
  const selectedMatchRef = useRef<HTMLButtonElement | null>(null)
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    if (!open) return
    setQuery("")
    setReplacement("")
    setMatchCase(false)
    setWholeWord(false)
    setUseRegex(false)
    setCollapsedFiles(new Set())
    setSelectedIndex(0)
  }, [open])

  const searchResult = useMemo(
    () =>
      searchWorkspaceModels({
        files,
        getModel,
        options: {
          query: deferredQuery,
          matchCase,
          wholeWord,
          useRegex,
        },
      }),
    [
      deferredQuery,
      files,
      getModel,
      matchCase,
      searchRevision,
      useRegex,
      wholeWord,
    ],
  )

  const visibleMatches = useMemo(
    () =>
      searchResult.files.flatMap((fileResult) =>
        collapsedFiles.has(fileResult.file.path) ? [] : fileResult.matches,
      ),
    [collapsedFiles, searchResult.files],
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [deferredQuery, matchCase, wholeWord, useRegex])

  useEffect(() => {
    if (selectedIndex < visibleMatches.length) return
    setSelectedIndex(Math.max(0, visibleMatches.length - 1))
  }, [selectedIndex, visibleMatches.length])

  useEffect(() => {
    selectedMatchRef.current?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex])

  const replaceMatches = (matches: WorkspaceSearchMatch[]) => {
    if (!canReplace || matches.length === 0) return
    onReplace({ matches, replacement, useRegex })
    setSearchRevision((revision) => revision + 1)
  }

  const handleSearchKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setSelectedIndex((index) =>
        Math.min(index + 1, Math.max(0, visibleMatches.length - 1)),
      )
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setSelectedIndex((index) => Math.max(0, index - 1))
    } else if (event.key === "Enter") {
      event.preventDefault()
      const match = visibleMatches[selectedIndex]
      if (match) onNavigate(match)
    }
  }

  let runningMatchIndex = -1

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[1px]" />
        <DialogPrimitive.Content className="fixed left-1/2 top-[7vh] z-50 flex max-h-[min(42rem,86vh)] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 focus:outline-none">
          <DialogPrimitive.Title className="sr-only">
            Search workspace
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Find and replace text across workspace files.
          </DialogPrimitive.Description>

          <div className="border-b border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center gap-2">
              <Search aria-hidden="true" className="h-4 w-4 text-slate-400" />
              <Input
                autoFocus
                autoComplete="off"
                aria-label="Search across workspace files"
                className="h-9 flex-1 bg-white font-mono text-sm"
                placeholder="Search across files"
                spellCheck={false}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
              <div className="flex items-center rounded-md border border-slate-200 bg-white p-0.5">
                <SearchOptionButton
                  active={matchCase}
                  label="Match case"
                  onClick={() => setMatchCase((value) => !value)}
                >
                  <CaseSensitive />
                </SearchOptionButton>
                <SearchOptionButton
                  active={wholeWord}
                  label="Match whole word"
                  onClick={() => setWholeWord((value) => !value)}
                >
                  <WholeWord />
                </SearchOptionButton>
                <SearchOptionButton
                  active={useRegex}
                  label="Use regular expression"
                  onClick={() => setUseRegex((value) => !value)}
                >
                  <Regex />
                </SearchOptionButton>
              </div>
            </div>

            {canReplace && (
              <div className="mt-2 flex items-center gap-2 pl-6">
                <Replace
                  aria-hidden="true"
                  className="h-4 w-4 text-slate-400"
                />
                <Input
                  autoComplete="off"
                  aria-label="Replace matches with"
                  className="h-9 flex-1 bg-white font-mono text-sm"
                  placeholder="Replace"
                  spellCheck={false}
                  value={replacement}
                  onChange={(event) => setReplacement(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    searchResult.totalMatches === 0 || !!searchResult.error
                  }
                  title="Replace all workspace matches"
                  onClick={() =>
                    replaceMatches(
                      searchResult.files.flatMap((result) => result.matches),
                    )
                  }
                >
                  <ReplaceAll />
                  Replace all
                </Button>
              </div>
            )}

            {searchResult.error && (
              <p className="mt-2 pl-6 text-xs text-red-600" role="alert">
                {searchResult.error}
              </p>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {!query ? (
              <div className="grid min-h-40 place-items-center px-4 text-center text-sm text-slate-500">
                <div>
                  <FileSearch className="mx-auto mb-3 h-7 w-7 text-slate-300" />
                  Search the contents of every workspace file from one place.
                </div>
              </div>
            ) : searchResult.totalMatches === 0 && !searchResult.error ? (
              <div className="grid min-h-40 place-items-center px-4 text-sm text-slate-500">
                No results for “{query}”
              </div>
            ) : (
              searchResult.files.map((fileResult) => {
                const collapsed = collapsedFiles.has(fileResult.file.path)

                return (
                  <section key={fileResult.file.path} className="mb-1">
                    <div className="group flex items-center rounded-md px-1 hover:bg-slate-50">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 py-2 text-left text-xs font-semibold text-slate-700 outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
                        aria-expanded={!collapsed}
                        onClick={() =>
                          setCollapsedFiles((current) => {
                            const next = new Set(current)
                            if (next.has(fileResult.file.path)) {
                              next.delete(fileResult.file.path)
                            } else {
                              next.add(fileResult.file.path)
                            }
                            return next
                          })
                        }
                      >
                        {collapsed ? <ChevronRight /> : <ChevronDown />}
                        <span className="truncate font-mono">
                          {fileResult.file.path}
                        </span>
                        {fileResult.file.path === currentFile && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-sans text-[9px] uppercase tracking-wide text-slate-500">
                            Current
                          </span>
                        )}
                        <span className="ml-auto tabular-nums text-slate-400">
                          {fileResult.matches.length}
                        </span>
                      </button>
                      {canReplace && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-slate-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                          aria-label={`Replace all matches in ${fileResult.file.path}`}
                          title={`Replace ${fileResult.matches.length} matches in this file`}
                          onClick={() => replaceMatches(fileResult.matches)}
                        >
                          <ReplaceAll />
                        </Button>
                      )}
                    </div>

                    {!collapsed &&
                      fileResult.matches.map((match) => {
                        runningMatchIndex += 1
                        const matchIndex = runningMatchIndex
                        const selected = matchIndex === selectedIndex

                        return (
                          <div
                            key={`${match.range.startLineNumber}:${match.range.startColumn}:${match.range.endLineNumber}:${match.range.endColumn}`}
                            className={`group ml-5 flex items-center rounded-md ${
                              selected ? "bg-slate-100" : "hover:bg-slate-50"
                            }`}
                          >
                            <button
                              ref={selected ? selectedMatchRef : null}
                              type="button"
                              className="flex min-w-0 flex-1 items-center gap-3 px-2 py-1.5 outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-slate-400"
                              onClick={() => onNavigate(match)}
                              onMouseMove={() => setSelectedIndex(matchIndex)}
                            >
                              <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-slate-400">
                                {match.range.startLineNumber}
                              </span>
                              <MatchPreview match={match} />
                            </button>
                            {canReplace && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                className="mr-1 text-slate-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                                aria-label={`Replace match on line ${match.range.startLineNumber}`}
                                title="Replace this match"
                                onClick={() => replaceMatches([match])}
                              >
                                <Replace />
                              </Button>
                            )}
                          </div>
                        )
                      })}
                  </section>
                )
              })
            )}
          </div>

          <div className="flex items-center border-t border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
            <span>↑↓ Navigate · ↵ Open · Esc Close</span>
            <span className="ml-auto tabular-nums">
              {searchResult.totalMatches} matches in {searchResult.files.length}{" "}
              {searchResult.files.length === 1 ? "file" : "files"}
              {searchResult.limitReached && " (result limit reached)"}
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
