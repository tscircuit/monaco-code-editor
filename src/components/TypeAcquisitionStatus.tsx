import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "../lib/utils"

const SHOW_DELAY_MS = 200

export function TypeAcquisitionStatus({
  isPending,
  className,
}: {
  isPending: boolean
  className?: string
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!isPending) {
      setIsVisible(false)
      return
    }

    const timer = window.setTimeout(() => setIsVisible(true), SHOW_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [isPending])

  if (!isPending || !isVisible) return null

  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className={cn(
        "inline-flex shrink-0 animate-in items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-2 py-1 font-sans text-[11px] font-medium text-slate-500 shadow-sm fade-in-0 backdrop-blur-sm duration-200 motion-reduce:animate-none",
        className,
      )}
      role="status"
    >
      <Loader2
        aria-hidden="true"
        className="h-3 w-3 animate-spin text-blue-500 motion-reduce:animate-none"
      />
      <span>Loading types…</span>
    </div>
  )
}
