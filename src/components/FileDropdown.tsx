import { ChevronsUpDown, Search, X } from "lucide-react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { useEffect, useMemo, useRef, useState } from "react"
import { getFileIconClassName, getFileIconComponent } from "../utils/icons"
import type { EditorFile } from "./WorkspaceCodeEditor"

export function FileDropdown({
  files,
  currentFile,
  onFileSelect,
}: {
  files: EditorFile[]
  currentFile: string | null
  onFileSelect: (path: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)

  const [isMac, setIsMac] = useState(true)

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0)
  }, [])

  const filteredFiles = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase()
    return query
      ? files.filter((file) => file.path.toLocaleLowerCase().includes(query))
      : files
  }, [files, searchQuery])

  useEffect(() => {
    if (open) {
      setSearchQuery("")
      setFocusedIndex(-1)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    if (focusedIndex < 0 || !listRef.current) return
    const items = listRef.current.querySelectorAll("[data-file-item]")
    items[focusedIndex]?.scrollIntoView({ block: "nearest" })
  }, [focusedIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setFocusedIndex((prev) =>
          prev < filteredFiles.length - 1 ? prev + 1 : 0,
        )
        break
      case "ArrowUp":
        e.preventDefault()
        setFocusedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredFiles.length - 1,
        )
        break
      case "Enter":
        e.preventDefault()
        if (focusedIndex >= 0 && filteredFiles[focusedIndex]) {
          onFileSelect(filteredFiles[focusedIndex].path)
          setOpen(false)
        }
        break
      case "Escape":
        e.preventDefault()
        setOpen(false)
        break
    }
  }

  const displayName = currentFile
    ? (currentFile.split("/").pop() ?? currentFile)
    : "Select file"

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Anchor asChild>
        <div
          ref={anchorRef}
          className="relative flex h-7 w-32 sm:w-48 transition-[margin] duration-300 ease-in-out"
        >
          {!open ? (
            <button
              onClick={() => setOpen(true)}
              className="flex h-full w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm select-none"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate text-xs text-slate-700">
                  {displayName}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="hidden sm:inline-flex h-4 items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[10px] font-medium text-slate-400">
                  <span className="text-xs">{isMac ? "⌘" : "Ctrl"}</span>P
                </kbd>
                <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
              </div>
            </button>
          ) : (
            <div className="relative h-full w-full">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={inputRef}
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder={displayName}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setFocusedIndex(0)
                }}
                onKeyDown={handleKeyDown}
                className="h-full w-full rounded-md border border-blue-500 bg-white pl-7 pr-7 text-xs text-slate-700 outline-none shadow-sm ring-1 ring-inset ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearchQuery("")
                    inputRef.current?.focus()
                  }}
                  className="absolute right-1.5 top-1/2 grid h-4 w-4 -translate-y-1/2 place-items-center rounded text-slate-400 hover:text-slate-600"
                >
                  <X aria-hidden="true" className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[var(--radix-popover-trigger-width)] rounded-md border border-slate-200 bg-white shadow-md animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onFocusOutside={(e) => {
            if (anchorRef.current?.contains(e.target as Node)) {
              e.preventDefault()
            }
          }}
          onInteractOutside={(e) => {
            if (anchorRef.current?.contains(e.target as Node)) {
              e.preventDefault()
            }
          }}
        >
          <div ref={listRef} className="max-h-64 overflow-y-auto p-1">
            {filteredFiles.length > 0 ? (
              filteredFiles.map((file, index) => {
                const fileName = file.path.split("/").pop() ?? file.path
                const FileIcon = getFileIconComponent(fileName)
                const iconClassName = getFileIconClassName(fileName)
                const isActive = file.path === currentFile
                const isFocused = index === focusedIndex
                return (
                  <button
                    key={file.path}
                    data-file-item
                    type="button"
                    onClick={() => {
                      onFileSelect(file.path)
                      setOpen(false)
                    }}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs outline-none ${
                      isFocused
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600"
                    } ${isActive ? "font-medium text-slate-900" : ""}`}
                  >
                    <FileIcon
                      className={`h-3.5 w-3.5 shrink-0 ${iconClassName ?? "text-slate-400"}`}
                    />
                    <span className="truncate">{file.path}</span>
                  </button>
                )
              })
            ) : (
              <div className="px-2 py-3 text-center text-xs text-slate-400">
                No files match &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
