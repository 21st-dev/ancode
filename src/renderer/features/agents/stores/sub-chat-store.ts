import { create } from "zustand"

export interface SubChatMeta {
  id: string
  name: string
  created_at?: string
  updated_at?: string
  mode?: "plan" | "agent"
  color?: string // Tab color for personalization
}

// Available tab colors
export const TAB_COLORS = [
  { name: "None", value: undefined },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Lime", value: "#84cc16" },
  { name: "Green", value: "#22c55e" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
] as const

interface AgentSubChatStore {
  // Current parent chat context
  chatId: string | null

  // State
  activeSubChatId: string | null // Currently selected tab
  openSubChatIds: string[] // Open tabs (preserves order)
  pinnedSubChatIds: string[] // Pinned sub-chats
  allSubChats: SubChatMeta[] // All sub-chats for history

  // Actions
  setChatId: (chatId: string | null) => void
  setActiveSubChat: (subChatId: string) => void
  setOpenSubChats: (subChatIds: string[]) => void
  addToOpenSubChats: (subChatId: string) => void
  removeFromOpenSubChats: (subChatId: string) => void
  togglePinSubChat: (subChatId: string) => void
  setAllSubChats: (subChats: SubChatMeta[]) => void
  addToAllSubChats: (subChat: SubChatMeta) => void
  updateSubChatName: (subChatId: string, name: string) => void
  updateSubChatMode: (subChatId: string, mode: "plan" | "agent") => void
  updateSubChatColor: (subChatId: string, color: string | undefined) => void
  updateSubChatTimestamp: (subChatId: string) => void
  reset: () => void
}

// localStorage helpers - store open tabs, active tab, and pinned tabs
const getStorageKey = (chatId: string, type: "open" | "active" | "pinned") =>
  `agent-${type}-sub-chats-${chatId}`

const saveToLS = (chatId: string, type: "open" | "active" | "pinned", value: unknown) => {
  if (typeof window === "undefined") return
  localStorage.setItem(getStorageKey(chatId, type), JSON.stringify(value))
}

const loadFromLS = <T>(chatId: string, type: "open" | "active" | "pinned", fallback: T): T => {
  if (typeof window === "undefined") return fallback
  try {
    const stored = localStorage.getItem(getStorageKey(chatId, type))
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

// Color storage - stored by subChatId (global across workspaces)
const getColorStorageKey = () => "agent-sub-chat-colors"

const saveColorToLS = (subChatId: string, color: string | undefined) => {
  if (typeof window === "undefined") return
  try {
    const stored = localStorage.getItem(getColorStorageKey())
    const colors: Record<string, string> = stored ? JSON.parse(stored) : {}
    if (color) {
      colors[subChatId] = color
    } else {
      delete colors[subChatId]
    }
    localStorage.setItem(getColorStorageKey(), JSON.stringify(colors))
  } catch {
    // Ignore errors
  }
}

const loadColorFromLS = (subChatId: string): string | undefined => {
  if (typeof window === "undefined") return undefined
  try {
    const stored = localStorage.getItem(getColorStorageKey())
    if (!stored) return undefined
    const colors: Record<string, string> = JSON.parse(stored)
    return colors[subChatId]
  } catch {
    return undefined
  }
}

const loadAllColorsFromLS = (): Record<string, string> => {
  if (typeof window === "undefined") return {}
  try {
    const stored = localStorage.getItem(getColorStorageKey())
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

export const useAgentSubChatStore = create<AgentSubChatStore>((set, get) => ({
  chatId: null,
  activeSubChatId: null,
  openSubChatIds: [],
  pinnedSubChatIds: [],
  allSubChats: [],

  setChatId: (chatId) => {
    if (!chatId) {
      set({
        chatId: null,
        activeSubChatId: null,
        openSubChatIds: [],
        pinnedSubChatIds: [],
        allSubChats: [],
      })
      return
    }

    // Load open/active/pinned IDs from localStorage
    // allSubChats will be populated from DB + placeholders in init effect
    const openSubChatIds = loadFromLS<string[]>(chatId, "open", [])
    const activeSubChatId = loadFromLS<string | null>(chatId, "active", null)
    const pinnedSubChatIds = loadFromLS<string[]>(chatId, "pinned", [])

    set({ chatId, openSubChatIds, activeSubChatId, pinnedSubChatIds, allSubChats: [] })
  },

  setActiveSubChat: (subChatId) => {
    const { chatId } = get()
    set({ activeSubChatId: subChatId })
    if (chatId) saveToLS(chatId, "active", subChatId)
  },

  setOpenSubChats: (subChatIds) => {
    const { chatId } = get()
    set({ openSubChatIds: subChatIds })
    if (chatId) saveToLS(chatId, "open", subChatIds)
  },

  addToOpenSubChats: (subChatId) => {
    const { openSubChatIds, chatId } = get()
    if (openSubChatIds.includes(subChatId)) return
    const newIds = [...openSubChatIds, subChatId]
    set({ openSubChatIds: newIds })
    if (chatId) saveToLS(chatId, "open", newIds)
  },

  removeFromOpenSubChats: (subChatId) => {
    const { openSubChatIds, activeSubChatId, chatId } = get()
    const newIds = openSubChatIds.filter((id) => id !== subChatId)

    // If closing active tab, switch to last remaining tab
    let newActive = activeSubChatId
    if (activeSubChatId === subChatId) {
      newActive = newIds[newIds.length - 1] || null
    }

    set({ openSubChatIds: newIds, activeSubChatId: newActive })
    if (chatId) {
      saveToLS(chatId, "open", newIds)
      saveToLS(chatId, "active", newActive)
    }
  },

  togglePinSubChat: (subChatId) => {
    const { pinnedSubChatIds, chatId } = get()
    const newPinnedIds = pinnedSubChatIds.includes(subChatId)
      ? pinnedSubChatIds.filter((id) => id !== subChatId)
      : [...pinnedSubChatIds, subChatId]
    
    set({ pinnedSubChatIds: newPinnedIds })
    if (chatId) saveToLS(chatId, "pinned", newPinnedIds)
  },

  setAllSubChats: (subChats) => {
    // Load colors from localStorage and merge with sub-chats
    const colors = loadAllColorsFromLS()
    const subChatsWithColors = subChats.map((sc) => ({
      ...sc,
      color: colors[sc.id] || sc.color,
    }))
    set({ allSubChats: subChatsWithColors })
  },

  addToAllSubChats: (subChat) => {
    const { allSubChats } = get()
    if (allSubChats.some((sc) => sc.id === subChat.id)) return
    set({ allSubChats: [...allSubChats, subChat] })
    // No localStorage persistence - allSubChats is rebuilt from DB + open IDs on init
  },

  updateSubChatName: (subChatId, name) => {
    const { allSubChats } = get()
    set({
      allSubChats: allSubChats.map((sc) =>
        sc.id === subChatId
          ? { ...sc, name }
          : sc,
      ),
    })
    // No localStorage modification - just update in-memory state (like Canvas)
  },

  updateSubChatMode: (subChatId, mode) => {
    const { allSubChats } = get()
    set({
      allSubChats: allSubChats.map((sc) =>
        sc.id === subChatId
          ? { ...sc, mode }
          : sc,
      ),
    })
  },

  updateSubChatColor: (subChatId, color) => {
    const { allSubChats } = get()
    set({
      allSubChats: allSubChats.map((sc) =>
        sc.id === subChatId
          ? { ...sc, color }
          : sc,
      ),
    })
    // Persist to localStorage
    saveColorToLS(subChatId, color)
  },

  updateSubChatTimestamp: (subChatId: string) => {
    const { allSubChats } = get()
    const newTimestamp = new Date().toISOString()
    
    set({
      allSubChats: allSubChats.map((sc) =>
        sc.id === subChatId
          ? { ...sc, updated_at: newTimestamp }
          : sc,
      ),
    })
  },

  reset: () => {
    set({
      chatId: null,
      activeSubChatId: null,
      openSubChatIds: [],
      pinnedSubChatIds: [],
      allSubChats: [],
    })
  },
}))
