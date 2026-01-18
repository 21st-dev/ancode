import { trpc } from "../../../lib/trpc"

/**
 * Error reasons for file loading failures
 */
export type FileLoadError =
  | "not-found"
  | "too-large"
  | "binary"
  | "outside-worktree"
  | "symlink-escape"
  | "unknown"

/**
 * Result of file content loading
 */
export interface FileContentResult {
  content: string | null
  isLoading: boolean
  error: FileLoadError | null
  byteLength: number | null
  refetch: () => void
}

/**
 * Get user-friendly error message for file load errors
 */
export function getErrorMessage(error: FileLoadError): string {
  switch (error) {
    case "not-found":
      return "File not found"
    case "too-large":
      return "File is too large to display (max 2 MB)"
    case "binary":
      return "Cannot display binary file"
    case "outside-worktree":
      return "File is outside the project directory"
    case "symlink-escape":
      return "Cannot follow symlink outside project"
    case "unknown":
    default:
      return "Failed to load file"
  }
}

/**
 * Hook to fetch file content from the backend
 * Uses the existing tRPC changes.readWorkingFile procedure
 */
export function useFileContent(
  projectPath: string | null,
  filePath: string | null,
): FileContentResult {
  const enabled = !!projectPath && !!filePath

  const query = trpc.changes.readWorkingFile.useQuery(
    {
      worktreePath: projectPath || "",
      filePath: filePath || "",
    },
    {
      enabled,
      staleTime: 30000, // Cache for 30 seconds
      refetchOnWindowFocus: false,
    },
  )

  // Parse the result
  if (!enabled) {
    return {
      content: null,
      isLoading: false,
      error: null,
      byteLength: null,
      refetch: () => {},
    }
  }

  if (query.isLoading) {
    return {
      content: null,
      isLoading: true,
      error: null,
      byteLength: null,
      refetch: query.refetch,
    }
  }

  if (query.error) {
    return {
      content: null,
      isLoading: false,
      error: "unknown",
      byteLength: null,
      refetch: query.refetch,
    }
  }

  const result = query.data
  if (!result) {
    return {
      content: null,
      isLoading: false,
      error: "unknown",
      byteLength: null,
      refetch: query.refetch,
    }
  }

  if (result.ok) {
    return {
      content: result.content,
      isLoading: false,
      error: null,
      byteLength: result.byteLength,
      refetch: query.refetch,
    }
  }

  return {
    content: null,
    isLoading: false,
    error: result.reason as FileLoadError,
    byteLength: null,
    refetch: query.refetch,
  }
}
