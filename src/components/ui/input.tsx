import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-slate-200 bg-transparent px-2.5 py-1 text-base text-slate-900 transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-slate-900 placeholder:text-slate-500 focus-visible:border-slate-400 focus-visible:ring-[3px] focus-visible:ring-slate-200 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-[3px] aria-invalid:ring-red-100 md:text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:file:text-slate-50 dark:placeholder:text-slate-400 dark:focus-visible:border-slate-600 dark:focus-visible:ring-slate-800 dark:disabled:bg-slate-900 dark:aria-invalid:border-red-500 dark:aria-invalid:ring-red-950/40",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
