/**
 * Shared types and utilities for todo components
 * Used by both AgentTodoTool and TodoWidget to avoid duplication
 */

export interface TodoItem {
  content: string
  status: "pending" | "in_progress" | "completed"
  activeForm?: string
}

export type TodoStatus = TodoItem["status"]

/**
 * Get status verb for compact display
 */
export function getTodoStatusVerb(status: TodoStatus, content: string): string {
  switch (status) {
    case "in_progress":
      return `Started: ${content}`
    case "completed":
      return `Finished: ${content}`
    case "pending":
      return `Created: ${content}`
    default:
      return content
  }
}
