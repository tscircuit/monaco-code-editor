export type FileTreeNode = {
  name: string
  path: string
  /** Present for directories, undefined for files. */
  children?: FileTreeNode[]
}

type MutableFileTreeNode = FileTreeNode & {
  childMap?: Map<string, MutableFileTreeNode>
}

function sortFileTreeNodes(
  fileTreeNodeMap: Map<string, MutableFileTreeNode>,
): FileTreeNode[] {
  return [...fileTreeNodeMap.values()]
    .sort((firstNode, secondNode) => {
      const firstNodeIsDirectory = !!firstNode.childMap
      const secondNodeIsDirectory = !!secondNode.childMap
      if (firstNodeIsDirectory !== secondNodeIsDirectory) {
        return firstNodeIsDirectory ? -1 : 1
      }
      return firstNode.name.localeCompare(secondNode.name)
    })
    .map((node) => {
      if (!node.childMap) return node
      return {
        name: node.name,
        path: node.path,
        children: sortFileTreeNodes(node.childMap),
      }
    })
}

/**
 * Nest flat slash-separated paths into a tree, directories first and
 * alphabetical within each group.
 */
export function buildFileTree(paths: string[]): FileTreeNode[] {
  const rootFileTreeNodeMap = new Map<string, MutableFileTreeNode>()

  for (const path of paths) {
    const segments = path.split("/")
    let fileTreeNodeMap = rootFileTreeNodeMap
    for (const [index, segment] of segments.entries()) {
      const isLeaf = index === segments.length - 1
      const nodePath = segments.slice(0, index + 1).join("/")
      let node = fileTreeNodeMap.get(segment)
      if (!node) {
        node = { name: segment, path: nodePath }
        if (!isLeaf) {
          node.children = []
          node.childMap = new Map()
        }
        fileTreeNodeMap.set(segment, node)
      }
      if (node.childMap) fileTreeNodeMap = node.childMap
    }
  }

  return sortFileTreeNodes(rootFileTreeNodeMap)
}

/** All file (leaf) descendants of `nodes`, in tree order. */
export function collectFiles(nodes: FileTreeNode[]): FileTreeNode[] {
  return nodes.flatMap((node) =>
    node.children ? collectFiles(node.children) : [node],
  )
}
