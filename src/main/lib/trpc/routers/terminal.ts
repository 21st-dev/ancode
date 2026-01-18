import fs from "node:fs/promises"
import path from "node:path"
import { z } from "zod"
import { router, publicProcedure } from "../index"
import { observable } from "@trpc/server/observable"
import { terminalManager } from "../../terminal/manager"
import type { TerminalEvent } from "../../terminal/types"
import { TRPCError } from "@trpc/server"
import { app } from "electron"

export const terminalRouter = router({
	/**
	 * Create or attach to an existing terminal session.
	 * Returns serializedState for recovery if reattaching.
	 */
	createOrAttach: publicProcedure
		.input(
			z.object({
				paneId: z.string().min(1),
				tabId: z.string().optional(),
				workspaceId: z.string().optional(),
				cols: z.number().int().positive().optional(),
				rows: z.number().int().positive().optional(),
				cwd: z.string().optional(),
				initialCommands: z.array(z.string()).optional(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const result = await terminalManager.createOrAttach(input)
				return {
					paneId: input.paneId,
					isNew: result.isNew,
					serializedState: result.serializedState,
				}
			} catch (err) {
				console.error("[TerminalRouter] createOrAttach error:", err)
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						err instanceof Error ? err.message : "Failed to create terminal",
				})
			}
		}),

	write: publicProcedure
		.input(
			z.object({
				paneId: z.string().min(1),
				data: z.string(),
			}),
		)
		.mutation(({ input }) => {
			terminalManager.write(input)
		}),

	resize: publicProcedure
		.input(
			z.object({
				paneId: z.string().min(1),
				cols: z.number().int().positive(),
				rows: z.number().int().positive(),
			}),
		)
		.mutation(({ input }) => {
			terminalManager.resize(input)
		}),

	/**
	 * Send a signal to the terminal process.
	 */
	signal: publicProcedure
		.input(
			z.object({
				paneId: z.string().min(1),
				signal: z.string().optional(),
			}),
		)
		.mutation(({ input }) => {
			terminalManager.signal(input)
		}),

	/**
	 * Kill terminal session - actually terminate it.
	 */
	kill: publicProcedure
		.input(
			z.object({
				paneId: z.string().min(1),
			}),
		)
		.mutation(async ({ input }) => {
			await terminalManager.kill(input)
		}),

	/**
	 * Detach from terminal - keep session alive.
	 * Called on component unmount. Stores serialized state for recovery.
	 */
	detach: publicProcedure
		.input(
			z.object({
				paneId: z.string().min(1),
				serializedState: z.string().optional(),
			}),
		)
		.mutation(({ input }) => {
			terminalManager.detach(input)
		}),

	/**
	 * Clear scrollback buffer for terminal (used by Cmd+K / clear command)
	 */
	clearScrollback: publicProcedure
		.input(z.object({ paneId: z.string().min(1) }))
		.mutation(({ input }) => {
			terminalManager.clearScrollback(input)
		}),

	getSession: publicProcedure
		.input(z.string().min(1))
		.query(({ input: paneId }) => {
			return terminalManager.getSession(paneId)
		}),

	/**
	 * Get workspace cwd for terminal initialization
	 */
	getWorkspaceCwd: publicProcedure.input(z.string()).query(({ input }) => {
		// For now, just return null - the workspace path comes from the chat/project
		// In the future this could look up the workspace's root directory
		return null
	}),

	/**
	 * List directory contents for navigation
	 */
	listDirectory: publicProcedure
		.input(z.object({ dirPath: z.string() }))
		.query(async ({ input }) => {
			const { dirPath } = input

			try {
				const entries = await fs.readdir(dirPath, { withFileTypes: true })

				const items = entries
					.filter((entry) => !entry.name.startsWith("."))
					.map((entry) => ({
						name: entry.name,
						path: path.join(dirPath, entry.name),
						isDirectory: entry.isDirectory(),
					}))
					.sort((a, b) => {
						// Directories first, then alphabetical
						if (a.isDirectory && !b.isDirectory) return -1
						if (!a.isDirectory && b.isDirectory) return 1
						return a.name.localeCompare(b.name)
					})

				// Get parent directory
				const parentPath = path.dirname(dirPath)
				const hasParent = parentPath !== dirPath

				return {
					currentPath: dirPath,
					parentPath: hasParent ? parentPath : null,
					items,
				}
			} catch {
				return {
					currentPath: dirPath,
					parentPath: null,
					items: [],
					error: "Unable to read directory",
				}
			}
		}),

	stream: publicProcedure
		.input(z.string().min(1))
		.subscription(({ input: paneId }) => {
			return observable<TerminalEvent>((emit) => {
				const onData = (data: string) => {
					emit.next({ type: "data", data })
				}

				const onExit = (exitCode: number, signal?: number) => {
					emit.next({ type: "exit", exitCode, signal })
					emit.complete()
				}

				terminalManager.on(`data:${paneId}`, onData)
				terminalManager.on(`exit:${paneId}`, onExit)

				return () => {
					terminalManager.off(`data:${paneId}`, onData)
					terminalManager.off(`exit:${paneId}`, onExit)
				}
			})
		}),

	/**
	 * Create a terminal session that runs Claude Code CLI with resume
	 */
	createClaudeCodeSession: publicProcedure
		.input(
			z.object({
				paneId: z.string(),
				subChatId: z.string(),
				sessionId: z.string(),
				cwd: z.string(),
				workspaceId: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const fs = await import("fs/promises")
			const os = await import("os")

			// Get the isolated config directory for this subChat
			const configDir = path.join(
				app.getPath("userData"),
				"claude-sessions",
				input.subChatId,
			)

			// Ensure config directory exists
			await fs.mkdir(configDir, { recursive: true })

			// Symlink config.json from ~/.claude/ so CLI auth works
			const homeClaudeDir = path.join(os.homedir(), ".claude")
			const configSource = path.join(homeClaudeDir, "config.json")
			const configTarget = path.join(configDir, "config.json")

			try {
				const configSourceExists = await fs
					.stat(configSource)
					.then(() => true)
					.catch(() => false)
				const configTargetExists = await fs
					.lstat(configTarget)
					.then(() => true)
					.catch(() => false)

				if (configSourceExists && !configTargetExists) {
					await fs.symlink(configSource, configTarget, "file")
					console.log(`[TERMINAL] Symlinked config: ${configTarget} -> ${configSource}`)
				}
			} catch (symlinkErr) {
				console.warn("[TERMINAL] Failed to symlink config.json:", symlinkErr)
			}

			// Create command with environment variable set inline
			// This sets CLAUDE_CONFIG_DIR and runs claude --resume in one command
			const command = `CLAUDE_CONFIG_DIR="${configDir}" claude --resume ${input.sessionId}`

			// Create the terminal session with the command as initialCommands
			const result = await terminalManager.createOrAttach({
				paneId: input.paneId,
				workspaceId: input.workspaceId,
				cwd: input.cwd,
				cols: 80,
				rows: 24,
				initialCommands: [command],
			})

			console.log(
				`[TERMINAL] Created Claude Code session: paneId=${input.paneId}, sessionId=${input.sessionId}`,
			)

			return {
				paneId: input.paneId,
				sessionId: input.sessionId,
				isNew: result.isNew,
			}
		}),
})
