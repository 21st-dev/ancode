/**
 * Normalize projects list response to always return an array.
 * Handles both array and paginated response formats.
 */
export function normalizeProjects<T>(
  projects: T[] | { items: T[]; total: number; hasMore: boolean } | undefined
): T[] {
  if (!projects) return []
  
  // If it's already an array, return it
  if (Array.isArray(projects)) {
    return projects
  }
  
  // If it's a paginated response, return items
  if (typeof projects === "object" && "items" in projects && Array.isArray(projects.items)) {
    return projects.items
  }
  
  return []
}
