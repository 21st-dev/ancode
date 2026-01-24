import { z } from "zod"
import { router, publicProcedure } from "../index"
import * as fs from "fs/promises"
import * as path from "path"
import * as os from "os"
import { eq } from "drizzle-orm"
import {
  parseAgentMd,
  generateAgentMd,
  scanAgentsDirectory,
  VALID_AGENT_MODELS,
  type FileAgent,
  type AgentModel,
} from "./agent-utils"
import { buildClaudeEnv, getBundledClaudeBinaryPath } from "../../claude"
import { getDatabase, claudeCodeCredentials } from "../../db"
import { app, safeStorage } from "electron"

// Dynamic import for ESM module - cached to avoid re-importing
let cachedClaudeQuery: typeof import("@anthropic-ai/claude-agent-sdk").query | null = null
const getClaudeQuery = async () => {
  if (cachedClaudeQuery) {
    return cachedClaudeQuery
  }
  const sdk = await import("@anthropic-ai/claude-agent-sdk")
  cachedClaudeQuery = sdk.query
  return cachedClaudeQuery
}

/**
 * Get Claude Code OAuth token from local SQLite (same as claude.ts)
 */
function getClaudeCodeToken(): string | null {
  try {
    const db = getDatabase()
    const cred = db
      .select()
      .from(claudeCodeCredentials)
      .where(eq(claudeCodeCredentials.id, "default"))
      .get()

    if (!cred?.oauthToken) {
      return null
    }

    if (!safeStorage.isEncryptionAvailable()) {
      return Buffer.from(cred.oauthToken, "base64").toString("utf-8")
    }
    const buffer = Buffer.from(cred.oauthToken, "base64")
    return safeStorage.decryptString(buffer)
  } catch (error) {
    console.error("[agents] Error getting Claude Code token:", error)
    return null
  }
}

// Shared procedure for listing agents
const listAgentsProcedure = publicProcedure
  .input(
    z
      .object({
        cwd: z.string().optional(),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    const userAgentsDir = path.join(os.homedir(), ".claude", "agents")
    const userAgentsPromise = scanAgentsDirectory(userAgentsDir, "user")

    let projectAgentsPromise = Promise.resolve<FileAgent[]>([])
    if (input?.cwd) {
      const projectAgentsDir = path.join(input.cwd, ".claude", "agents")
      projectAgentsPromise = scanAgentsDirectory(projectAgentsDir, "project")
    }

    const [userAgents, projectAgents] = await Promise.all([
      userAgentsPromise,
      projectAgentsPromise,
    ])

    return [...projectAgents, ...userAgents]
  })

export const agentsRouter = router({
  /**
   * List all agents from filesystem
   * - User agents: ~/.claude/agents/
   * - Project agents: .claude/agents/ (relative to cwd)
   */
  list: listAgentsProcedure,

  /**
   * Alias for list - used by @ mention
   */
  listEnabled: listAgentsProcedure,

  /**
   * Get single agent by name
   */
  get: publicProcedure
    .input(z.object({ name: z.string(), cwd: z.string().optional() }))
    .query(async ({ input }) => {
      const locations = [
        {
          dir: path.join(os.homedir(), ".claude", "agents"),
          source: "user" as const,
        },
        ...(input.cwd
          ? [
              {
                dir: path.join(input.cwd, ".claude", "agents"),
                source: "project" as const,
              },
            ]
          : []),
      ]

      for (const { dir, source } of locations) {
        const agentPath = path.join(dir, `${input.name}.md`)
        try {
          const content = await fs.readFile(agentPath, "utf-8")
          const parsed = parseAgentMd(content, `${input.name}.md`)
          return {
            ...parsed,
            source,
            path: agentPath,
          }
        } catch {
          continue
        }
      }
      return null
    }),

  /**
   * Create a new agent
   */
  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string(),
        prompt: z.string(),
        tools: z.array(z.string()).optional(),
        disallowedTools: z.array(z.string()).optional(),
        model: z.enum(VALID_AGENT_MODELS).optional(),
        source: z.enum(["user", "project"]),
        cwd: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Validate name (kebab-case, no special chars)
      const safeName = input.name.toLowerCase().replace(/[^a-z0-9-]/g, "-")
      if (!safeName || safeName.includes("..")) {
        throw new Error("Invalid agent name")
      }

      // Determine target directory
      let targetDir: string
      if (input.source === "project") {
        if (!input.cwd) {
          throw new Error("Project path (cwd) required for project agents")
        }
        targetDir = path.join(input.cwd, ".claude", "agents")
      } else {
        targetDir = path.join(os.homedir(), ".claude", "agents")
      }

      // Ensure directory exists
      await fs.mkdir(targetDir, { recursive: true })

      const agentPath = path.join(targetDir, `${safeName}.md`)

      // Check if already exists
      try {
        await fs.access(agentPath)
        throw new Error(`Agent "${safeName}" already exists`)
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          throw err
        }
      }

      // Generate and write file
      const content = generateAgentMd({
        name: safeName,
        description: input.description,
        prompt: input.prompt,
        tools: input.tools,
        disallowedTools: input.disallowedTools,
        model: input.model,
      })

      await fs.writeFile(agentPath, content, "utf-8")

      return {
        name: safeName,
        path: agentPath,
        source: input.source,
      }
    }),

  /**
   * Update an existing agent
   */
  update: publicProcedure
    .input(
      z.object({
        originalName: z.string(),
        name: z.string(),
        description: z.string(),
        prompt: z.string(),
        tools: z.array(z.string()).optional(),
        disallowedTools: z.array(z.string()).optional(),
        model: z.enum(VALID_AGENT_MODELS).optional(),
        source: z.enum(["user", "project"]),
        cwd: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Validate names
      const safeOriginalName = input.originalName.toLowerCase().replace(/[^a-z0-9-]/g, "-")
      const safeName = input.name.toLowerCase().replace(/[^a-z0-9-]/g, "-")
      if (!safeOriginalName || !safeName || safeName.includes("..")) {
        throw new Error("Invalid agent name")
      }

      // Determine target directory
      let targetDir: string
      if (input.source === "project") {
        if (!input.cwd) {
          throw new Error("Project path (cwd) required for project agents")
        }
        targetDir = path.join(input.cwd, ".claude", "agents")
      } else {
        targetDir = path.join(os.homedir(), ".claude", "agents")
      }

      const originalPath = path.join(targetDir, `${safeOriginalName}.md`)
      const newPath = path.join(targetDir, `${safeName}.md`)

      // Check original exists
      try {
        await fs.access(originalPath)
      } catch {
        throw new Error(`Agent "${safeOriginalName}" not found`)
      }

      // If renaming, check new name doesn't exist
      if (safeOriginalName !== safeName) {
        try {
          await fs.access(newPath)
          throw new Error(`Agent "${safeName}" already exists`)
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
            throw err
          }
        }
      }

      // Generate and write file
      const content = generateAgentMd({
        name: safeName,
        description: input.description,
        prompt: input.prompt,
        tools: input.tools,
        disallowedTools: input.disallowedTools,
        model: input.model,
      })

      // Delete old file if renaming
      if (safeOriginalName !== safeName) {
        await fs.unlink(originalPath)
      }

      await fs.writeFile(newPath, content, "utf-8")

      return {
        name: safeName,
        path: newPath,
        source: input.source,
      }
    }),

  /**
   * Delete an agent
   */
  delete: publicProcedure
    .input(
      z.object({
        name: z.string(),
        source: z.enum(["user", "project"]),
        cwd: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const safeName = input.name.toLowerCase().replace(/[^a-z0-9-]/g, "-")
      if (!safeName || safeName.includes("..")) {
        throw new Error("Invalid agent name")
      }

      let targetDir: string
      if (input.source === "project") {
        if (!input.cwd) {
          throw new Error("Project path (cwd) required for project agents")
        }
        targetDir = path.join(input.cwd, ".claude", "agents")
      } else {
        targetDir = path.join(os.homedir(), ".claude", "agents")
      }

      const agentPath = path.join(targetDir, `${safeName}.md`)

      await fs.unlink(agentPath)

      return { deleted: true }
    }),

  /**
   * Generate an agent using Claude based on user's description
   * This creates the system prompt, tools, etc. from a natural language description
   * Uses the existing Claude Agent SDK to spawn a quick session
   */
  generate: publicProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string(), // User's natural language description of what the agent should do
        source: z.enum(["user", "project"]),
        model: z.enum(VALID_AGENT_MODELS).optional(),
        cwd: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Validate name (kebab-case, no special chars)
      const safeName = input.name.toLowerCase().replace(/[^a-z0-9-]/g, "-")
      if (!safeName || safeName.includes("..")) {
        throw new Error("Invalid agent name")
      }

      // Determine target directory
      let targetDir: string
      if (input.source === "project") {
        if (!input.cwd) {
          throw new Error("Project path (cwd) required for project agents")
        }
        targetDir = path.join(input.cwd, ".claude", "agents")
      } else {
        targetDir = path.join(os.homedir(), ".claude", "agents")
      }

      // Ensure directory exists
      await fs.mkdir(targetDir, { recursive: true })

      const agentPath = path.join(targetDir, `${safeName}.md`)

      // Check if already exists
      try {
        await fs.access(agentPath)
        throw new Error(`Agent "${safeName}" already exists`)
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          throw err
        }
      }

      // Get the Claude SDK query function
      const claudeQuery = await getClaudeQuery()

      const agentGenerationPrompt = `You are an expert at creating custom Claude Code agents. Generate a well-structured agent definition based on the user's description.

Claude Code agents are specialized sub-agents that Claude can invoke via the Task tool. They have their own system prompt, tools, and model settings.

Available tools that agents can use:
- Read: Read files from the filesystem
- Write: Write/create files
- Edit: Edit existing files with search/replace
- Glob: Find files by pattern
- Grep: Search file contents
- Bash: Execute shell commands
- WebFetch: Fetch content from URLs
- WebSearch: Search the web
- Task: Spawn sub-agents
- TodoWrite: Manage todo lists
- AskUserQuestion: Ask user for clarification
- NotebookEdit: Edit Jupyter notebooks

Output a JSON object with these fields:
- description: A concise one-line description of what the agent does (used for Claude to decide when to invoke it)
- prompt: The full system prompt for the agent. This should be detailed, well-structured, and give the agent clear instructions on how to behave and accomplish its task. Use markdown formatting.
- tools: (optional) Array of tool names the agent should have access to. If not specified, inherits all tools. Only include if you want to RESTRICT the agent to specific tools.
- disallowedTools: (optional) Array of tool names the agent should NOT have access to.

Guidelines for the system prompt:
1. Be specific about the agent's role and responsibilities
2. Include examples of how the agent should behave
3. Specify any constraints or best practices
4. Use second person ("You are...", "You should...")
5. Keep it focused - don't try to do too much

Create an agent named "${safeName}" based on this description:

${input.description}

Output ONLY valid JSON, no markdown code blocks or explanations.`

      // Use the SDK to generate the agent definition
      const isolatedConfigDir = path.join(
        app.getPath("userData"),
        "claude-sessions",
        "agent-generation"
      )
      await fs.mkdir(isolatedConfigDir, { recursive: true })

      // Get OAuth token from DB (same as main chat flow)
      const authToken = getClaudeCodeToken()
      if (!authToken) {
        throw new Error("Not authenticated. Please sign in to Claude first.")
      }

      const claudeEnv = buildClaudeEnv()
      // Pass OAuth token via the correct env var (same as claude.ts line 823)
      claudeEnv.CLAUDE_CODE_OAUTH_TOKEN = authToken
      const claudeBinaryPath = getBundledClaudeBinaryPath()

      let responseText = ""
      let lastError: Error | null = null

      try {
        const stream = claudeQuery({
          prompt: agentGenerationPrompt,
          options: {
            cwd: input.cwd || os.homedir(),
            env: {
              ...claudeEnv,
              CLAUDE_CONFIG_DIR: isolatedConfigDir,
            },
            permissionMode: "bypassPermissions" as const,
            allowDangerouslySkipPermissions: true,
            pathToClaudeCodeExecutable: claudeBinaryPath,
            maxTurns: 1,
            model: "claude-sonnet-4-20250514",
          },
        })

        // Collect the text response from the stream
        for await (const msg of stream) {
          const msgAny = msg as any

          // Check for errors
          if (msgAny.type === "error" || msgAny.error) {
            lastError = new Error(msgAny.error || msgAny.message || "Unknown SDK error")
            break
          }

          // Extract text from assistant messages
          if (msgAny.type === "assistant" && msgAny.message?.content) {
            for (const block of msgAny.message.content) {
              if (block.type === "text" && block.text) {
                responseText += block.text
              }
            }
          }
        }
      } catch (streamError) {
        console.error("[agents] SDK stream error:", streamError)
        throw new Error(`Failed to generate agent: ${streamError instanceof Error ? streamError.message : String(streamError)}`)
      }

      if (lastError) {
        console.error("[agents] SDK error:", lastError)
        throw new Error(`Failed to generate agent: ${lastError.message}`)
      }

      if (!responseText.trim()) {
        throw new Error("Failed to generate agent: no response from Claude")
      }

      // Parse the JSON response
      let generatedAgent: {
        description: string
        prompt: string
        tools?: string[]
        disallowedTools?: string[]
      }

      try {
        // Try to extract JSON from the response (handle potential markdown code blocks)
        let jsonText = responseText.trim()
        if (jsonText.startsWith("```json")) {
          jsonText = jsonText.slice(7)
        } else if (jsonText.startsWith("```")) {
          jsonText = jsonText.slice(3)
        }
        if (jsonText.endsWith("```")) {
          jsonText = jsonText.slice(0, -3)
        }
        jsonText = jsonText.trim()

        generatedAgent = JSON.parse(jsonText)
      } catch (parseError) {
        console.error("[agents] Failed to parse Claude response:", responseText)
        throw new Error("Failed to parse agent definition from Claude")
      }

      // Validate required fields
      if (!generatedAgent.description || !generatedAgent.prompt) {
        throw new Error("Generated agent is missing required fields (description, prompt)")
      }

      // Generate and write the markdown file
      const content = generateAgentMd({
        name: safeName,
        description: generatedAgent.description,
        prompt: generatedAgent.prompt,
        tools: generatedAgent.tools,
        disallowedTools: generatedAgent.disallowedTools,
        model: input.model,
      })

      await fs.writeFile(agentPath, content, "utf-8")

      return {
        name: safeName,
        path: agentPath,
        source: input.source,
        description: generatedAgent.description,
        prompt: generatedAgent.prompt,
        tools: generatedAgent.tools,
        disallowedTools: generatedAgent.disallowedTools,
      }
    }),
})
