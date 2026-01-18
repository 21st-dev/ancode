"use client"

import { ChevronRight, File, Folder, FolderOpen, FileSpreadsheet, FileJson, Database, FileBox } from "lucide-react"
import { memo, useCallback, useMemo } from "react"
import { cn } from "../../../../lib/utils"
import type { TreeNode } from "./build-file-tree"

// Data file extensions for special icons
const DATA_FILE_EXTENSIONS: Record<string, "csv" | "json" | "sqlite" | "parquet"> = {
  ".csv": "csv",
  ".tsv": "csv",
  ".json": "json",
  ".jsonl": "json",
  ".db": "sqlite",
  ".sqlite": "sqlite",
  ".sqlite3": "sqlite",
  ".parquet": "parquet",
  ".pq": "parquet",
}

function getDataFileType(filename: string): "csv" | "json" | "sqlite" | "parquet" | null {
  const ext = filename.includes(".") ? `.${filename.split(".").pop()?.toLowerCase()}` : ""
  return DATA_FILE_EXTENSIONS[ext] || null
}

function isDataFile(filename: string): boolean {
  return getDataFileType(filename) !== null
}

// Git status type matching the backend
type GitStatusCode =
  | "modified"
  | "added"
  | "deleted"
  | "renamed"
  | "copied"
  | "untracked"
  | "ignored"
  | "unmerged"
  | null

export type GitStatusMap = Record<string, { status: GitStatusCode; staged: boolean }>

// Status colors matching VS Code conventions
const STATUS_COLORS: Record<string, string> = {
  modified: "text-yellow-500 dark:text-yellow-400",      // Yellow for modified
  added: "text-green-500 dark:text-green-400",           // Green for added/staged
  deleted: "text-red-500 dark:text-red-400",             // Red for deleted
  renamed: "text-green-500 dark:text-green-400",         // Green for renamed
  copied: "text-green-500 dark:text-green-400",          // Green for copied
  untracked: "text-green-600 dark:text-green-500",       // Darker green for untracked
  ignored: "text-muted-foreground/50",                   // Dimmed for ignored
  unmerged: "text-red-600 dark:text-red-500",            // Red for conflicts
}

// Status indicators (shown after filename)
const STATUS_INDICATORS: Record<string, string> = {
  modified: "M",
  added: "A",
  deleted: "D",
  renamed: "R",
  copied: "C",
  untracked: "U",
  unmerged: "!",
}

interface FileTreeNodeProps {
  node: TreeNode
  level: number
  expandedFolders: Set<string>
  onToggleFolder: (path: string) => void
  /** Called when a data file (CSV, JSON, SQLite, Parquet) is clicked */
  onSelectDataFile?: (path: string) => void
  /** Called when a source file (non-data file) is clicked */
  onSelectSourceFile?: (path: string) => void
  /** @deprecated Use onSelectDataFile and onSelectSourceFile instead */
  onSelectFile?: (path: string) => void
  gitStatus?: GitStatusMap
}

export const FileTreeNode = memo(function FileTreeNode({
  node,
  level,
  expandedFolders,
  onToggleFolder,
  onSelectDataFile,
  onSelectSourceFile,
  onSelectFile,
  gitStatus = {},
}: FileTreeNodeProps) {
  const isExpanded = node.type === "folder" && expandedFolders.has(node.path)
  const hasChildren = node.type === "folder" && node.children.length > 0

  // Get git status for this file
  const fileStatus = gitStatus[node.path]
  const statusCode = fileStatus?.status
  const isStaged = fileStatus?.staged

  // For folders, check if any children have changes
  const folderHasChanges = useMemo(() => {
    if (node.type !== "folder") return false

    // Check if any file in gitStatus starts with this folder path
    return Object.keys(gitStatus).some(path =>
      path.startsWith(node.path + "/")
    )
  }, [node.type, node.path, gitStatus])

  const handleClick = useCallback(() => {
    if (node.type === "folder") {
      onToggleFolder(node.path)
    } else {
      // Determine if this is a data file or source file
      if (isDataFile(node.name)) {
        // Data files: CSV, JSON, SQLite, Parquet
        onSelectDataFile?.(node.path)
      } else {
        // Source files: everything else
        onSelectSourceFile?.(node.path)
      }
      // Also call legacy onSelectFile for backwards compatibility
      onSelectFile?.(node.path)
    }
  }, [node.type, node.path, node.name, onToggleFolder, onSelectDataFile, onSelectSourceFile, onSelectFile])

  const paddingLeft = level * 12 + 6

  // Determine text color based on status
  const textColorClass = statusCode ? STATUS_COLORS[statusCode] : "text-foreground"
  const statusIndicator = statusCode ? STATUS_INDICATORS[statusCode] : null

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "w-full flex items-center gap-1.5 py-0.5 text-left rounded-sm",
          "hover:bg-accent/50 cursor-pointer transition-colors text-xs",
          "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        )}
        style={{ paddingLeft: `${paddingLeft}px`, paddingRight: "6px" }}
      >
        {/* Chevron for folders */}
        {node.type === "folder" ? (
          <ChevronRight
            className={cn(
              "size-3 text-muted-foreground shrink-0 transition-transform duration-150",
              isExpanded && "rotate-90",
              !hasChildren && "invisible",
            )}
          />
        ) : (
          <span className="size-3 shrink-0" /> // Spacer for files
        )}

        {/* Icon */}
        {node.type === "folder" ? (
          isExpanded ? (
            <FolderOpen className={cn(
              "size-3.5 shrink-0",
              folderHasChanges ? "text-yellow-500 dark:text-yellow-400" : "text-muted-foreground"
            )} />
          ) : (
            <Folder className={cn(
              "size-3.5 shrink-0",
              folderHasChanges ? "text-yellow-500 dark:text-yellow-400" : "text-muted-foreground"
            )} />
          )
        ) : (
          // Use special icons for data files
          (() => {
            const dataType = getDataFileType(node.name)
            if (dataType === "csv") {
              return <FileSpreadsheet className="size-3.5 shrink-0 text-green-500" />
            }
            if (dataType === "json") {
              return <FileJson className="size-3.5 shrink-0 text-yellow-500" />
            }
            if (dataType === "sqlite") {
              return <Database className="size-3.5 shrink-0 text-blue-500" />
            }
            if (dataType === "parquet") {
              return <FileBox className="size-3.5 shrink-0 text-purple-500" />
            }
            return <File className={cn("size-3.5 shrink-0", textColorClass)} />
          })()
        )}

        {/* Name */}
        <span className={cn("truncate flex-1", textColorClass)}>
          {node.name}
        </span>

        {/* Status indicator */}
        {statusIndicator && (
          <span className={cn(
            "text-[10px] font-medium shrink-0 ml-1",
            textColorClass,
            isStaged && "underline" // Underline if staged
          )}>
            {statusIndicator}
          </span>
        )}
      </button>

      {/* Children (only for expanded folders) */}
      {isExpanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              level={level + 1}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onSelectDataFile={onSelectDataFile}
              onSelectSourceFile={onSelectSourceFile}
              onSelectFile={onSelectFile}
              gitStatus={gitStatus}
            />
          ))}
        </div>
      )}
    </div>
  )
})
