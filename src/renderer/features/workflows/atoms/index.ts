import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

// ============================================
// WORKFOWS SIDEBAR STATE
// ============================================

/**
 * Controls the open/closed state of the workflows sidebar section
 * Persisted to localStorage as "workflows:sidebar-open"
 */
export const workflowsSidebarOpenAtom = atomWithStorage<boolean>(
  "workflows:sidebar-open",
  true,
  undefined,
  { getOnInit: true },
)

// ============================================
// WORKFOWS TREE EXPANSION STATE
// ============================================

/**
 * Storage key for expanded tree nodes
 * Format: Set<string> where keys are:
 * - "agents" - top-level agents category
 * - "commands" - top-level commands category
 * - "skills" - top-level skills category
 * - "agent:{id}" - specific agent node
 * - "command:{id}" - specific command node
 * - "skill:{id}" - specific skill node
 * - "tools" - tools category under a node
 * - "mcpServers" - MCP servers category under a node
 */
const workflowsTreeExpandedNodesStorageAtom = atomWithStorage<Set<string>>(
  "workflows:expanded-nodes",
  new Set<string>(["agents", "commands", "skills"]), // Default: top-level categories expanded
  undefined,
  { getOnInit: true },
)

/**
 * Read-write atom for expanded nodes set
 */
export const workflowsTreeExpandedNodesAtom = atom(
  (get) => get(workflowsTreeExpandedNodesStorageAtom),
  (get, set, newSet: Set<string>) => {
    set(workflowsTreeExpandedNodesStorageAtom, newSet)
  },
)

/**
 * Toggle a single node's expanded state
 */
export const workflowsToggleNodeAtom = atom(
  null,
  (get, set, nodeKey: string) => {
    const current = get(workflowsTreeExpandedNodesStorageAtom)
    const newSet = new Set(current)
    if (newSet.has(nodeKey)) {
      newSet.delete(nodeKey)
    } else {
      newSet.add(nodeKey)
    }
    set(workflowsTreeExpandedNodesStorageAtom, newSet)
  },
)

/**
 * Expand all nodes in a category
 */
export const workflowsExpandCategoryAtom = atom(
  null,
  (get, set, nodeKeys: string[]) => {
    const current = get(workflowsTreeExpandedNodesStorageAtom)
    const newSet = new Set(current)
    for (const key of nodeKeys) {
      newSet.add(key)
    }
    set(workflowsTreeExpandedNodesStorageAtom, newSet)
  },
)

/**
 * Collapse all nodes in a category
 */
export const workflowsCollapseCategoryAtom = atom(
  null,
  (get, set, nodeKeys: string[]) => {
    const current = get(workflowsTreeExpandedNodesStorageAtom)
    const newSet = new Set(current)
    for (const key of nodeKeys) {
      newSet.delete(key)
    }
    set(workflowsTreeExpandedNodesStorageAtom, newSet)
  },
)

/**
 * Expand all nodes (helper for "Expand All" action)
 */
export const workflowsExpandAllAtom = atom(null, (_get, set, allNodeKeys: string[]) => {
  set(workflowsTreeExpandedNodesStorageAtom, new Set(allNodeKeys))
})

/**
 * Collapse all nodes (helper for "Collapse All" action)
 */
export const workflowsCollapseAllAtom = atom(null, (_get, set) => {
  set(workflowsTreeExpandedNodesStorageAtom, new Set<string>())
})

// ============================================
// WORKFOWS NODE SELECTION
// ============================================

/**
 * Type of a selectable workflow node
 */
export type WorkflowNodeType = "agent" | "command" | "skill" | "tool" | "mcpServer"

/**
 * Represents a selected workflow node for preview
 */
export interface WorkflowNode {
  type: WorkflowNodeType
  id: string
  name: string
  sourcePath: string
}

/**
 * Currently selected workflow node for preview panel
 * null = no node selected
 */
export const selectedWorkflowNodeAtom = atom<WorkflowNode | null>(null)

// ============================================
// WORKFOWS REFRESH TRIGGER
// ============================================

/**
 * Increment to trigger data refresh from workflows router
 * Components can use useEffect with this atom to refetch data
 * Starts at 0, increment with set(workflowsRefreshTriggerAtom, n => n + 1)
 */
export const workflowsRefreshTriggerAtom = atom<number>(0)

// ============================================
// WORKFLOWS PREVIEW PANEL STATE
// ============================================

/**
 * Controls the open/closed state of the workflows preview panel
 * Persisted to localStorage as "workflows:preview-open"
 */
export const workflowsPreviewOpenAtom = atomWithStorage<boolean>(
  "workflows:preview-open",
  false, // Default: closed initially
  undefined,
  { getOnInit: true },
)

/**
 * Width of the workflows preview panel in pixels
 * Persisted to localStorage as "workflows:preview-width"
 */
export const workflowsPreviewWidthAtom = atomWithStorage<number>(
  "workflows:preview-width",
  400, // Default: 400px
  undefined,
  { getOnInit: true },
)

/**
 * The source file path currently displayed in the preview panel
 * null = no file selected
 */
export const workflowContentPathAtom = atom<string | null>(null)
