/** Snapshot of type-acquisition download activity, shared by every editor. */
export type TypeAcquisitionProgress = {
  isDownloading: boolean
  downloadedCount: number
  /** A running estimate; it grows as transitive dependencies are found. */
  estimatedTotalCount: number
}

export const idleTypeAcquisitionProgress: TypeAcquisitionProgress = {
  isDownloading: false,
  downloadedCount: 0,
  estimatedTotalCount: 0,
}

/** A registry fetch can hang forever; stop claiming to download after this. */
const STALL_TIMEOUT_MS = 10_000

export type TypeAcquisitionProgressStore = {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => TypeAcquisitionProgress
  reportStarted: () => void
  reportProgress: (downloadedCount: number, estimatedTotalCount: number) => void
  reportFinished: () => void
  /** Wraps an acquisition so the status clears once the last one settles. */
  track: <T>(acquisition: Promise<T>) => Promise<T>
}

export function createTypeAcquisitionProgressStore(): TypeAcquisitionProgressStore {
  let progress = idleTypeAcquisitionProgress
  let outstandingAcquisitions = 0
  let stallTimer: ReturnType<typeof setTimeout> | undefined
  const listeners = new Set<() => void>()

  const setProgress = (next: TypeAcquisitionProgress) => {
    progress = next
    clearTimeout(stallTimer)
    stallTimer = next.isDownloading
      ? setTimeout(
          () => setProgress(idleTypeAcquisitionProgress),
          STALL_TIMEOUT_MS,
        )
      : undefined
    for (const listener of listeners) listener()
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot: () => progress,
    reportStarted() {
      if (progress.isDownloading) return
      setProgress({ ...idleTypeAcquisitionProgress, isDownloading: true })
    },
    // Acquisition shares one set of counters across overlapping runs and zeroes
    // them per call, so an older run's next callback reports post-reset numbers.
    reportProgress(downloadedCount, estimatedTotalCount) {
      const total = Math.max(estimatedTotalCount, progress.estimatedTotalCount)
      const downloaded = Math.max(downloadedCount, progress.downloadedCount)
      setProgress({
        isDownloading: true,
        downloadedCount: total > 0 ? Math.min(downloaded, total) : downloaded,
        estimatedTotalCount: total,
      })
    },
    // Likewise a "finished" can arrive while another run is still fetching.
    reportFinished() {
      if (outstandingAcquisitions <= 1) setProgress(idleTypeAcquisitionProgress)
    },
    track(acquisition) {
      outstandingAcquisitions += 1
      return acquisition.finally(() => {
        outstandingAcquisitions -= 1
        // "finished" is skipped when a run downloads nothing, so settle here.
        if (outstandingAcquisitions === 0) {
          setProgress(idleTypeAcquisitionProgress)
        }
      })
    },
  }
}
