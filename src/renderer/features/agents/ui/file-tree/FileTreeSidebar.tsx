"use client"

import { useAtom } from "jotai"
import { useCallback, useMemo } from "react"
import { Button } from "../../../../components/ui/button"
import { IconDoubleChevronLeft } from "../../../../components/ui/icons"
import { Kbd } from "../../../../components/ui/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../../components/ui/tooltip"
import { trpc } from "../../../../lib/trpc"
import { expandedFoldersAtomFamily } from "../../atoms"
import { buildFileTree, countFiles, countFolders } from "./build-file-tree"
import { FileTreeNode, type GitStatusMap } from "./FileTreeNode"

interface FileTreeSidebarProps {
  projectPath: string | undefined
  projectId: string
  onClose: () => void
  /** Called when a data file (CSV, JSON, SQLite, Parquet) is clicked */
  onSelectDataFile?: (path: string) => void
  /** Called when a source file (non-data file) is clicked */
  onSelectSourceFile?: (path: string) => void
  /** @deprecated Use onSelectDataFile and onSelectSourceFile instead */
  onSelectFile?: (path: string) => void
}

export function FileTreeSidebar({
  projectPath,
  projectId,
  onClose,
  onSelectDataFile,
  onSelectSourceFile,
  onSelectFile,
}: FileTreeSidebarProps) {
  const [expandedFolders, setExpandedFolders] = useAtom(
    expandedFoldersAtomFamily(projectId),
  )

  // Fetch all files from project
  const {
    data: entries = [],
    isLoading,
    refetch,
  } = trpc.files.listAll.useQuery(
    { projectPath: projectPath || "" },
    {
      enabled: !!projectPath,
      staleTime: 1000, // Short TTL since we have real-time watching
    },
  )

  // Fetch git status
  const {
    data: gitStatus = {},
    refetch: refetchGitStatus,
  } = trpc.files.gitStatus.useQuery(
    { projectPath: projectPath || "" },
    {
      enabled: !!projectPath,
      staleTime: 1000,
    },
  )

  // Subscribe to file changes for real-time sync
  trpc.files.watchChanges.useSubscription(
    { projectPath: projectPath || "" },
    {
      enabled: !!projectPath,
      onData: () => {
        // Refetch file list when files change
        refetch()
      },
    },
  )

  // Subscribe to git changes separately (more efficient - only watches .git directory)
  trpc.files.watchGitChanges.useSubscription(
    { projectPath: projectPath || "" },
    {
      enabled: !!projectPath,
      onData: () => {
        // Refetch git status when git state changes (commits, staging, etc.)
        refetchGitStatus()
      },
    },
  )

  // Build tree from flat entries
  const tree = useMemo(() => buildFileTree(entries), [entries])

  // Stats for footer
  const fileCount = useMemo(() => countFiles(tree), [tree])
  const folderCount = useMemo(() => countFolders(tree), [tree])

  // Toggle folder expansion
  const handleToggleFolder = useCallback(
    (path: string) => {
      const next = new Set(expandedFolders)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      setExpandedFolders(next)
    },
    [expandedFolders, setExpandedFolders],
  )

  return (
    <div className="flex flex-col h-full min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-1 px-2 py-1.5 flex-shrink-0">
        <span className="text-xs font-medium text-foreground truncate pl-0.5">
          Files
        </span>
        {/* Close button */}
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6 p-0 hover:bg-foreground/10 transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] text-foreground flex-shrink-0 rounded-md"
              aria-label="Close file tree"
            >
              <IconDoubleChevronLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Close file tree
            <Kbd>⌘B</Kbd>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1">
        {!projectPath ? (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
            No project selected
          </div>
        ) : isLoading ? (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
            Loading files...
          </div>
        ) : tree.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
            No files found
          </div>
        ) : (
          tree.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              level={0}
              expandedFolders={expandedFolders}
              onToggleFolder={handleToggleFolder}
              onSelectDataFile={onSelectDataFile}
              onSelectSourceFile={onSelectSourceFile}
              onSelectFile={onSelectFile}
              gitStatus={gitStatus as GitStatusMap}
            />
          ))
        )}
      </div>

      {/* Footer with stats */}
      {!isLoading && tree.length > 0 && (
        <div className="px-3 py-1.5 border-t border-border/50 text-[10px] text-muted-foreground flex-shrink-0">
          {fileCount} file{fileCount !== 1 ? "s" : ""}, {folderCount} folder
          {folderCount !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  )
}
