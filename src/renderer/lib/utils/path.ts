/**
 * Simple path utilities for the renderer process
 * These work with forward slashes (Unix-style paths)
 */

/**
 * Join path segments with forward slashes
 */
export function join(...segments: string[]): string {
  return segments
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/")
}

/**
 * Get the base name (last segment) of a path
 */
export function basename(path: string): string {
  const segments = path.split("/").filter(Boolean)
  return segments[segments.length - 1] || ""
}

/**
 * Get the directory name (all but last segment) of a path
 */
export function dirname(path: string): string {
  const segments = path.split("/").filter(Boolean)
  if (segments.length <= 1) return "."
  segments.pop()
  return segments.join("/")
}

/**
 * Get the file extension including the dot
 */
export function extname(path: string): string {
  const name = basename(path)
  const lastDot = name.lastIndexOf(".")
  if (lastDot <= 0) return ""
  return name.slice(lastDot)
}
