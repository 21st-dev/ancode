import {
  GitOriginal,
  NpmOriginalWordmark,
  YarnOriginal,
  NodejsOriginal,
  PythonOriginal,
  DockerOriginal,
  RustOriginal,
} from "devicons-react"
import { Terminal, Cog, Package } from "lucide-react"
import { type CommandType } from "./bash-command-utils"

interface CommandIconProps {
  type: CommandType
  className?: string
  size?: number
}

export function CommandIcon({
  type,
  className,
  size = 14,
}: CommandIconProps) {
  const props = { size, className }

  switch (type) {
    case "git":
      return <GitOriginal {...props} />
    case "npm":
      return <NpmOriginalWordmark {...props} />
    case "yarn":
      return <YarnOriginal {...props} />
    case "bun":
      // bun doesn't have a specific devicon, use package icon
      return <Package className={className} size={size} />
    case "pnpm":
      // pnpm doesn't have a devicon, use npm or generic package
      return <Package className={className} size={size} />
    case "node":
      return <NodejsOriginal {...props} />
    case "python":
      return <PythonOriginal {...props} />
    case "docker":
      return <DockerOriginal {...props} />
    case "cargo":
      return <RustOriginal {...props} />
    case "make":
      return <Cog className={className} size={size} />
    default:
      return <Terminal className={className} size={size} />
  }
}
