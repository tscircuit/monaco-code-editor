import { useEffect, useState } from "react"
import { getImagePreviewUrl } from "../utils/getImagePreviewUrl"
import {
  ImagePreviewLimitError,
  loadImagePreview,
} from "../utils/loadImagePreview"
import type { EditorFile } from "./WorkspaceCodeEditor"

export function BinaryFilePreview({ file }: { file: EditorFile }) {
  const imageUrl = getImagePreviewUrl(file)
  const [preview, setPreview] = useState<{
    source: string
    url?: string
    error?: "large" | "unavailable"
  } | null>(null)
  const downloadUrl = file.downloadUrl || imageUrl

  useEffect(() => {
    if (!imageUrl) return
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    let active = true
    let objectUrl: string | undefined
    void loadImagePreview(imageUrl, controller.signal)
      .then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setPreview({ source: imageUrl, url: objectUrl })
      })
      .catch((error) => {
        if (!active) return
        setPreview({
          source: imageUrl,
          error:
            error instanceof ImagePreviewLimitError ? "large" : "unavailable",
        })
      })
      .finally(() => clearTimeout(timeout))
    return () => {
      active = false
      clearTimeout(timeout)
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [imageUrl])

  const currentPreview = preview?.source === imageUrl ? preview : null
  if (!currentPreview?.url) {
    const status = !imageUrl ? "binary" : (currentPreview?.error ?? "loading")
    const [title, message] = {
      binary: ["Binary file", "This file cannot be displayed in the editor."],
      large: [
        "Image too large",
        "This image is too large to preview. Download it to view.",
      ],
      unavailable: [
        "Image preview unavailable",
        "This image could not be loaded.",
      ],
      loading: ["Loading image preview…", "Checking image size…"],
    }[status]
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 font-sans text-slate-500">
        <p className="font-semibold">{title}</p>
        <p className="text-[13px]">{message}</p>
        {downloadUrl && <DownloadLink url={downloadUrl} path={file.path} />}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col font-sans">
      <div
        className="min-h-0 flex-1 overflow-hidden"
        style={{
          backgroundColor: "#f8fafc",
          backgroundImage:
            "repeating-conic-gradient(#e2e8f0 0% 25%, transparent 0% 50%)",
          backgroundSize: "16px 16px",
        }}
      >
        <img
          src={currentPreview.url}
          alt={file.path}
          decoding="async"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            padding: "16px",
          }}
          onError={() =>
            setPreview({ source: imageUrl!, error: "unavailable" })
          }
        />
      </div>
      {downloadUrl && (
        <div className="flex shrink-0 justify-center border-t border-gray-200 p-2">
          <DownloadLink url={downloadUrl} path={file.path} />
        </div>
      )}
    </div>
  )
}

function DownloadLink({ url, path }: { url: string; path: string }) {
  return (
    <a
      href={url}
      download={path.split("/").pop()}
      className="text-sm text-blue-600 underline underline-offset-2 hover:text-blue-700"
    >
      Download file
    </a>
  )
}
