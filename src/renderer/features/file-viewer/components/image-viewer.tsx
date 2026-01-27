import { useMemo } from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconCloseSidebarRight } from "@/components/ui/icons"
import { trpc } from "@/lib/trpc"
import { getFileIconByExtension } from "../../agents/mentions/agents-file-mention"
import { getFileName, formatFileSize } from "../utils/file-utils"

interface ImageViewerProps {
  filePath: string
  projectPath: string
  onClose: () => void
}

/**
 * ImageViewer - Simple fit-to-view image display
 */
export function ImageViewer({
  filePath,
  projectPath,
  onClose,
}: ImageViewerProps) {
  const fileName = getFileName(filePath)

  // Build absolute path
  const absolutePath = useMemo(() => {
    return filePath.startsWith("/") ? filePath : `${projectPath}/${filePath}`
  }, [filePath, projectPath])

  // Fetch image as base64
  const { data, isLoading, error } = trpc.files.readBinaryFile.useQuery(
    { filePath: absolutePath },
    { staleTime: 60000 } // Cache for 1 minute
  )

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-10 border-b bg-background flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {(() => {
            const Icon = getFileIconByExtension(filePath)
            return Icon ? <Icon className="h-4 w-4 flex-shrink-0" /> : null
          })()}
          <span className="text-sm font-medium truncate" title={filePath}>
            {fileName}
          </span>
          {data?.ok && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatFileSize(data.byteLength)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Close button */}
          <Button
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-muted transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] rounded-md ml-1"
            onClick={onClose}
          >
            <IconCloseSidebarRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex items-center justify-center bg-muted/20 p-4">
        {isLoading && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm">Loading image...</span>
          </div>
        )}

        {error && (() => {
          const isNotFound = error.message?.toLowerCase().includes("enoent") ||
                             error.message?.toLowerCase().includes("not found") ||
                             error.message?.toLowerCase().includes("no such file")
          const errorMessage = isNotFound ? "File not found" : "Failed to load image"
          return (
            <div className="flex flex-col items-center gap-3 text-center max-w-[300px]">
              <AlertCircle className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium text-foreground">{errorMessage}</p>
            </div>
          )
        })()}

        {data && !data.ok && (
          <div className="flex flex-col items-center gap-3 text-center max-w-[300px]">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">
                {data.reason === "too-large" ? "Image too large" : "Image not found"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {data.reason === "too-large"
                  ? "The image exceeds the 20MB size limit."
                  : "The file could not be found."}
              </p>
            </div>
          </div>
        )}

        {data?.ok && (
          <img
            src={`data:${data.mimeType};base64,${data.data}`}
            alt={fileName}
            className="max-w-full max-h-full object-contain rounded-sm"
            style={{ imageRendering: "auto" }}
          />
        )}
      </div>
    </div>
  )
}
