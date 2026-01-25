import { ipcMain, BrowserWindow } from "electron";
import { gitWatcherRegistry, type GitWatchEvent } from "./git-watcher";
import { gitCache } from "../cache";

/**
 * IPC Bridge for GitWatcher.
 * Handles subscription/unsubscription from renderer and forwards file change events.
 */

// Track active subscriptions per worktree with subscribing window ID
// This ensures events are sent to the window that subscribed, not the focused window
const activeSubscriptions: Map<string, { windowId: number; unsubscribe: () => void }> = new Map();

/**
 * Register IPC handlers for git watcher.
 * Call this once during app initialization.
 */
export function registerGitWatcherIPC(): void {
	// Handle subscription requests from renderer
	ipcMain.handle(
		"git:subscribe-watcher",
		async (event, worktreePath: string) => {
			if (!worktreePath) return;

			// Already subscribed?
			if (activeSubscriptions.has(worktreePath)) {
				return;
			}

			// Get the window that made the subscription request
			const subscribingWindow = BrowserWindow.fromWebContents(event.sender);
			if (!subscribingWindow || subscribingWindow.isDestroyed()) return;

			const windowId = subscribingWindow.id;

			// Subscribe to file changes (await to ensure watcher is ready)
			const unsubscribe = await gitWatcherRegistry.subscribe(
				worktreePath,
				(watchEvent: GitWatchEvent) => {
					// Send to the subscribing window, not the focused window
					const subscription = activeSubscriptions.get(worktreePath);
					if (!subscription) return;

					const targetWindow = BrowserWindow.fromId(subscription.windowId);
					if (!targetWindow || targetWindow.isDestroyed()) return;

					// We're watching .git/index and .git/HEAD, so any event means a git operation occurred.
					// Invalidate status and parsedDiff caches - these are always affected by git operations.
					// File content cache is content-addressed and will update on next request if hash changed.
					gitCache.invalidateStatus(worktreePath);
					gitCache.invalidateParsedDiff(worktreePath);

					// Send event to renderer
					try {
						targetWindow.webContents.send("git:status-changed", {
							worktreePath: watchEvent.worktreePath,
							changes: watchEvent.changes,
						});
					} catch {
						// Window may have been destroyed between check and send
					}
				},
			);

			activeSubscriptions.set(worktreePath, { windowId, unsubscribe });
			console.log(
				`[GitWatcher] Window ${windowId} subscribed to: ${worktreePath}`,
			);
		},
	);

	// Handle unsubscription requests from renderer
	ipcMain.handle(
		"git:unsubscribe-watcher",
		async (_event, worktreePath: string) => {
			if (!worktreePath) return;

			const subscription = activeSubscriptions.get(worktreePath);
			if (subscription) {
				subscription.unsubscribe();
				activeSubscriptions.delete(worktreePath);
				console.log(
					`[GitWatcher] Window ${subscription.windowId} unsubscribed from: ${worktreePath}`,
				);
			}
		},
	);
}

/**
 * Cleanup subscriptions for a specific window.
 * Call this when a window is closed to prevent memory leaks.
 */
export function cleanupWindowSubscriptions(windowId: number): void {
	for (const [path, subscription] of activeSubscriptions) {
		if (subscription.windowId === windowId) {
			subscription.unsubscribe();
			activeSubscriptions.delete(path);
			console.log(`[GitWatcher] Cleaned up subscription for closed window ${windowId}: ${path}`);
		}
	}
}

/**
 * Cleanup all watchers.
 * Call this when the app is shutting down.
 */
export async function cleanupGitWatchers(): Promise<void> {
	// Unsubscribe all
	const subscriptions = Array.from(activeSubscriptions.values());
	for (const subscription of subscriptions) {
		subscription.unsubscribe();
	}
	activeSubscriptions.clear();

	// Dispose all watchers
	await gitWatcherRegistry.disposeAll();
	console.log("[GitWatcher] All watchers cleaned up");
}
