import { useState, useCallback } from "react"
import { FolderOpen } from "lucide-react"
import { useProjectIcon } from "../../lib/hooks/use-project-icon"
import { cn } from "../../lib/utils"

interface ProjectIconProps {
  project: {
    id: string
    iconPath?: string | null
    updatedAt?: string | Date | null
    gitOwner?: string | null
    gitProvider?: string | null
  } | null | undefined
  className?: string
}

export function ProjectIcon({ project, className }: ProjectIconProps) {
  const { src, hasError } = useProjectIcon(project)
  const [imgError, setImgError] = useState(false)
  const handleError = useCallback(() => setImgError(true), [])

  if (!project || hasError || !src || imgError) {
    return (
      <FolderOpen
        className={cn("text-muted-foreground flex-shrink-0", className)}
      />
    )
  }

  return (
    <img
      src={src}
      alt=""
      className={cn("rounded-sm flex-shrink-0 object-cover", className)}
      onError={handleError}
    />
  )
}
