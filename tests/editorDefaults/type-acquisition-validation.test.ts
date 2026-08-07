import { expect, test } from "bun:test"
import { createCodeEditorOptions } from "../../src/monaco/editorDefaults"

test("createCodeEditorOptions hides validation decorations while types load", () => {
  const options = createCodeEditorOptions(undefined, {
    suppressValidationDecorations: true,
  })

  expect(options.renderValidationDecorations).toBe("off")
})

test("createCodeEditorOptions restores Monaco's default validation mode", () => {
  const options = createCodeEditorOptions(undefined, {
    suppressValidationDecorations: false,
  })

  expect(options.renderValidationDecorations).toBe("editable")
})

test("createCodeEditorOptions restores a caller's validation preference", () => {
  const options = createCodeEditorOptions(
    { renderValidationDecorations: "on" },
    { suppressValidationDecorations: false },
  )

  expect(options.renderValidationDecorations).toBe("on")
})
