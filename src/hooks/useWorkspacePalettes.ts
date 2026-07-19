import { useCallback, useEffect, useState } from "react"

/**
 * Open/close state for the Quick Open and workspace search palettes, plus the
 * global Ctrl/Cmd+P and Ctrl/Cmd+Shift+F shortcuts that toggle them. The two
 * palettes are mutually exclusive: opening one closes the other.
 */
export function useWorkspacePalettes() {
  const [quickOpenOpen, setQuickOpenOpen] = useState(false)
  const [workspaceSearchOpen, setWorkspaceSearchOpen] = useState(false)

  const openQuickOpen = useCallback(() => {
    setWorkspaceSearchOpen(false)
    setQuickOpenOpen(true)
  }, [])

  const openWorkspaceSearch = useCallback(() => {
    setQuickOpenOpen(false)
    setWorkspaceSearchOpen(true)
  }, [])

  useEffect(() => {
    const openWorkspaceCommand = (event: KeyboardEvent) => {
      if ((!event.ctrlKey && !event.metaKey) || event.altKey) return

      const key = event.key.toLowerCase()
      if (key === "p" && !event.shiftKey) {
        event.preventDefault()
        openQuickOpen()
      } else if (key === "f" && event.shiftKey) {
        event.preventDefault()
        openWorkspaceSearch()
      }
    }

    window.addEventListener("keydown", openWorkspaceCommand)
    return () => window.removeEventListener("keydown", openWorkspaceCommand)
  }, [openQuickOpen, openWorkspaceSearch])

  return {
    quickOpenOpen,
    setQuickOpenOpen,
    workspaceSearchOpen,
    setWorkspaceSearchOpen,
    openQuickOpen,
    openWorkspaceSearch,
  }
}
