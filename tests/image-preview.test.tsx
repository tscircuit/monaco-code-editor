import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { BinaryFilePreview } from "../src/components/BinaryFilePreview"
import { getImagePreviewUrl } from "../src/utils/getImagePreviewUrl"

const file = {
  path: "board.PNG",
  content: "blob:https://example.com/board",
  isBinary: true,
  downloadUrl: "https://example.com/download",
}

test.each([
  file.downloadUrl,
  undefined,
])("waits for size checks and keeps a download link (%s)", (downloadUrl) => {
  const markup = renderToStaticMarkup(
    <BinaryFilePreview file={{ ...file, downloadUrl }} />,
  )
  expect(markup).not.toContain("<img")
  expect(markup).toContain("Checking image size")
  expect(markup).toContain(`href="${downloadUrl ?? file.content}"`)
})

test.each([
  { ...file, path: "board.step" },
  { ...file, content: "", downloadUrl: undefined },
])("shows the binary notice when there is no preview (%j)", (file) => {
  const markup = renderToStaticMarkup(<BinaryFilePreview file={file} />)
  expect(markup).toContain("Binary file")
  expect(markup).not.toContain("<img")
  expect(markup.includes("Download file")).toBe(!!file.downloadUrl)
})

test("supports data and download URLs while leaving text SVG editable", () => {
  const dataUrl = "data:image/png;base64,iVBORw0KGgo="
  expect(getImagePreviewUrl({ ...file, content: dataUrl })).toBe(dataUrl)
  expect(getImagePreviewUrl({ ...file, content: "" })).toBe(file.downloadUrl)
  expect(
    getImagePreviewUrl({ ...file, path: "board.svg", isBinary: false }),
  ).toBeNull()
})
