import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { suspendSemanticDiagnostics } from "../monaco/monacoTypeScript"
import { acquireTscircuitTypes } from "../monaco/typeAcquisition"
import {
  createInitialAcquisitionTracker,
  type InitialAcquisitionTracker,
} from "./initialAcquisitionTracker"

/**
 * Longest that semantic errors stay hidden. A stalled registry request never
 * settles, so fail open rather than muting diagnostics for the whole session.
 */
const MAX_DIAGNOSTICS_SUSPENSION_MS = 10_000

/** Acquires initial types immediately, then debounces background updates. */
export function useTscircuitTypeAcquisition(
  source: string | null | undefined,
  options: {
    enabled?: boolean
    delayMs?: number
    readinessKey?: string
  } = {},
): boolean {
  const { enabled = true, delayMs = 250, readinessKey = "initial" } = options
  const hasCompletedInitialAcquisition = useRef(false)
  const releaseDiagnostics = useRef<(() => void) | null>(null)
  const initialAcquisitions = useRef<InitialAcquisitionTracker | null>(null)
  const acquiredReadinessKey = useRef(readinessKey)
  const [completedReadinessKey, setCompletedReadinessKey] = useState<
    string | null
  >(null)

  const suspensionTimeout = useRef(0)
  const restoreDiagnostics = useCallback(() => {
    releaseDiagnostics.current?.()
    releaseDiagnostics.current = null
    window.clearTimeout(suspensionTimeout.current)
    suspensionTimeout.current = 0
  }, [])

  const restoreDiagnosticsWhenIdle = useCallback(() => {
    queueMicrotask(() => {
      if (
        !initialAcquisitions.current?.hasPending() &&
        !hasCompletedInitialAcquisition.current
      ) {
        restoreDiagnostics()
      }
    })
  }, [restoreDiagnostics])

  // Release any suspension left behind when the editor unmounts mid-download.
  useEffect(() => restoreDiagnostics, [restoreDiagnostics])

  // Layout phase, because the workspace creates its models in one too and
  // Monaco validates a model as soon as it exists. A passive effect would
  // suspend after the first markers had already been drawn.
  useLayoutEffect(() => {
    // A new file set is a new project, so it gets its own initial acquisition
    // even though the editor was not remounted. Any existing suspension carries
    // over so nothing surfaces between the two.
    if (readinessKey !== acquiredReadinessKey.current) {
      acquiredReadinessKey.current = readinessKey
      hasCompletedInitialAcquisition.current = false
      setCompletedReadinessKey(null)
      window.clearTimeout(suspensionTimeout.current)
      suspensionTimeout.current = 0
      // Previous runs keep the old tracker, so their `settle()` can no longer
      // claim completion for this file set.
      initialAcquisitions.current = createInitialAcquisitionTracker()
    }

    if (!enabled || source == null) {
      restoreDiagnostics()
      // Abandon in-flight runs rather than cancelling them: a cancelled run
      // that already started stays pending so its types can still land, which
      // would keep a later re-enable suspended until it resolved.
      initialAcquisitions.current = createInitialAcquisitionTracker()
      return
    }

    initialAcquisitions.current ??= createInitialAcquisitionTracker()
    const tracker = initialAcquisitions.current

    let isActive = true
    const isInitialAcquisition = !hasCompletedInitialAcquisition.current
    const acquisitionRun = isInitialAcquisition ? tracker.begin() : undefined
    // Only the first pass suspends: later ones run while the user types, and
    // clearing markers per keystroke would flicker rather than prevent it.
    if (isInitialAcquisition && !suspensionTimeout.current) {
      releaseDiagnostics.current ??= suspendSemanticDiagnostics()
      suspensionTimeout.current = window.setTimeout(() => {
        restoreDiagnostics()
        // One-shot, or the next keystroke would suspend again and wipe markers
        // on every edit. Readiness stays false — the types never arrived.
        hasCompletedInitialAcquisition.current = true
      }, MAX_DIAGNOSTICS_SUSPENSION_MS)
    }
    const delay = isInitialAcquisition ? 0 : delayMs
    const timer = window.setTimeout(() => {
      acquisitionRun?.markStarted()
      void acquireTscircuitTypes(source)
        .catch((error) => console.warn("Failed to acquire types", error))
        .finally(() => {
          if (acquisitionRun) {
            if (acquisitionRun.settle()) {
              restoreDiagnostics()
              hasCompletedInitialAcquisition.current = true
              setCompletedReadinessKey(readinessKey)
            } else {
              restoreDiagnosticsWhenIdle()
            }
            return
          }

          // Nothing to release: the initial acquisition already restored them.
          if (!isActive) return
          setCompletedReadinessKey(readinessKey)
        })
    }, delay)

    return () => {
      isActive = false
      window.clearTimeout(timer)
      if (acquisitionRun) {
        acquisitionRun.cancel()
        restoreDiagnosticsWhenIdle()
      }
    }
  }, [
    enabled,
    source,
    delayMs,
    readinessKey,
    restoreDiagnostics,
    restoreDiagnosticsWhenIdle,
  ])

  return enabled && completedReadinessKey === readinessKey
}
