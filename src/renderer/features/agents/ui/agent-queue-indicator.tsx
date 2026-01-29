"use client"

import { memo, useState, useCallback, useEffect } from "react"
import { ChevronDown, ArrowUp, X, Pencil } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../components/ui/tooltip"
import { cn } from "../../../lib/utils"
import type { AgentQueueItem } from "../lib/queue-utils"
import { RenderFileMentions } from "../mentions/render-file-mentions"
import { getWindowId } from "../../../contexts/WindowContext"
import { EditQueuedMessageDialog } from "../components/edit-queued-message-dialog"

// Window-scoped key so each window has its own queue expanded state
const getQueueExpandedKey = () => `${getWindowId()}:agent-queue-expanded`

// Queue item row component
const QueueItemRow = memo(function QueueItemRow({
  item,
  onRemove,
  onSendNow,
  onEdit,
}: {
  item: AgentQueueItem
  onRemove?: (itemId: string) => void
  onSendNow?: (itemId: string) => void
  onEdit?: (item: AgentQueueItem) => void
}) {
  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onRemove?.(item.id)
    },
    [item.id, onRemove]
  )

  const handleSendNow = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onSendNow?.(item.id)
    },
    [item.id, onSendNow]
  )

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onEdit?.(item)
    },
    [item, onEdit]
  )

  // Get display text - truncate message and show attachment count
  const hasAttachments =
    (item.images && item.images.length > 0) ||
    (item.files && item.files.length > 0) ||
    (item.textContexts && item.textContexts.length > 0) ||
    (item.diffTextContexts && item.diffTextContexts.length > 0)
  const attachmentCount =
    (item.images?.length || 0) +
    (item.files?.length || 0) +
    (item.textContexts?.length || 0) +
    (item.diffTextContexts?.length || 0)

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors cursor-default">
      <span className="truncate flex-1 text-foreground">
          <RenderFileMentions text={item.message} />
        </span>
      {hasAttachments && (
        <span className="flex-shrink-0 text-muted-foreground text-[10px]">
          +{attachmentCount} {attachmentCount === 1 ? "file" : "files"}
        </span>
      )}
      <div className="flex items-center gap-1">
        {onEdit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleEdit}
                className="flex-shrink-0 p-1 hover:bg-foreground/10 rounded text-muted-foreground hover:text-foreground transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Edit</TooltipContent>
          </Tooltip>
        )}
        {onSendNow && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleSendNow}
                className="flex-shrink-0 p-1 hover:bg-foreground/10 rounded text-muted-foreground hover:text-foreground transition-all"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Send now</TooltipContent>
          </Tooltip>
        )}
        {onRemove && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleRemove}
                className="flex-shrink-0 p-1 hover:bg-foreground/10 rounded text-muted-foreground hover:text-foreground transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Remove</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
})

interface AgentQueueIndicatorProps {
  queue: AgentQueueItem[]
  onRemoveItem?: (itemId: string) => void
  onSendNow?: (itemId: string) => void
  isStreaming?: boolean
  /** Whether there's a status card below this one - affects border radius */
  hasStatusCardBelow?: boolean
  /** Sub-chat ID for editing messages */
  subChatId: string
}

export const AgentQueueIndicator = memo(function AgentQueueIndicator({
  queue,
  onRemoveItem,
  onSendNow,
  isStreaming = false,
  hasStatusCardBelow = false,
  subChatId,
}: AgentQueueIndicatorProps) {
  // Load expanded state from localStorage (window-scoped)
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === "undefined") return true
    const saved = localStorage.getItem(getQueueExpandedKey())
    return saved !== null ? saved === "true" : true // Default to expanded
  })

  // Edit dialog state
  const [editingItem, setEditingItem] = useState<AgentQueueItem | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Save expanded state to localStorage (window-scoped)
  useEffect(() => {
    localStorage.setItem(getQueueExpandedKey(), String(isExpanded))
  }, [isExpanded])

  const handleEdit = useCallback((item: AgentQueueItem) => {
    setEditingItem(item)
    setIsEditDialogOpen(true)
  }, [])

  const handleCloseEditDialog = useCallback(() => {
    setIsEditDialogOpen(false)
    setEditingItem(null)
  }, [])

  if (queue.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        "border border-border bg-muted/30 overflow-hidden flex flex-col rounded-t-xl",
        // If status card below - no bottom border/radius, no padding
        // If no status card - need pb-6 for input overlap
        hasStatusCardBelow ? "border-b-0" : "border-b-0 pb-6"
      )}
    >
      {/* Header - at top */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setIsExpanded(!isExpanded)
          }
        }}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? "Collapse" : "Expand"} queue`}
        className="flex items-center justify-between pr-1 pl-3 h-8 cursor-pointer hover:bg-muted/50 transition-colors duration-150 focus:outline-none rounded-sm"
      >
        <div className="flex items-center gap-2 text-xs flex-1 min-w-0">
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              !isExpanded && "-rotate-90"
            )}
          />
          <span className="text-xs text-muted-foreground">
            {queue.length} in queue
          </span>
        </div>

      </div>

      {/* Expanded content - queue items */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border max-h-[200px] overflow-y-auto">
              {queue.map((item, index) => (
                <QueueItemRow
                  key={item.id}
                  item={item}
                  onRemove={onRemoveItem}
                  onSendNow={onSendNow}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit queued message dialog */}
      <EditQueuedMessageDialog
        isOpen={isEditDialogOpen}
        onClose={handleCloseEditDialog}
        item={editingItem}
        subChatId={subChatId}
        isFirstInQueue={editingItem ? queue[0]?.id === editingItem.id : false}
      />
    </div>
  )
})
