/**
 * Analytics stubs - All telemetry removed
 * These are no-op functions to maintain API compatibility
 */

// No-op functions - no data is collected or sent
export function setOptOut(_optedOut: boolean) {}
export function initAnalytics() {}
export function capture(_eventName: string, _properties?: Record<string, any>) {}
export function identify(_userId: string, _traits?: Record<string, any>) {}
export function getCurrentUserId(): string | null { return null }
export function reset() {}
export async function shutdown() {}

// Event helpers - all no-ops
export function trackAppOpened() {}
export function trackAuthCompleted(_userId: string, _email?: string) {}
export function trackProjectOpened(_project: { id: string; hasGitRemote: boolean }) {}
export function trackWorkspaceCreated(_workspace: { id: string; projectId: string; useWorktree: boolean }) {}
export function trackWorkspaceArchived(_workspaceId: string) {}
export function trackWorkspaceDeleted(_workspaceId: string) {}
export function trackMessageSent(_data: { workspaceId: string; messageLength: number; mode: "plan" | "agent" }) {}
export function trackPRCreated(_data: { workspaceId: string; prNumber: number }) {}
