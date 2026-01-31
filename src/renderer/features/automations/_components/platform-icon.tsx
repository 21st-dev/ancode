import { GitHubIcon } from "../../../icons"
import { LinearIcon } from "./linear-icon"
import type { Platform } from "./types"

interface PlatformIconProps {
  platform: Platform
  className?: string
}

export function PlatformIcon({ platform, className }: PlatformIconProps) {
  if (platform === "linear") {
    return <LinearIcon className={className} />
  }
  return <GitHubIcon className={className} />
}
