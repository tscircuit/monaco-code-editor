import {
  BookOpen,
  Box,
  Braces,
  Code2,
  Component,
  File,
  List,
  type LucideIcon,
  SquareFunction,
  Tag,
  Type,
  Variable,
  Wrench,
} from "lucide-react"
import { cn } from "../lib/utils"

type IconStyle = { icon: LucideIcon; className: string }

// ---------------------------------------------------------------------------
// File icons (sidebar tree, Quick Open, breadcrumbs)
// ---------------------------------------------------------------------------

const fileIconByExtension: Record<string, IconStyle> = {
  ts: { icon: Code2, className: "text-blue-500" },
  tsx: { icon: Code2, className: "text-blue-500" },
  js: { icon: Code2, className: "text-blue-500" },
  jsx: { icon: Code2, className: "text-blue-500" },
  json: { icon: Braces, className: "text-yellow-500" },
  md: { icon: BookOpen, className: "text-slate-500" },
}

const defaultFileIcon: IconStyle = {
  icon: File,
  className: "text-slate-500",
}

const getFileIconStyle = (filename: string): IconStyle => {
  const extension = filename.split(".").pop()?.toLowerCase() ?? ""
  return fileIconByExtension[extension] ?? defaultFileIcon
}

export const getFileIconComponent = (filename: string): LucideIcon =>
  getFileIconStyle(filename).icon

export const getFileIconClassName = (filename: string, className?: string) =>
  cn(getFileIconStyle(filename).className, className)

export const getFileIcon = (filename: string, className?: string) => {
  const { icon: Icon, className: extensionClassName } =
    getFileIconStyle(filename)
  return <Icon className={cn(extensionClassName, className)} />
}

// ---------------------------------------------------------------------------
// Symbol icons (breadcrumbs, Go to Symbol)
// ---------------------------------------------------------------------------

// Kinds come from the TypeScript navigation tree (ScriptElementKind values);
// colors follow VS Code's symbol icon palette (methods purple, fields blue,
// classes/enums orange).
const symbolIconByKind: Record<string, IconStyle> = {
  class: { icon: Box, className: "text-orange-500" },
  "local class": { icon: Box, className: "text-orange-500" },
  interface: { icon: Component, className: "text-sky-600" },
  enum: { icon: List, className: "text-orange-500" },
  "enum member": { icon: Tag, className: "text-sky-600" },
  module: { icon: Braces, className: "text-slate-500" },
  script: { icon: Braces, className: "text-slate-500" },
  function: { icon: SquareFunction, className: "text-purple-600" },
  "local function": { icon: SquareFunction, className: "text-purple-600" },
  method: { icon: SquareFunction, className: "text-purple-600" },
  constructor: { icon: SquareFunction, className: "text-purple-600" },
  getter: { icon: SquareFunction, className: "text-purple-600" },
  setter: { icon: SquareFunction, className: "text-purple-600" },
  property: { icon: Wrench, className: "text-sky-600" },
  var: { icon: Variable, className: "text-sky-600" },
  let: { icon: Variable, className: "text-sky-600" },
  const: { icon: Variable, className: "text-sky-600" },
  "local var": { icon: Variable, className: "text-sky-600" },
  parameter: { icon: Variable, className: "text-sky-600" },
  type: { icon: Type, className: "text-sky-600" },
  alias: { icon: Type, className: "text-sky-600" },
}

const defaultSymbolIcon: IconStyle = {
  icon: Box,
  className: "text-slate-500",
}

export const getSymbolIcon = (kind: string, className?: string) => {
  const { icon: Icon, className: kindClassName } =
    symbolIconByKind[kind] ?? defaultSymbolIcon
  return <Icon className={cn(kindClassName, className)} />
}
