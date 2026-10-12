import "../src/styles.css"
import { useEffect, useState } from "react"
import {
  type EditorFile,
  WorkspaceCodeEditor,
} from "../src/components/WorkspaceCodeEditor"
import { useWorkspaceFiles } from "../src/hooks/useWorkspaceFiles"

function createImageDataUrls() {
  const canvas = document.createElement("canvas")
  canvas.width = 1200
  canvas.height = 720
  const context = canvas.getContext("2d")!

  // Leave a transparent margin to demonstrate the preview's checkerboard.
  context.fillStyle = "#186c43"
  context.fillRect(100, 100, 1000, 520)
  context.strokeStyle = "#e7c66b"
  context.lineWidth = 16
  context.strokeRect(180, 180, 840, 360)
  context.fillStyle = "#162e26"
  context.fillRect(440, 240, 320, 240)
  context.fillStyle = "#ffffff"
  context.font = "24px sans-serif"
  context.textAlign = "center"
  context.fillText("Sample board", 600, 368)

  const png = canvas.toDataURL("image/png")
  // JPEG has no alpha channel; give it an opaque background.
  context.globalCompositeOperation = "destination-over"
  context.fillStyle = "#f8fafc"
  context.fillRect(0, 0, canvas.width, canvas.height)
  const jpeg = canvas.toDataURL("image/jpeg")

  return { png, jpeg }
}

function BinaryFilesFixture({
  initialCurrentFile,
}: {
  initialCurrentFile: string
}) {
  const [files, setFiles] = useState<EditorFile[] | null>(null)

  useEffect(() => {
    const { png, jpeg } = createImageDataUrls()
    const pngBytes = Uint8Array.from(atob(png.split(",")[1]!), (char) =>
      char.charCodeAt(0),
    )
    const blobUrl = URL.createObjectURL(
      new Blob([pngBytes], { type: "image/png" }),
    )
    const stepUrl = URL.createObjectURL(
      new Blob(["ISO-10303-21;\nEND-ISO-10303-21;"], {
        type: "application/octet-stream",
      }),
    )
    const largeFileUrl = URL.createObjectURL(
      new Blob([pngBytes, new Uint8Array(5 * 1024 * 1024)], {
        type: "image/png",
      }),
    )
    const largeDimensionsUrl = URL.createObjectURL(
      new Blob(
        [
          '<svg xmlns="http://www.w3.org/2000/svg" width="100000" height="100000"><rect width="100000" height="100000" fill="#186c43" /></svg>',
        ],
        { type: "image/svg+xml" },
      ),
    )

    setFiles([
      {
        path: "board.PNG",
        content: blobUrl,
        isBinary: true,
        downloadUrl: png,
      },
      { path: "board.jpg", content: jpeg, isBinary: true },
      {
        path: "download-only.png",
        content: "",
        isBinary: true,
        downloadUrl: png,
      },
      {
        path: "broken.png",
        content: "data:image/png;base64,broken",
        isBinary: true,
        downloadUrl: png,
      },
      { path: "missing.png", content: "", isBinary: true },
      { path: "large-file.png", content: largeFileUrl, isBinary: true },
      {
        path: "large-dimensions.svg",
        content: largeDimensionsUrl,
        isBinary: true,
      },
      {
        path: "board.step",
        content: stepUrl,
        isBinary: true,
        downloadUrl: stepUrl,
      },
      {
        path: "board.svg",
        content:
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 72">\n  <rect x="10" y="10" width="100" height="52" fill="#186c43" />\n</svg>\n',
      },
      {
        path: "index.tsx",
        content: 'export const message = "Switch between images and code"\n',
      },
    ])

    return () => {
      URL.revokeObjectURL(blobUrl)
      URL.revokeObjectURL(stepUrl)
      URL.revokeObjectURL(largeFileUrl)
      URL.revokeObjectURL(largeDimensionsUrl)
    }
  }, [])

  if (!files) return null

  return (
    <ExampleWorkspace
      key={files[0]?.content}
      initialFiles={files}
      initialCurrentFile={initialCurrentFile}
    />
  )
}

function ExampleWorkspace({
  initialFiles,
  initialCurrentFile,
}: {
  initialFiles: EditorFile[]
  initialCurrentFile: string
}) {
  const workspace = useWorkspaceFiles({ initialFiles, initialCurrentFile })

  return (
    <div className="h-screen bg-white">
      <WorkspaceCodeEditor
        {...workspace}
        enableTypeScriptLanguageService={false}
      />
    </div>
  )
}

export default {
  "PNG blob URL": <BinaryFilesFixture initialCurrentFile="board.PNG" />,
  "JPEG data URL": <BinaryFilesFixture initialCurrentFile="board.jpg" />,
  "PNG download URL": (
    <BinaryFilesFixture initialCurrentFile="download-only.png" />
  ),
  "Failed image": <BinaryFilesFixture initialCurrentFile="broken.png" />,
  "Missing image URL": <BinaryFilesFixture initialCurrentFile="missing.png" />,
  "Unsupported binary": <BinaryFilesFixture initialCurrentFile="board.step" />,
  "Editable SVG": <BinaryFilesFixture initialCurrentFile="board.svg" />,
  "Large file": <BinaryFilesFixture initialCurrentFile="large-file.png" />,
  "Large dimensions": (
    <BinaryFilesFixture initialCurrentFile="large-dimensions.svg" />
  ),
}
