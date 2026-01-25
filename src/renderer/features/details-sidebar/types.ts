/** Parsed diff file type - shared across overview sidebar components */
export interface ParsedDiffFile {
  key: string
  oldPath: string
  newPath: string
  additions: number
  deletions: number
  isNewFile?: boolean
  isDeletedFile?: boolean
}
