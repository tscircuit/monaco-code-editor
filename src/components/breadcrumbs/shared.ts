import { createContext } from "react"

export const menuItemBaseClassName =
  "gap-1.5 py-0.5 text-xs [&_svg:not([class*='size-'])]:size-3.5"

export const getMenuItemClassName = (isActive: boolean) =>
  `${menuItemBaseClassName} ${isActive ? "bg-slate-100" : ""}`

/** Lets menu content close its enclosing breadcrumb dropdown. */
export const CloseMenuContext = createContext<() => void>(() => {})
