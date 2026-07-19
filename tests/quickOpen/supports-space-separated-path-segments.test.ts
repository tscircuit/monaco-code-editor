import { expect, test } from "bun:test"
import { getQuickOpenMatches } from "../../src/utils/quickOpen"
import { quickOpenWorkspaceFiles } from "../fixtures/quickOpenFixtures"

test("getQuickOpenMatches supports space-separated path segments", () => {
  const matches = getQuickOpenMatches(
    quickOpenWorkspaceFiles,
    "imports sensor",
    "index.tsx",
  )

  expect(matches[0]?.file.path).toBe("imports/PressureSensor.tsx")
})
