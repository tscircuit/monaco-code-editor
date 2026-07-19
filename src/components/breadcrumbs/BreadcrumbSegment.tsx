import { ChevronRight } from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { CloseMenuContext } from "./shared"

export function BreadcrumbSegment({
  children,
  icon,
  onClick,
  dropdown,
  isLast,
}: {
  children: ReactNode
  icon?: ReactNode
  onClick?: () => void
  dropdown?: ReactNode
  isLast: boolean
}) {
  const [open, setOpen] = useState(false)
  const label = (
    <>
      {icon}
      {children}
    </>
  )
  const labelClassName = `flex items-center gap-1 rounded px-1 py-0.5 font-mono ${
    isLast ? "text-slate-900" : "text-slate-500"
  }`

  let content: ReactNode
  if (dropdown) {
    content = (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`${labelClassName} transition-colors hover:bg-slate-100 hover:text-slate-900 data-[state=open]:bg-slate-100 data-[state=open]:text-slate-900`}
          >
            {label}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-72 w-auto min-w-[10rem] overflow-y-auto"
        >
          <CloseMenuContext.Provider value={() => setOpen(false)}>
            {dropdown}
          </CloseMenuContext.Provider>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  } else if (onClick) {
    content = (
      <button
        type="button"
        onClick={onClick}
        className={`${labelClassName} transition-colors hover:bg-slate-100 hover:text-slate-900`}
      >
        {label}
      </button>
    )
  } else {
    content = <span className={labelClassName}>{label}</span>
  }

  return (
    <li className="flex shrink-0 items-center gap-0.5">
      {content}
      {!isLast && (
        <ChevronRight
          aria-hidden="true"
          className="h-3 w-3 shrink-0 text-slate-300"
        />
      )}
    </li>
  )
}
