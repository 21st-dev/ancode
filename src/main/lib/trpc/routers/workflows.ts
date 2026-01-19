import { z } from "zod"
import { router, publicProcedure } from "../index"
import * as fs from "fs/promises"
import * as path from "path"
import * as os from "os"
import matter from "gray-matter"
import { getDatabase, claudeCodeSettings } from "../../db"
import { eq } from "drizzle-orm"

// ============ TYPES ============

interface AgentMetadata {
  id: string
  name: string
  description: string
  tools: string[]
  model: string
  sourcePath: string
}

interface CommandMetadata {
  id: string
  name: string
  description: string
  sourcePath: string
}

interface SkillMetadata {
  id: string
  name: string
  description: string
  sourcePath: string
}

interface DependencyGraph {
  tools: string[]
  skills: string[]
  mcpServers: string[]
  agents: string[]
  commands: string[]
}

interface AgentWithDependencies extends AgentMetadata {
  dependencies: DependencyGraph
}

interface WorkflowGraph {
  agents: AgentWithDependencies[]
  commands: CommandMetadata[]
  skills: SkillMetadata[]
}

// Built-in Claude Code tools
const BUILTIN_TOOLS = [
  "Read",
  "Write",
  "Edit",
  "Grep",
  "Glob",
  "Bash",
  "WebSearch",
  "mcp__4_5v_mcp__analyze_image",
  "mcp__chrome-devtools__click",
  "mcp__chrome-devtools__close_page",
  "mcp__chrome-devtools__drag",
  "mcp__chrome-devtools__emulate",
  "mcp__chrome-devtools__evaluate_script",
  "mcp__chrome-devtools__fill",
  "mcp__chrome-devtools__fill_form",
  "mcp__chrome-devtools__get_console_message",
  "mcp__chrome-devtools__get_network_request",
  "mcp__chrome-devtools__handle_dialog",
  "mcp__chrome-devtools__hover",
  "mcp__chrome-devtools__list_console_messages",
  "mcp__chrome-devtools__list_network_requests",
  "mcp__chrome-devtools__list_pages",
  "mcp__chrome-devtools__navigate_page",
  "mcp__chrome-devtools__new_page",
  "mcp__chrome-devtools__performance_analyze_insight",
  "mcp__chrome-devtools__performance_start_trace",
  "mcp__chrome-devtools__performance_stop_trace",
  "mcp__chrome-devtools__press_key",
  "mcp__chrome-devtools__resize_page",
  "mcp__chrome-devtools__select_page",
  "mcp__chrome-devtools__take_screenshot",
  "mcp__chrome-devtools__take_snapshot",
  "mcp__chrome-devtools__upload_file",
  "mcp__chrome-devtools__wait_for",
  "mcp__godot__add_node",
  "mcp__godot__create_scene",
  "mcp__godot__export_mesh_library",
  "mcp__godot__get_debug_output",
  "mcp__godot__get_godot_version",
  "mcp__godot__get_project_info",
  "mcp__godot__get_uid",
  "mcp__godot__launch_editor",
  "mcp__godot__list_projects",
  "mcp__godot__load_sprite",
  "mcp__godot__run_project",
  "mcp__godot__save_scene",
  "mcp__godot__stop_project",
  "mcp__godot__update_project_uids",
  "mcp__plugin_context7_context7__query-docs",
  "mcp__plugin_context7_context7__resolve-library-id",
  "mcp__web-search-prime__webSearchPrime",
  "mcp__web_reader__webReader",
  "mcp__zai-mcp-server__analyze_data_visualization",
  "mcp__zai-mcp-server__analyze_image",
  "mcp__zai-mcp-server__analyze_video",
  "mcp__zai-mcp-server__diagnose_error_screenshot",
  "mcp__zai-mcp-server__extract_text_from_screenshot",
  "mcp__zai-mcp-server__ui_diff_check",
  "mcp__zai-mcp-server__ui_to_artifact",
  "mcp__zai-mcp-server__understand_technical_diagram",
  "mcp__zread__get_repo_structure",
  "mcp__zread__read_file",
  "mcp__zread__search_doc",
  "Skill",
  "NotebookEdit",
  "TodoWrite",
]

// ============ HELPER FUNCTIONS ============

/**
 * Get the Claude config directory, preferring customConfigDir from settings
 */
async function getClaudeConfigDir(): Promise<string> {
  const db = getDatabase()
  const settings = db
    .select()
    .from(claudeCodeSettings)
    .where(eq(claudeCodeSettings.id, "default"))
    .get()

  return settings?.customConfigDir || path.join(os.homedir(), ".claude")
}

/**
 * Validate a path is within the allowed base directory (prevent path traversal)
 */
function validatePath(baseDir: string, targetPath: string): boolean {
  const resolvedBase = path.resolve(baseDir)
  const resolvedTarget = path.resolve(targetPath)
  return resolvedTarget.startsWith(resolvedBase)
}

/**
 * Parse agent .md file frontmatter
 */
function parseAgentMd(content: string, filename: string): AgentMetadata {
  try {
    const { data } = matter(content)
    return {
      id: filename.replace(/\.md$/, ""),
      name: typeof data.name === "string" ? data.name : filename.replace(/\.md$/, ""),
      description: typeof data.description === "string" ? data.description : "",
      tools: Array.isArray(data.tools) ? (data.tools as string[]) : [],
      model: typeof data.model === "string" ? data.model : "",
      sourcePath: "", // Will be set by caller
    }
  } catch (err) {
    console.error("[workflows] Failed to parse agent frontmatter:", err)
    return {
      id: filename.replace(/\.md$/, ""),
      name: filename.replace(/\.md$/, ""),
      description: "",
      tools: [],
      model: "",
      sourcePath: "",
    }
  }
}

/**
 * Parse command .md file frontmatter
 */
function parseCommandMd(content: string, filename: string): CommandMetadata {
  try {
    const { data } = matter(content)
    return {
      id: filename.replace(/\.md$/, ""),
      name: filename.replace(/\.md$/, ""),
      description: typeof data.description === "string" ? data.description : "",
      sourcePath: "", // Will be set by caller
    }
  } catch (err) {
    console.error("[workflows] Failed to parse command frontmatter:", err)
    return {
      id: filename.replace(/\.md$/, ""),
      name: filename.replace(/\.md$/, ""),
      description: "",
      sourcePath: "",
    }
  }
}

/**
 * Parse SKILL.md frontmatter
 */
function parseSkillMd(content: string, dirName: string): SkillMetadata {
  try {
    const { data } = matter(content)
    return {
      id: dirName,
      name: typeof data.name === "string" ? data.name : dirName,
      description: typeof data.description === "string" ? data.description : "",
      sourcePath: "", // Will be set by caller
    }
  } catch (err) {
    console.error("[workflows] Failed to parse skill frontmatter:", err)
    return {
      id: dirName,
      name: dirName,
      description: "",
      sourcePath: "",
    }
  }
}

/**
 * Scan agents directory for .md files
 */
async function scanAgentsDir(baseDir: string): Promise<AgentMetadata[]> {
  const agentsDir = path.join(baseDir, "agents")
  const agents: AgentMetadata[] = []

  try {
    await fs.access(agentsDir)
  } catch {
    // Directory doesn't exist, return empty
    return agents
  }

  const entries = await fs.readdir(agentsDir, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue

    // Security: validate filename doesn't contain path traversal
    if (entry.name.includes("..") || entry.name.includes("/") || entry.name.includes("\\")) {
      console.warn(`[workflows] Skipping invalid agent filename: ${entry.name}`)
      continue
    }

    const filePath = path.join(agentsDir, entry.name)
    const content = await fs.readFile(filePath, "utf-8")
    const parsed = parseAgentMd(content, entry.name)
    parsed.sourcePath = filePath
    agents.push(parsed)
  }

  return agents
}

/**
 * Scan commands directory for .md files
 */
async function scanCommandsDir(baseDir: string): Promise<CommandMetadata[]> {
  const commandsDir = path.join(baseDir, "commands")
  const commands: CommandMetadata[] = []

  try {
    await fs.access(commandsDir)
  } catch {
    // Directory doesn't exist, return empty
    return commands
  }

  const entries = await fs.readdir(commandsDir, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue

    // Security: validate filename doesn't contain path traversal
    if (entry.name.includes("..") || entry.name.includes("/") || entry.name.includes("\\")) {
      console.warn(`[workflows] Skipping invalid command filename: ${entry.name}`)
      continue
    }

    const filePath = path.join(commandsDir, entry.name)
    const content = await fs.readFile(filePath, "utf-8")
    const parsed = parseCommandMd(content, entry.name)
    parsed.sourcePath = filePath
    commands.push(parsed)
  }

  return commands
}

/**
 * Scan skills directory for SKILL.md files
 */
async function scanSkillsDir(baseDir: string): Promise<SkillMetadata[]> {
  const skillsDir = path.join(baseDir, "skills")
  const skills: SkillMetadata[] = []

  try {
    await fs.access(skillsDir)
  } catch {
    // Directory doesn't exist, return empty
    return skills
  }

  const entries = await fs.readdir(skillsDir, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    // Security: validate directory name doesn't contain path traversal
    if (entry.name.includes("..") || entry.name.includes("/") || entry.name.includes("\\")) {
      console.warn(`[workflows] Skipping invalid skill directory name: ${entry.name}`)
      continue
    }

    const skillMdPath = path.join(skillsDir, entry.name, "SKILL.md")

    try {
      await fs.access(skillMdPath)
      const content = await fs.readFile(skillMdPath, "utf-8")
      const parsed = parseSkillMd(content, entry.name)
      parsed.sourcePath = skillMdPath
      skills.push(parsed)
    } catch {
      // SKILL.md doesn't exist, skip
    }
  }

  return skills
}

/**
 * Extract MCP server names from content
 * Matches patterns like @mcp- or server references
 */
function extractMcpServers(content: string): string[] {
  const mcpPattern = /@mcp[_-]?([a-zA-Z0-9_-]+)/g
  const servers = new Set<string>()
  let match

  while ((match = mcpPattern.exec(content)) !== null) {
    servers.add(match[1])
  }

  return Array.from(servers)
}

/**
 * Extract agent invocations from file body content
 * Scans for patterns like "Use the {agent-name} agent" or Skill tool calls
 */
function extractAgentInvocations(
  content: string,
  allAgentIds: string[]
): string[] {
  const invokedAgents = new Set<string>()

  // Pattern 1: "Use the {agent-name} agent" or "Use {agent-name} agent"
  const useAgentPattern = /use\s+(?:the\s+)?([a-z][a-z0-9-]*)\s+agent/gi
  let match
  while ((match = useAgentPattern.exec(content)) !== null) {
    const agentId = match[1].toLowerCase()
    if (allAgentIds.includes(agentId)) {
      invokedAgents.add(agentId)
    }
  }

  // Pattern 2: Skill tool invocations with skill: "agent-name"
  const skillInvokePattern = /skill:\s*["']([a-z][a-z0-9-]*)["']/gi
  while ((match = skillInvokePattern.exec(content)) !== null) {
    const agentId = match[1].toLowerCase()
    if (allAgentIds.includes(agentId)) {
      invokedAgents.add(agentId)
    }
  }

  return Array.from(invokedAgents)
}

/**
 * Extract command invocations from file body content
 * Scans for patterns like "/command-name" or command references
 */
function extractCommandInvocations(
  content: string,
  allCommandIds: string[]
): string[] {
  const invokedCommands = new Set<string>()

  // Pattern: "/command-name" references
  const commandPattern = /\/([a-z][a-z0-9-]*)/gi
  let match
  while ((match = commandPattern.exec(content)) !== null) {
    const commandId = match[1].toLowerCase()
    if (allCommandIds.includes(commandId)) {
      invokedCommands.add(commandId)
    }
  }

  return Array.from(invokedCommands)
}

/**
 * Build dependency graph for an agent
 * Analyzes tools array and file body for dependencies
 */
async function buildAgentDependencies(
  agent: AgentMetadata,
  allSkillIds: string[],
  allAgentIds: string[],
  allCommandIds: string[]
): Promise<DependencyGraph> {
  const deps: DependencyGraph = {
    tools: [],
    skills: [],
    mcpServers: [],
    agents: [],
    commands: [],
  }

  // Read full file content for body scanning
  let fullContent = ""
  try {
    fullContent = await fs.readFile(agent.sourcePath, "utf-8")
  } catch {
    console.warn(`[workflows] Could not read agent file: ${agent.sourcePath}`)
  }

  // Parse tools from frontmatter
  for (const tool of agent.tools) {
    const toolLower = tool.toLowerCase()

    // Check if it's a built-in tool
    if (BUILTIN_TOOLS.includes(tool) || BUILTIN_TOOLS.includes(toolLower)) {
      deps.tools.push(tool)
      continue
    }

    // Check if it's a skill reference
    if (allSkillIds.includes(toolLower) || allSkillIds.includes(tool)) {
      deps.skills.push(tool)
      continue
    }

    // Check if it's an MCP tool (starts with mcp__)
    if (toolLower.startsWith("mcp__")) {
      const parts = tool.split("__")
      if (parts.length >= 2) {
        deps.mcpServers.push(parts[1])
      }
      deps.tools.push(tool)
      continue
    }

    // Default: treat as tool
    deps.tools.push(tool)
  }

  // Extract MCP servers from file body
  const bodyMcpServers = extractMcpServers(fullContent)
  for (const server of bodyMcpServers) {
    if (!deps.mcpServers.includes(server)) {
      deps.mcpServers.push(server)
    }
  }

  // Extract agent invocations from file body
  const invokedAgents = extractAgentInvocations(fullContent, allAgentIds)
  deps.agents = invokedAgents

  // Extract command invocations from file body
  const invokedCommands = extractCommandInvocations(fullContent, allCommandIds)
  deps.commands = invokedCommands

  return deps
}

// ============ ROUTER ============

export const workflowsRouter = router({
  /**
   * List all agents from the Claude config directory
   * Scans ~/.claude/agents/ (or customConfigDir/agents/) for .md files
   */
  listAgents: publicProcedure.query(async () => {
    const baseDir = await getClaudeConfigDir()
    return await scanAgentsDir(baseDir)
  }),

  /**
   * List all commands from the Claude config directory
   * Scans ~/.claude/commands/ (or customConfigDir/commands/) for .md files
   */
  listCommands: publicProcedure.query(async () => {
    const baseDir = await getClaudeConfigDir()
    return await scanCommandsDir(baseDir)
  }),

  /**
   * List all skills from the Claude config directory
   * Scans ~/.claude/skills/[dirname]/SKILL.md (or customConfigDir/skills/)
   */
  listSkills: publicProcedure.query(async () => {
    const baseDir = await getClaudeConfigDir()
    return await scanSkillsDir(baseDir)
  }),

  /**
   * Get the complete workflow dependency graph
   * Returns agents, commands, skills with agent dependencies categorized
   */
  getWorkflowGraph: publicProcedure.query<WorkflowGraph>(async () => {
    const baseDir = await getClaudeConfigDir()

    // Scan all workflow items
    const agents = await scanAgentsDir(baseDir)
    const commands = await scanCommandsDir(baseDir)
    const skills = await scanSkillsDir(baseDir)

    // Build ID sets for cross-referencing
    const allAgentIds = agents.map((a) => a.id)
    const allCommandIds = commands.map((c) => c.id)
    const allSkillIds = skills.map((s) => s.id)

    // Build dependency graph for each agent
    const agentsWithDeps: AgentWithDependencies[] = []

    for (const agent of agents) {
      const dependencies = await buildAgentDependencies(
        agent,
        allSkillIds,
        allAgentIds,
        allCommandIds
      )

      agentsWithDeps.push({
        ...agent,
        dependencies,
      })
    }

    return {
      agents: agentsWithDeps,
      commands,
      skills,
    }
  }),

  /**
   * Read the content of a workflow file
   * Validates the path is within the Claude config directory to prevent path traversal
   */
  readFileContent: publicProcedure
    .input(z.object({ path: z.string() }))
    .query(async ({ input }) => {
      // Get the base Claude config directory
      const baseDir = await getClaudeConfigDir()

      // Security: resolve both paths and ensure target is within base
      const resolvedBase = path.resolve(baseDir)
      const resolvedTarget = path.resolve(input.path)

      // Path traversal check
      if (!resolvedTarget.startsWith(resolvedBase)) {
        throw new Error("Access denied: path is outside Claude config directory")
      }

      // Check if path is a file (not a directory)
      try {
        const stats = await fs.stat(resolvedTarget)
        if (!stats.isFile()) {
          throw new Error("Path is not a file")
        }
      } catch (err) {
        throw new Error(`File not found: ${input.path}`)
      }

      // Read and return file content
      return await fs.readFile(resolvedTarget, "utf-8")
    }),
})

// ============ TYPE EXPORTS ============

export type {
  AgentMetadata,
  CommandMetadata,
  SkillMetadata,
  DependencyGraph,
  AgentWithDependencies,
  WorkflowGraph,
}
