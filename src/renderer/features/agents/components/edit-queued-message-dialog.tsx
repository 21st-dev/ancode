"use client"

import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { Button } from "../../../components/ui/button"
import { Textarea } from "../../../components/ui/textarea"
import type { AgentQueueItem } from "../lib/queue-utils"
import { useMessageQueueStore } from "../stores/message-queue-store"

interface EditQueuedMessageDialogProps {
  isOpen: boolean
  onClose: () => void
  item: AgentQueueItem | null
  subChatId: string
  isFirstInQueue?: boolean
}

const EASING_CURVE = [0.55, 0.055, 0.675, 0.19] as const
const INTERACTION_DELAY_MS = 250

export function EditQueuedMessageDialog({
  isOpen,
  onClose,
  item,
  subChatId,
  isFirstInQueue = false,
}: EditQueuedMessageDialogProps) {
  const [mounted, setMounted] = useState(false)
  const [message, setMessage] = useState("")
  const openAtRef = useRef<number>(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const updateQueueItem = useMessageQueueStore((s) => s.updateQueueItem)
  const setEditingItem = useMessageQueueStore((s) => s.setEditingItem)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen && item) {
      openAtRef.current = performance.now()
      setMessage(item.message)
      // If editing the first item in queue, pause processing
      if (isFirstInQueue) {
        setEditingItem(item.id, true)
      }
    }
  }, [isOpen, item, isFirstInQueue, setEditingItem])

  const handleAnimationComplete = () => {
    if (isOpen) {
      textareaRef.current?.focus()
      // Select all text
      textareaRef.current?.select()
    }
  }

  const handleClose = useCallback(() => {
    const canInteract = performance.now() - openAtRef.current > INTERACTION_DELAY_MS
    if (!canInteract) return
    // Clear editing state when closing
    if (item && isFirstInQueue) {
      setEditingItem(item.id, false)
    }
    onClose()
  }, [item, isFirstInQueue, setEditingItem, onClose])

  const handleSave = useCallback(() => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage || !item) {
      handleClose()
      return
    }

    // Only update if changed
    if (trimmedMessage !== item.message) {
      updateQueueItem(subChatId, item.id, { message: trimmedMessage })
    }

    // Clear editing state
    if (isFirstInQueue) {
      setEditingItem(item.id, false)
    }
    onClose()
  }, [message, item, subChatId, updateQueueItem, isFirstInQueue, setEditingItem, onClose, handleClose])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        handleClose()
      }
      // Cmd/Ctrl + Enter to save
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        handleSave()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, handleClose, handleSave])

  if (!mounted) return null

  const portalTarget = typeof document !== "undefined" ? document.body : null
  if (!portalTarget) return null

  const hasAttachments =
    (item?.images && item.images.length > 0) ||
    (item?.files && item.files.length > 0) ||
    (item?.textContexts && item.textContexts.length > 0) ||
    (item?.diffTextContexts && item.diffTextContexts.length > 0)

  const attachmentCount =
    (item?.images?.length || 0) +
    (item?.files?.length || 0) +
    (item?.textContexts?.length || 0) +
    (item?.diffTextContexts?.length || 0)

  return createPortal(
    <AnimatePresence mode="wait" initial={false}>
      {isOpen && item && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: { duration: 0.18, ease: EASING_CURVE },
            }}
            exit={{
              opacity: 0,
              pointerEvents: "none" as const,
              transition: { duration: 0.15, ease: EASING_CURVE },
            }}
            className="fixed inset-0 z-[45] bg-black/25"
            onClick={handleClose}
            style={{ pointerEvents: "auto" }}
            data-modal="edit-queued-message"
          />

          {/* Main Dialog */}
          <div className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] z-[46] pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: EASING_CURVE }}
              onAnimationComplete={handleAnimationComplete}
              className="w-[90vw] max-w-[500px] pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-background rounded-2xl border shadow-2xl overflow-hidden" data-canvas-dialog>
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-1">
                    Edit queued message
                  </h2>
                  {isFirstInQueue && (
                    <p className="text-sm text-muted-foreground mb-4">
                      Queue processing is paused while editing
                    </p>
                  )}
                  {!isFirstInQueue && (
                    <p className="text-sm text-muted-foreground mb-4">
                      Edit the message before it's sent
                    </p>
                  )}

                  {/* Textarea for message */}
                  <Textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message..."
                    className="w-full min-h-[120px] max-h-[300px] text-sm resize-y"
                  />

                  {/* Attachment info */}
                  {hasAttachments && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {attachmentCount} {attachmentCount === 1 ? "attachment" : "attachments"} will be included
                    </p>
                  )}
                </div>

                {/* Footer with buttons */}
                <div className="bg-muted p-4 flex justify-between border-t border-border rounded-b-xl">
                  <Button
                    onClick={handleClose}
                    variant="ghost"
                    className="rounded-md"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    variant="default"
                    disabled={!message.trim()}
                    className="rounded-md"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    portalTarget,
  )
}
