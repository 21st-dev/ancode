import { memo } from "react"
import type { FileStatus } from "../../../../shared/changes-types"
import { getStatusIndicator } from "../../changes/utils/status"
import { cn } from "../../../lib/utils"

interface CommitFileItemProps {
  file: { path: string; status: FileStatus }
  onClick: () => void
}

/**
 * Commit file item component - displays file path with status indicator.
 * Memoized to prevent unnecessary re-renders in file lists.
 * Shows directory path in muted color and filename in bold.
 */
export const CommitFileItem = memo(function CommitFileItem({
  file,
  onClick,
}: CommitFileItemProps) {
  const fileName = file.path.split('/').pop() || file.path
  const dirPath = file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : ''

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1 cursor-pointer transition-colors",
        "hover:bg-muted/80"
      )}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0 flex items-center overflow-hidden">
        {dirPath && (
          <span className="text-xs text-muted-foreground truncate flex-shrink min-w-0">
            {dirPath}/
          </span>
        )}
        <span className="text-xs font-medium flex-shrink-0 whitespace-nowrap">
          {fileName}
        </span>
      </div>
      <div className="shrink-0">
        {getStatusIndicator(file.status)}
      </div>
    </div>
  )
})
