/**
 * Analytics stubs - All telemetry removed
 * These are no-op functions to maintain API compatibility
 */

// No-op functions - no data is collected or sent
export async function initAnalytics() {}
export function capture(_eventName: string, _properties?: Record<string, any>) {}
export function identify(_userId: string, _traits?: Record<string, any>) {}
export function getCurrentUserId(): string | null { return null }
export function reset() {}
export function shutdown() {}

// Event helpers - all no-ops
export function trackMessageSent(_data: { workspaceId: string; messageLength: number; mode: "plan" | "agent" }) {}
