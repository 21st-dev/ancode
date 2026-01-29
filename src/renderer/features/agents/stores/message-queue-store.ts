import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import type { AgentQueueItem } from "../lib/queue-utils"
import { removeQueueItem } from "../lib/queue-utils"

// Empty array constant to avoid creating new arrays on each call
// Exported for use in selectors to maintain stable reference
export const EMPTY_QUEUE: AgentQueueItem[] = []

interface MessageQueueState {
  // Map: subChatId -> queue items
  queues: Record<string, AgentQueueItem[]>

  // Track which items are being edited (pauses processing for items at top of queue)
  editingItemIds: Set<string>

  // Actions
  addToQueue: (subChatId: string, item: AgentQueueItem) => void
  removeFromQueue: (subChatId: string, itemId: string) => void
  getQueue: (subChatId: string) => AgentQueueItem[]
  getNextItem: (subChatId: string) => AgentQueueItem | null
  clearQueue: (subChatId: string) => void
  // Returns and removes the item from queue (atomic operation)
  popItem: (subChatId: string, itemId: string) => AgentQueueItem | null
  // Add item to front of queue (for error recovery)
  prependItem: (subChatId: string, item: AgentQueueItem) => void
  // Update a queue item (for editing)
  updateQueueItem: (subChatId: string, itemId: string, updates: Partial<Pick<AgentQueueItem, "message" | "images" | "files" | "textContexts" | "diffTextContexts">>) => void
  // Track editing state
  setEditingItem: (itemId: string, isEditing: boolean) => void
  isItemEditing: (itemId: string) => boolean
}

export const useMessageQueueStore = create<MessageQueueState>()(
  subscribeWithSelector((set, get) => ({
    queues: {},
    editingItemIds: new Set<string>(),

  addToQueue: (subChatId, item) => {
    set((state) => ({
      queues: {
        ...state.queues,
        [subChatId]: [...(state.queues[subChatId] || []), item],
      },
    }))
  },

  removeFromQueue: (subChatId, itemId) => {
    set((state) => {
      const currentQueue = state.queues[subChatId] || []
      return {
        queues: {
          ...state.queues,
          [subChatId]: removeQueueItem(currentQueue, itemId),
        },
      }
    })
  },

  getQueue: (subChatId) => {
    return get().queues[subChatId] ?? EMPTY_QUEUE
  },

  getNextItem: (subChatId) => {
    const queue = get().queues[subChatId] || []
    return queue.find((item) => item.status === "pending") || null
  },

  clearQueue: (subChatId) => {
    set((state) => ({
      queues: {
        ...state.queues,
        [subChatId]: [],
      },
    }))
  },

  // Atomic pop: find and remove in single set() call to prevent race conditions
  popItem: (subChatId, itemId) => {
    let foundItem: AgentQueueItem | null = null
    set((state) => {
      const currentQueue = state.queues[subChatId] || []
      foundItem = currentQueue.find((i) => i.id === itemId) || null
      if (!foundItem) return state
      return {
        queues: {
          ...state.queues,
          [subChatId]: currentQueue.filter((i) => i.id !== itemId),
        },
      }
    })
    return foundItem
  },

  // Add item to front of queue (used for error recovery - requeue failed items)
  prependItem: (subChatId, item) => {
    set((state) => ({
      queues: {
        ...state.queues,
        [subChatId]: [item, ...(state.queues[subChatId] || [])],
      },
    }))
  },

  // Update a queue item (for editing queued messages)
  updateQueueItem: (subChatId, itemId, updates) => {
    set((state) => {
      const currentQueue = state.queues[subChatId] || []
      return {
        queues: {
          ...state.queues,
          [subChatId]: currentQueue.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        },
      }
    })
  },

  // Track which item is being edited (prevents processing if at top of queue)
  setEditingItem: (itemId, isEditing) => {
    set((state) => {
      const newEditingIds = new Set(state.editingItemIds)
      if (isEditing) {
        newEditingIds.add(itemId)
      } else {
        newEditingIds.delete(itemId)
      }
      return { editingItemIds: newEditingIds }
    })
  },

  isItemEditing: (itemId) => {
    return get().editingItemIds.has(itemId)
  },
})))
