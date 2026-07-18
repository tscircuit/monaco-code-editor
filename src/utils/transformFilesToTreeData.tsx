import { Folder, MoreVertical, Pencil, Trash2 } from "lucide-react"
import type * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import type { TreeDataItem } from "../components/ui/tree-view"
import { getFileIconClassName, getFileIconComponent } from "./getFileIcon"
import { isHiddenFile } from "./isHiddenFile"

type FileName = string
type TreeNode = Omit<TreeDataItem, "children"> & {
  children?: Record<string, TreeNode>
}

interface TransformFilesToTreeDataProps {
  files: Record<FileName, string>
  currentFile: FileName | null
  renamingFile: string | null
  onRenameFile: (oldPath: string, newPath: string) => void
  onDeleteFile: (path: string) => void
  setRenamingFile: (filename: string | null) => void
  onFileSelect: (filename: FileName) => void
  onFolderSelect: (folderPath: string) => void
  canModifyFiles: boolean
  onError: (error: Error) => void
  onOperationSuccess: () => void
  setSelectedFolderForCreation: (folder: string | null) => void
  openDropdownId: string | null
  setOpenDropdownId: (id: string | null) => void
}

function stripLeadingSlash(path: string): string {
  return path.startsWith("/") ? path.slice(1) : path
}

function getRenamedPath(itemId: string, newFilename: string): string {
  const normalizedItemId = stripLeadingSlash(itemId)
  const pathParts = normalizedItemId.split("/")
  const nextPath =
    pathParts.length > 1
      ? `${pathParts.slice(0, -1).join("/")}/${newFilename}`
      : newFilename

  return itemId.startsWith("/") ? `/${nextPath}` : nextPath
}

function createFileActions({
  itemId,
  canModifyFiles,
  openDropdownId,
  setOpenDropdownId,
  setRenamingFile,
  onDeleteFile,
  onError,
  onOperationSuccess,
}: {
  itemId: string
  canModifyFiles: boolean
  openDropdownId: string | null
  setOpenDropdownId: (id: string | null) => void
  setRenamingFile: (filename: string | null) => void
  onDeleteFile: (path: string) => void
  onError: (error: Error) => void
  onOperationSuccess: () => void
}) {
  if (!canModifyFiles) return undefined

  return (
    <DropdownMenu
      key={itemId}
      open={openDropdownId === itemId}
      onOpenChange={(open) => {
        setOpenDropdownId(open ? itemId : null)
      }}
    >
      <DropdownMenuTrigger asChild>
        <MoreVertical className="w-4 h-4 text-gray-500 hover:text-gray-700" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="bg-white border border-slate-200 z-[100]"
        style={{
          position: "absolute",
          top: "100%",
          left: "0",
          marginTop: "1rem",
          width: "8rem",
          padding: "3px",
          borderRadius: "6px",
          boxShadow:
            "0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)",
        }}
      >
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => {
              setRenamingFile(itemId)
              setOpenDropdownId(null)
            }}
            className="flex items-center gap-1.5 px-1.5 text-xs text-slate-700 rounded cursor-pointer"
            style={{ height: "24px" }}
          >
            <Pencil className="h-3 w-3 shrink-0" strokeWidth={2} />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-0.5" />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              try {
                onDeleteFile(itemId)
                onOperationSuccess()
              } catch (error) {
                onError(
                  error instanceof Error
                    ? error
                    : new Error(`Failed to delete ${itemId}`),
                )
              }
              setOpenDropdownId(null)
            }}
            className="flex items-center gap-1.5 px-1.5 text-xs rounded cursor-pointer"
            style={{ height: "24px" }}
          >
            <Trash2 className="h-3 w-3 shrink-0" strokeWidth={1.75} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const transformFilesToTreeData = ({
  files,
  currentFile,
  renamingFile,
  onRenameFile,
  onDeleteFile,
  setRenamingFile,
  onFileSelect,
  onFolderSelect,
  canModifyFiles,
  onError,
  onOperationSuccess,
  setSelectedFolderForCreation,
  openDropdownId,
  setOpenDropdownId,
}: TransformFilesToTreeDataProps): TreeDataItem[] => {
  const root: Record<string, TreeNode> = {}
  const shouldShowHiddenPath = isHiddenFile(
    stripLeadingSlash(currentFile ?? ""),
  )

  Object.keys(files).forEach((filePath) => {
    const hasLeadingSlash = filePath.startsWith("/")
    const pathSegments = stripLeadingSlash(filePath).trim().split("/")
    let currentNode: Record<string, TreeNode> = root

    pathSegments.forEach((segment, segmentIndex) => {
      const isLeafNode = segmentIndex === pathSegments.length - 1
      const ancestorPath = pathSegments.slice(0, segmentIndex).join("/")
      const relativePath = ancestorPath ? `${ancestorPath}/${segment}` : segment
      const absolutePath = hasLeadingSlash ? `/${relativePath}` : relativePath
      const itemId = absolutePath

      if (
        !currentNode[segment] &&
        (!isHiddenFile(relativePath) || shouldShowHiddenPath)
      ) {
        currentNode[segment] = {
          id: itemId,
          name: segment,
          isRenaming: renamingFile === itemId,
          onRename: (newFilename: string) => {
            try {
              onRenameFile(itemId, getRenamedPath(itemId, newFilename))
              onOperationSuccess()
              setRenamingFile(null)
            } catch (error) {
              onError(
                error instanceof Error
                  ? error
                  : new Error(`Failed to rename ${itemId}`),
              )
            }
          },
          onCancelRename: () => {
            setRenamingFile(null)
          },
          icon: isLeafNode ? getFileIconComponent(segment) : Folder,
          iconClassName: isLeafNode ? getFileIconClassName(segment) : undefined,
          onClick: isLeafNode
            ? () => {
                onFileSelect(absolutePath)
                setSelectedFolderForCreation(null)
              }
            : () => onFolderSelect(absolutePath),
          draggable: false,
          droppable: !isLeafNode,
          children: isLeafNode ? undefined : {},
          actions: isLeafNode
            ? createFileActions({
                itemId,
                canModifyFiles,
                openDropdownId,
                setOpenDropdownId,
                setRenamingFile,
                onDeleteFile,
                onError,
                onOperationSuccess,
              })
            : undefined,
          onContextMenu:
            canModifyFiles && isLeafNode
              ? (e: React.MouseEvent) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setOpenDropdownId(itemId)
                }
              : undefined,
        }
      }

      if (!isLeafNode && currentNode[segment]?.children) {
        currentNode = currentNode[segment].children
      }
    })
  })

  const convertToArray = (items: Record<string, TreeNode>): TreeDataItem[] => {
    return Object.values(items).map((item) => ({
      ...item,
      children: item.children ? convertToArray(item.children) : undefined,
    }))
  }

  return convertToArray(root).filter((item) => item.children?.length !== 0)
}
