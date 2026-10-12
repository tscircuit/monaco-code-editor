import { imageSize } from "image-size"

export const MAX_IMAGE_PREVIEW_BYTES = 5 * 1024 * 1024
export const MAX_IMAGE_PREVIEW_PIXELS = 16_000_000
export class ImagePreviewLimitError extends Error {}

export async function loadImagePreview(
  url: string,
  signal: AbortSignal,
  fetchImage: (url: string, options: RequestInit) => Promise<Response> = fetch,
): Promise<Blob> {
  // Avoid decoding an oversized data URL inside fetch before checking bytes.
  if (/^data:/i.test(url)) {
    const base64 = url.slice(0, url.indexOf(",")).endsWith(";base64")
    const maxLength = MAX_IMAGE_PREVIEW_BYTES * (base64 ? 4 / 3 : 3) + 1024
    if (url.length > maxLength) throw new ImagePreviewLimitError()
  }

  const response = await fetchImage(url, { signal })
  if (!response.ok || !response.body) throw new Error("Image request failed")
  if (
    Number(response.headers.get("content-length")) > MAX_IMAGE_PREVIEW_BYTES
  ) {
    await response.body.cancel()
    throw new ImagePreviewLimitError()
  }

  const reader = response.body.getReader()
  const chunks: BlobPart[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_IMAGE_PREVIEW_BYTES) {
        await reader.cancel()
        throw new ImagePreviewLimitError()
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  signal.throwIfAborted()
  const blob = new Blob(chunks, {
    type: response.headers.get("content-type") || "application/octet-stream",
  })
  // Read encoded headers, never decode pixels just to discover dimensions.
  const bytes = new Uint8Array(await blob.arrayBuffer())
  signal.throwIfAborted()
  const dimensions = imageSize(bytes)
  for (const { width, height } of [dimensions, ...(dimensions.images ?? [])]) {
    if (!Number.isFinite(width * height) || width <= 0 || height <= 0) {
      throw new Error("Invalid image dimensions")
    }
    if (
      width * height > MAX_IMAGE_PREVIEW_PIXELS ||
      Math.max(width, height) > 8192
    ) {
      throw new ImagePreviewLimitError()
    }
  }
  return blob
}
