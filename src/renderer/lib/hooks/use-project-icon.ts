import { useState, useEffect } from "react"

// Module-level cache for local file icons: projectId → blob URL
const fileIconCache = new Map<string, string>()
// Deduplicate concurrent fetches
const pendingFetches = new Map<string, Promise<string | null>>()

async function fetchFileIcon(projectId: string, fileUrl: string): Promise<string | null> {
  const cached = fileIconCache.get(projectId)
  if (cached) return cached

  const pending = pendingFetches.get(projectId)
  if (pending) return pending

  const promise = (async () => {
    try {
      const res = await fetch(fileUrl)
      if (!res.ok) return null
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      fileIconCache.set(projectId, blobUrl)
      return blobUrl
    } catch {
      return null
    } finally {
      pendingFetches.delete(projectId)
    }
  })()

  pendingFetches.set(projectId, promise)
  return promise
}

/**
 * Invalidate a project's cached icon (call after upload/remove).
 * Revokes the blob URL and removes the cache entry so the hook re-fetches.
 */
export function invalidateProjectIcon(projectId: string) {
  const cached = fileIconCache.get(projectId)
  if (cached) {
    URL.revokeObjectURL(cached)
    fileIconCache.delete(projectId)
  }
}

interface ProjectIconData {
  id: string
  iconPath?: string | null
  updatedAt?: string | Date | null
  gitOwner?: string | null
  gitProvider?: string | null
}

interface UseProjectIconResult {
  /** URL to use as img src — blob URL for local icons, direct URL for GitHub avatars */
  src: string | null
  isLoading: boolean
  hasError: boolean
}

/**
 * Hook that returns a URL for a project's icon.
 * - Custom local icons: fetched once and cached as blob URLs (avoids re-reading file)
 * - GitHub avatars: returns direct URL (browser <img> handles caching, no CSP issue)
 * - No icon: returns null
 */
export function useProjectIcon(project: ProjectIconData | null | undefined): UseProjectIconResult {
  const [src, setSrc] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!project) {
      setSrc(null)
      setIsLoading(false)
      setHasError(false)
      return
    }

    let cancelled = false

    if (project.iconPath) {
      // Local file icon — fetch and cache as blob URL
      const cached = fileIconCache.get(project.id)
      if (cached) {
        setSrc(cached)
        setIsLoading(false)
        setHasError(false)
        return
      }

      setIsLoading(true)
      setHasError(false)

      const fileUrl = `file://${project.iconPath}?t=${project.updatedAt}`
      fetchFileIcon(project.id, fileUrl).then((blobUrl) => {
        if (cancelled) return
        if (blobUrl) {
          setSrc(blobUrl)
          setHasError(false)
        } else {
          setSrc(null)
          setHasError(true)
        }
        setIsLoading(false)
      })
    } else if (project.gitOwner && project.gitProvider === "github") {
      // GitHub avatar — return direct URL, <img> handles loading/caching
      setSrc(`https://github.com/${project.gitOwner}.png?size=64`)
      setIsLoading(false)
      setHasError(false)
    } else {
      setSrc(null)
      setIsLoading(false)
      setHasError(false)
    }

    return () => {
      cancelled = true
    }
  }, [project?.id, project?.iconPath, project?.updatedAt, project?.gitOwner, project?.gitProvider])

  return { src, isLoading, hasError }
}
