import { expect, mock, test } from "bun:test"
import {
  ImagePreviewLimitError,
  loadImagePreview,
  MAX_IMAGE_PREVIEW_BYTES,
} from "../src/utils/loadImagePreview"

function pngHeader(width: number, height: number) {
  const bytes = new Uint8Array(24)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10])
  bytes.set([73, 72, 68, 82], 12)
  const view = new DataView(bytes.buffer)
  view.setUint32(16, width)
  view.setUint32(20, height)
  return bytes
}

function load(response: Response) {
  return loadImagePreview(
    "/image.png",
    new AbortController().signal,
    async () => response,
  )
}

test("accepts small image headers without decoding pixels", async () => {
  expect((await load(new Response(pngHeader(1200, 720)))).size).toBe(24)
})

test.each([
  [8192, 8192],
  [100_000, 1],
])("rejects huge dimensions in tiny PNG files (%s × %s)", async (w, h) => {
  await expect(load(new Response(pngHeader(w!, h!)))).rejects.toBeInstanceOf(
    ImagePreviewLimitError,
  )
})

test.each([
  true,
  false,
])("cancels oversized responses (size header: %s)", async (hasSize) => {
  const cancel = mock(() => {})
  const body = new ReadableStream({
    pull: (controller) =>
      controller.enqueue(new Uint8Array(MAX_IMAGE_PREVIEW_BYTES + 1)),
    cancel,
  })
  const headers = hasSize
    ? { "content-length": String(MAX_IMAGE_PREVIEW_BYTES + 1) }
    : undefined
  await expect(load(new Response(body, { headers }))).rejects.toBeInstanceOf(
    ImagePreviewLimitError,
  )
  expect(cancel).toHaveBeenCalled()
})

test("rejects oversized data URLs before fetch decodes them", async () => {
  const fetchImage = mock(async () => new Response())
  const url = `data:image/png;base64,${"A".repeat(MAX_IMAGE_PREVIEW_BYTES * 2)}`
  await expect(
    loadImagePreview(url, new AbortController().signal, fetchImage),
  ).rejects.toBeInstanceOf(ImagePreviewLimitError)
  expect(fetchImage).not.toHaveBeenCalled()
})
