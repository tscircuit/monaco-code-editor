import { describe, expect, test } from "bun:test"
import ts from "typescript"
import { getWorkspaceCompilerOptions } from "../src/monaco/getWorkspaceCompilerOptions"

describe("workspace module resolution", () => {
  test("resolves bare imports from the Monaco workspace root", () => {
    const files = new Set([
      "file:///index.circuit.tsx",
      "file:///imports/SWITCH.tsx",
    ])

    const workspaceCompilerOptions = getWorkspaceCompilerOptions({
      compilerOptions: {},
      jsxEmit: ts.JsxEmit.ReactJSX,
      moduleKind: ts.ModuleKind.ESNext,
      moduleResolutionKind: ts.ModuleResolutionKind.Bundler,
      scriptTarget: ts.ScriptTarget.ES2022,
    })

    const result = ts.resolveModuleName(
      "imports/SWITCH",
      "file:///index.circuit.tsx",
      workspaceCompilerOptions,
      {
        fileExists: (path) => files.has(path),
        readFile: () => undefined,
      },
    )

    expect(result.resolvedModule?.resolvedFileName).toBe(
      "file:///imports/SWITCH.tsx",
    )
  })
})
