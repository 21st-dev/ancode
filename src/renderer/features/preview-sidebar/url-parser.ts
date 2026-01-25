import type { DetectedUrl } from "./types"

// Regex to match localhost URLs with various formats
// Matches: http://localhost:3000, http://127.0.0.1:3000, http://0.0.0.0:3000
// Also matches URLs with paths like http://localhost:3000/api
const LOCALHOST_URL_REGEX = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)(?:\/[^\s]*)?/gi

// Ports to exclude from detection - these are used by the Electron app itself
// 5199: electron-vite renderer dev server (custom port in electron.vite.config.ts)
// 21322: Auth server
const EXCLUDED_PORTS = new Set([5199, 21322])

/**
 * Parse terminal output for localhost URLs
 * Optimized for performance - uses regex with minimal allocations
 */
export function parseUrlsFromOutput(output: string): DetectedUrl[] {
  const matches = output.matchAll(LOCALHOST_URL_REGEX)
  const urls: DetectedUrl[] = []
  const seenPorts = new Set<number>()
  const now = Date.now()

  for (const match of matches) {
    const url = match[0]
    const port = parseInt(match[1], 10)

    // Skip excluded ports (Electron app's own servers)
    if (EXCLUDED_PORTS.has(port)) continue

    // Skip if we've already seen this port
    if (seenPorts.has(port)) continue
    seenPorts.add(port)

    // Normalize URL to use localhost
    const normalizedUrl = url.replace(/127\.0\.0\.1|0\.0\.0\.0/, "localhost")

    urls.push({
      url: normalizedUrl,
      port,
      host: "localhost",
      timestamp: now,
    })
  }

  // Sort by port number for consistent ordering
  return urls.sort((a, b) => a.port - b.port)
}

/**
 * Incrementally parse new output and merge with existing URLs
 * Returns new URLs that weren't previously detected
 */
export function parseAndMergeUrls(
  newOutput: string,
  existingUrls: DetectedUrl[]
): { urls: DetectedUrl[]; hasNew: boolean } {
  const newUrls = parseUrlsFromOutput(newOutput)
  const existingPorts = new Set(existingUrls.map(u => u.port))

  const addedUrls = newUrls.filter(u => !existingPorts.has(u.port))

  if (addedUrls.length === 0) {
    return { urls: existingUrls, hasNew: false }
  }

  // Merge and sort
  const merged = [...existingUrls, ...addedUrls].sort((a, b) => a.port - b.port)
  return { urls: merged, hasNew: true }
}
