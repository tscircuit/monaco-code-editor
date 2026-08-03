import { ChevronRight } from "lucide-react"
import { Accordion as AccordionPrimitive } from "radix-ui"
import * as React from "react"
import { cn } from "../../lib/utils"
import { Input } from "./input"

const treeClassName =
  "group rounded-md hover:bg-slate-200/70 transition-colors duration-100 dark:hover:bg-slate-700/50"
const selectedTreeClassName =
  "bg-slate-200 text-slate-900 font-medium dark:bg-slate-700 dark:text-slate-50"
const dragOverClassName =
  "bg-slate-300 text-slate-900 dark:bg-slate-600 dark:text-slate-50"

interface TreeDataItem {
  id: string
  name: React.ReactNode
  icon?: any
  iconClassName?: string
  selectedIcon?: any
  openIcon?: any
  children?: TreeDataItem[]
  actions?: React.ReactNode
  onClick?: () => void
  draggable?: boolean
  droppable?: boolean
  isRenaming?: boolean
  onRename?: (newName: string) => void
  onCancelRename?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
}

function RenameInput({ item }: { item: TreeDataItem }) {
  const finishRename = (input: HTMLInputElement) => {
    const value = input.value.trim()
    if (value && value !== item.name) {
      item.onRename?.(value)
    } else {
      item.onCancelRename?.()
    }
  }

  return (
    <Input
      style={{ zIndex: 50 }}
      defaultValue={item.name as string}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          finishRename(event.currentTarget)
        } else if (event.key === "Escape") {
          event.preventDefault()
          item.onCancelRename?.()
        }
      }}
      spellCheck={false}
      autoComplete="off"
      onBlur={(event) => finishRename(event.currentTarget)}
      autoFocus
      onClick={(event) => event.stopPropagation()}
      className="h-6 w-full rounded-sm border border-blue-500 bg-white px-2 py-0 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      onFocus={(event) => {
        event.currentTarget.select()
        const lastDotIndex = event.currentTarget.value.lastIndexOf(".")
        if (lastDotIndex > 0) {
          event.currentTarget.setSelectionRange(0, lastDotIndex)
        }
      }}
    />
  )
}

function useTreeItemDrag({
  item,
  draggedItem,
  handleDragStart,
  handleDrop,
}: {
  item: TreeDataItem
  draggedItem: TreeDataItem | null
  handleDragStart?: (item: TreeDataItem) => void
  handleDrop?: (item: TreeDataItem) => void
}) {
  const [isDragOver, setIsDragOver] = React.useState(false)

  return {
    isDragOver,
    dragProps: {
      draggable: !!item.draggable,
      onDragStart(event: React.DragEvent) {
        if (!item.draggable) {
          event.preventDefault()
          return
        }
        event.dataTransfer.setData("text/plain", item.id)
        handleDragStart?.(item)
      },
      onDragOver(event: React.DragEvent) {
        if (
          item.droppable !== false &&
          draggedItem &&
          draggedItem.id !== item.id
        ) {
          event.preventDefault()
          setIsDragOver(true)
        }
      },
      onDragLeave() {
        setIsDragOver(false)
      },
      onDrop(event: React.DragEvent) {
        event.preventDefault()
        setIsDragOver(false)
        handleDrop?.(item)
      },
    },
  }
}

type TreeProps = React.HTMLAttributes<HTMLDivElement> & {
  data: TreeDataItem[] | TreeDataItem
  initialSelectedItemId?: string
  onSelectChange?: (item: TreeDataItem | undefined) => void
  expandAll?: boolean
  defaultNodeIcon?: any
  defaultLeafIcon?: any
  selectedItemId: string
  setSelectedItemId: (id: string | undefined) => void
  onDocumentDrag?: (sourceItem: TreeDataItem, targetItem: TreeDataItem) => void
}

const TreeView = React.forwardRef<HTMLDivElement, TreeProps>(
  (
    {
      data,
      initialSelectedItemId,
      onSelectChange,
      expandAll,
      defaultLeafIcon,
      defaultNodeIcon,
      className,
      onDocumentDrag,
      selectedItemId,
      setSelectedItemId,
      ...props
    },
    ref,
  ) => {
    React.useEffect(() => {
      setSelectedItemId(initialSelectedItemId)
    }, [initialSelectedItemId])

    const [draggedItem, setDraggedItem] = React.useState<TreeDataItem | null>(
      null,
    )

    const handleSelectChange = React.useCallback(
      (item: TreeDataItem | undefined) => {
        setSelectedItemId(item?.id)
        if (onSelectChange) {
          onSelectChange(item)
        }
      },
      [onSelectChange],
    )

    const handleDragStart = React.useCallback((item: TreeDataItem) => {
      setDraggedItem(item)
    }, [])

    const handleDrop = React.useCallback(
      (targetItem: TreeDataItem) => {
        if (draggedItem && onDocumentDrag && draggedItem.id !== targetItem.id) {
          onDocumentDrag(draggedItem, targetItem)
        }
        setDraggedItem(null)
      },
      [draggedItem, onDocumentDrag],
    )

    const expandedItemIds = React.useMemo(() => {
      if (!initialSelectedItemId) {
        return [] as string[]
      }

      const ids: string[] = []

      function walkTreeItems(
        items: TreeDataItem[] | TreeDataItem,
        targetId: string,
      ) {
        if (Array.isArray(items)) {
          for (let i = 0; i < items.length; i++) {
            ids.push(items[i]!.id)
            if (walkTreeItems(items[i]!, targetId) && !expandAll) {
              return true
            }
            if (!expandAll) ids.pop()
          }
        } else if (!expandAll && items.id === targetId) {
          return true
        } else if (items.children) {
          return walkTreeItems(items.children, targetId)
        }
      }

      walkTreeItems(data, initialSelectedItemId)
      return ids
    }, [data, expandAll, initialSelectedItemId])

    return (
      <div className={cn("overflow-hidden relative p-2", className)}>
        <TreeItem
          data={data}
          ref={ref}
          setSelectedItemId={setSelectedItemId}
          selectedItemId={selectedItemId}
          handleSelectChange={handleSelectChange}
          expandedItemIds={expandedItemIds}
          defaultLeafIcon={defaultLeafIcon}
          defaultNodeIcon={defaultNodeIcon}
          handleDragStart={handleDragStart}
          handleDrop={handleDrop}
          draggedItem={draggedItem}
          {...props}
        />
        <div
          className="w-full h-[48px]"
          onDrop={() => {
            handleDrop({ id: "", name: "parent_div" })
          }}
        />
      </div>
    )
  },
)
TreeView.displayName = "TreeView"

type TreeItemProps = TreeProps & {
  selectedItemId?: string
  handleSelectChange: (item: TreeDataItem | undefined) => void
  expandedItemIds: string[]
  defaultNodeIcon?: any
  defaultLeafIcon?: any
  handleDragStart?: (item: TreeDataItem) => void
  handleDrop?: (item: TreeDataItem) => void
  setSelectedItemId: (id: string | undefined) => void
  draggedItem: TreeDataItem | null
}

const TreeItem = React.forwardRef<HTMLDivElement, TreeItemProps>(
  (
    {
      className,
      data,
      selectedItemId,
      handleSelectChange,
      setSelectedItemId,
      expandedItemIds,
      defaultNodeIcon,
      defaultLeafIcon,
      handleDragStart,
      handleDrop,
      draggedItem,
      ...props
    },
    ref,
  ) => {
    if (!Array.isArray(data)) {
      data = [data]
    }

    const sortedData = [...data].sort((a, b) => {
      const aIsFolder = !!a.children
      const bIsFolder = !!b.children

      if (aIsFolder && !bIsFolder) return -1
      if (!aIsFolder && bIsFolder) return 1
      return 0
    })

    return (
      <div ref={ref} role="tree" className={className} {...props}>
        <ul>
          {sortedData.map((item) => (
            <li key={item.id}>
              {item.children ? (
                <TreeNode
                  item={item}
                  setSelectedItemId={setSelectedItemId}
                  selectedItemId={selectedItemId}
                  expandedItemIds={expandedItemIds}
                  handleSelectChange={handleSelectChange}
                  defaultNodeIcon={defaultNodeIcon}
                  defaultLeafIcon={defaultLeafIcon}
                  handleDragStart={handleDragStart}
                  handleDrop={handleDrop}
                  draggedItem={draggedItem}
                />
              ) : (
                <TreeLeaf
                  item={item}
                  selectedItemId={selectedItemId}
                  handleSelectChange={handleSelectChange}
                  defaultLeafIcon={defaultLeafIcon}
                  handleDragStart={handleDragStart}
                  handleDrop={handleDrop}
                  draggedItem={draggedItem}
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    )
  },
)
TreeItem.displayName = "TreeItem"

const TreeNode = ({
  item,
  handleSelectChange,
  expandedItemIds,
  selectedItemId,
  defaultNodeIcon,
  defaultLeafIcon,
  handleDragStart,
  setSelectedItemId,
  handleDrop,
  draggedItem,
}: {
  item: TreeDataItem
  handleSelectChange: (item: TreeDataItem | undefined) => void
  expandedItemIds: string[]
  selectedItemId: string
  setSelectedItemId: (id: string | undefined) => void
  defaultNodeIcon?: any
  defaultLeafIcon?: any
  handleDragStart?: (item: TreeDataItem) => void
  handleDrop?: (item: TreeDataItem) => void
  draggedItem: TreeDataItem | null
}) => {
  const [value, setValue] = React.useState(
    expandedItemIds.includes(item.id) ? [item.id] : [],
  )
  const { isDragOver, dragProps } = useTreeItemDrag({
    item,
    draggedItem,
    handleDragStart,
    handleDrop,
  })

  return (
    <AccordionPrimitive.Root
      type="multiple"
      value={value}
      onValueChange={(s) => setValue(s)}
    >
      <AccordionPrimitive.Item value={item.id}>
        <AccordionTrigger
          className={cn(
            treeClassName,
            selectedItemId === item.id && selectedTreeClassName,
            isDragOver && dragOverClassName,
          )}
          onClick={() => {
            handleSelectChange(item)
            item.onClick?.()
          }}
          onContextMenu={item.onContextMenu}
          {...dragProps}
        >
          <TreeIcon
            item={item}
            isSelected={selectedItemId === item.id}
            isOpen={value.includes(item.id)}
            default={defaultNodeIcon}
          />
          <div className="min-w-0 flex-1">
            {item.isRenaming ? (
              <RenameInput item={item} />
            ) : (
              <span className="block truncate text-sm">{item.name}</span>
            )}
          </div>
          <div
            className="flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <TreeActions>{item.actions}</TreeActions>
          </div>
        </AccordionTrigger>
        <AccordionContent className="ml-4 pl-1 border-l">
          <TreeItem
            data={item.children ?? item}
            selectedItemId={selectedItemId}
            setSelectedItemId={setSelectedItemId}
            handleSelectChange={handleSelectChange}
            expandedItemIds={expandedItemIds}
            defaultLeafIcon={defaultLeafIcon}
            defaultNodeIcon={defaultNodeIcon}
            handleDragStart={handleDragStart}
            handleDrop={handleDrop}
            draggedItem={draggedItem}
          />
        </AccordionContent>
      </AccordionPrimitive.Item>
    </AccordionPrimitive.Root>
  )
}

const TreeLeaf = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    item: TreeDataItem
    selectedItemId?: string
    handleSelectChange: (item: TreeDataItem | undefined) => void
    defaultLeafIcon?: any
    handleDragStart?: (item: TreeDataItem) => void
    handleDrop?: (item: TreeDataItem) => void
    draggedItem: TreeDataItem | null
  }
>(
  (
    {
      className,
      item,
      selectedItemId,
      handleSelectChange,
      defaultLeafIcon,
      handleDragStart,
      handleDrop,
      draggedItem,
      ...props
    },
    ref,
  ) => {
    const { isDragOver, dragProps } = useTreeItemDrag({
      item,
      draggedItem,
      handleDragStart,
      handleDrop,
    })

    return (
      <div
        ref={ref}
        className={cn(
          "ml-[2px] flex cursor-pointer items-center py-2 pl-2 pr-8 text-left",
          treeClassName,
          className,
          selectedItemId === item.id && selectedTreeClassName,
          isDragOver && dragOverClassName,
        )}
        onClick={() => {
          handleSelectChange(item)
          item.onClick?.()
        }}
        onContextMenu={item.onContextMenu}
        {...dragProps}
        {...props}
      >
        <TreeIcon
          item={item}
          isSelected={selectedItemId === item.id}
          default={defaultLeafIcon}
        />
        <div className="min-w-0 flex-1">
          {item.isRenaming ? (
            <RenameInput item={item} />
          ) : (
            <span className="block truncate text-sm">{item.name}</span>
          )}
        </div>
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <TreeActions>{item.actions}</TreeActions>
        </div>
      </div>
    )
  },
)
TreeLeaf.displayName = "TreeLeaf"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header>
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex w-full flex-1 items-center py-2 pl-2 pr-8 text-left transition-all first:[&[data-state=open]>svg]:rotate-90",
        className,
      )}
      {...props}
    >
      <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 text-slate-900/50 mr-1 dark:text-slate-50/50" />
      {children}
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      "overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
      className,
    )}
    {...props}
  >
    <div className="pb-1 pt-0">{children}</div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

const TreeIcon = ({
  item,
  isOpen,
  isSelected,
  default: defaultIcon,
}: {
  item: TreeDataItem
  isOpen?: boolean
  isSelected?: boolean
  default?: any
}) => {
  let Icon = defaultIcon
  if (isSelected && item.selectedIcon) {
    Icon = item.selectedIcon
  } else if (isOpen && item.openIcon) {
    Icon = item.openIcon
  } else if (item.icon) {
    Icon = item.icon
  }
  return Icon ? (
    <Icon className={cn("h-4 w-4 shrink-0 mr-2", item.iconClassName)} />
  ) : null
}

const TreeActions = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="absolute right-3 block group-hover:block">{children}</div>
  )
}

export { type TreeDataItem, TreeView }
