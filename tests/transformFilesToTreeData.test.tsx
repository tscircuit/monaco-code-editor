import { expect, test } from "bun:test"
import { transformFilesToTreeData } from "../src/utils/transformFilesToTreeData"

test("clears a previous operation error after a successful rename", () => {
  let errorMessage = ""
  let shouldFail = true

  const tree = transformFilesToTreeData({
    files: { "index.tsx": "export {}" },
    currentFile: "index.tsx",
    renamingFile: "index.tsx",
    onRenameFile: () => {
      if (shouldFail) throw new Error("File already exists")
    },
    onDeleteFile: () => {},
    setRenamingFile: () => {},
    onFileSelect: () => {},
    onFolderSelect: () => {},
    canModifyFiles: true,
    onError: (error) => {
      errorMessage = error.message
    },
    onOperationSuccess: () => {
      errorMessage = ""
    },
    setSelectedFolderForCreation: () => {},
    openDropdownId: null,
    setOpenDropdownId: () => {},
  })

  tree[0]?.onRename?.("existing.tsx")
  expect(errorMessage).toBe("File already exists")

  shouldFail = false
  tree[0]?.onRename?.("renamed.tsx")
  expect(errorMessage).toBe("")
})
