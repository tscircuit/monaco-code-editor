import { BookOpen, Braces, Code2, File, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const FILE_ICON_BY_EXTENSION: Record<string, LucideIcon> = {
  ts: Code2,
  tsx: Code2,
  js: Code2,
  jsx: Code2,
  json: Braces,
  md: BookOpen,
}

const FILE_ICON_COLOR_BY_EXTENSION: Record<string, string> = {
  ts: "text-blue-500",
  tsx: "text-blue-500",
  js: "text-blue-500",
  jsx: "text-blue-500",
  json: "text-yellow-500",
  md: "text-slate-500",
}

const getFileExtension = (filename: string) =>
  filename.split(".").pop()?.toLowerCase() ?? ""

export const getFileIconComponent = (filename: string): LucideIcon => {
  const extension = getFileExtension(filename)
  return FILE_ICON_BY_EXTENSION[extension] ?? File
}

export const getFileIconClassName = (
  filename: string,
  className?: string,
) => {
  const extension = getFileExtension(filename)
  return cn(FILE_ICON_COLOR_BY_EXTENSION[extension] ?? "text-slate-500", className)
}

export const getFileIcon = (filename: string, className?: string) => {
  const Icon = getFileIconComponent(filename)
  return <Icon className={getFileIconClassName(filename, className)} />
}
