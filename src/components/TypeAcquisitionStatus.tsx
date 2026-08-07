import { Loader2 } from "lucide-react"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import {
  getTypeAcquisitionProgress,
  subscribeToTypeAcquisitionProgress,
} from "../monaco/typeAcquisition"

/** Ignore downloads that finish quickly — a 100ms spinner reads as a glitch. */
const SHOW_DELAY_MS = 400
/** Once shown, stay up long enough to be readable instead of blinking away. */
const MIN_VISIBLE_MS = 700

/**
 * Toolbar spinner for downloading types. Semantic errors are suppressed during
 * the first download, so it doubles as an explanation for the missing errors.
 */
export function TypeAcquisitionStatus({ enabled }: { enabled: boolean }) {
  const progress = useSyncExternalStore(
    subscribeToTypeAcquisitionProgress,
    getTypeAcquisitionProgress,
    getTypeAcquisitionProgress,
  )
  const isDownloading = enabled && progress.isDownloading
  const [isVisible, setIsVisible] = useState(false)
  const shownAtRef = useRef(0)

  useEffect(() => {
    if (isDownloading) {
      if (isVisible) return
      const timer = window.setTimeout(() => {
        shownAtRef.current = Date.now()
        setIsVisible(true)
      }, SHOW_DELAY_MS)
      return () => window.clearTimeout(timer)
    }

    if (!isVisible) return
    const remaining = MIN_VISIBLE_MS - (Date.now() - shownAtRef.current)
    if (remaining <= 0) {
      setIsVisible(false)
      return
    }
    const timer = window.setTimeout(() => setIsVisible(false), remaining)
    return () => window.clearTimeout(timer)
  }, [isDownloading, isVisible])

  // A lone dependency reads better without a "1/1" in the tooltip.
  const counts =
    progress.estimatedTotalCount > 1
      ? ` ${progress.downloadedCount}/${progress.estimatedTotalCount}`
      : ""

  return (
    // Collapses to zero width when idle so it never shortens the breadcrumbs.
    <div
      className={`flex items-center overflow-hidden text-slate-400 transition-[max-width,opacity,padding] duration-300 ease-out motion-reduce:transition-none ${
        isVisible
          ? "max-w-6 pl-2 opacity-100"
          : "pointer-events-none max-w-0 pl-0 opacity-0"
      }`}
      role="status"
      title={`Downloading types${counts}…`}
    >
      {/* Live regions announce content arriving, not the wrapper widening, so
          the label mounts with the spinner. Count-free, or it re-announces. */}
      {isVisible && (
        <>
          <Loader2 className="h-3 w-3 shrink-0 animate-spin motion-reduce:animate-none" />
          <span className="sr-only">Downloading types…</span>
        </>
      )}
    </div>
  )
}
