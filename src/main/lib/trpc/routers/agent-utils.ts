import * as fs from "fs/promises"
import * as path from "path"
import * as os from "os"
import matter from "gray-matter"

// Valid model values for agents
export const VALID_AGENT_MODELS = ["sonnet", "opus", "haiku", "inherit"] as const
export type AgentModel = (typeof VALID_AGENT_MODELS)[number]

// Agent definition parsed from markdown file
export interface ParsedAgent {
  name: string
  description: string
  prompt: string
  tools?: string[]
  disallowedTools?: string[]
  model?: AgentModel
}

// Agent with source/path metadata
export interface FileAgent extends ParsedAgent {
  source: "user" | "project"
  path: string
}

/**
 * Parse agent markdown file with YAML frontmatter
 * Format:
 * ---
 * name: code-reviewer
 * description: Reviews code for quality
 * tools: Read, Glob, Grep
 * model: sonnet
 * ---
 *
 * You are a code reviewer. When invoked...
 */
export function parseAgentMd(
  content: string,
  filename: string
): Partial<ParsedAgent> {
  try {
    const { data, content: body } = matter(content)
    const result = extractAgentFields(data, body, filename)

    // gray-matter can inconsistently parse complex YAML: sometimes it throws,
    // sometimes it "succeeds" but silently drops fields (e.g. description becomes empty).
    // If the file has a description field but gray-matter returned empty, use fallback.
    if (!result.description && content.includes("description:")) {
      const fallback = parseFrontmatterFallback(content, filename)
      if (fallback && fallback.description) {
        return fallback
      }
    }

    return result
  } catch (err) {
    // gray-matter fails on complex YAML (e.g. unquoted colons in descriptions)
    // Fall back to regex-based frontmatter parsing
    const fallback = parseFrontmatterFallback(content, filename)
    if (fallback) return fallback
    console.error("[agents] Failed to parse markdown:", err)
    return {}
  }
}

/**
 * Fallback parser for when gray-matter fails on complex YAML values.
 * Extracts frontmatter fields line-by-line, treating the last field value
 * as everything from the key to the next key or end of frontmatter.
 */
function parseFrontmatterFallback(
  content: string,
  filename: string
): Partial<ParsedAgent> | null {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!fmMatch) return null

  const frontmatterBlock = fmMatch[1]
  const body = fmMatch[2]

  // Parse frontmatter line by line, handling multi-content values
  // by greedily consuming until the next known key
  const knownKeys = ["name", "description", "tools", "disallowedTools", "model", "color"]
  const fields: Record<string, string> = {}

  const lines = frontmatterBlock.split("\n")
  let currentKey = ""
  let currentValue = ""

  for (const line of lines) {
    // Check if this line starts a new key
    const keyMatch = line.match(/^(\w+):\s*(.*)$/)
    if (keyMatch && knownKeys.includes(keyMatch[1])) {
      // Save previous key-value
      if (currentKey) {
        fields[currentKey] = currentValue.trim()
      }
      currentKey = keyMatch[1]
      currentValue = keyMatch[2]
    } else if (currentKey) {
      // Continuation of previous value
      currentValue += "\n" + line
    }
  }
  // Save last key-value
  if (currentKey) {
    fields[currentKey] = currentValue.trim()
  }

  const data: Record<string, unknown> = { ...fields }
  return extractAgentFields(data, body, filename)
}

function extractAgentFields(
  data: Record<string, unknown>,
  body: string,
  filename: string
): Partial<ParsedAgent> {
  // Parse tools - can be comma-separated string or array
  let tools: string[] | undefined
  if (typeof data.tools === "string") {
    tools = data.tools
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean)
  } else if (Array.isArray(data.tools)) {
    tools = data.tools
  }

  // Parse disallowedTools
  let disallowedTools: string[] | undefined
  if (typeof data.disallowedTools === "string") {
    disallowedTools = data.disallowedTools
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean)
  } else if (Array.isArray(data.disallowedTools)) {
    disallowedTools = data.disallowedTools
  }

  // Validate model
  const model =
    data.model && VALID_AGENT_MODELS.includes(data.model as AgentModel)
      ? (data.model as AgentModel)
      : undefined

  return {
    name:
      typeof data.name === "string" ? data.name : filename.replace(".md", ""),
    description: typeof data.description === "string" ? data.description : "",
    prompt: body.trim(),
    tools,
    disallowedTools,
    model,
  }
}

/**
 * Generate markdown content for agent file
 */
export function generateAgentMd(agent: {
  name: string
  description: string
  prompt: string
  tools?: string[]
  disallowedTools?: string[]
  model?: AgentModel
}): string {
  const frontmatter: string[] = []
  frontmatter.push(`name: ${agent.name}`)
  frontmatter.push(`description: ${agent.description}`)
  if (agent.tools && agent.tools.length > 0) {
    frontmatter.push(`tools: ${agent.tools.join(", ")}`)
  }
  if (agent.disallowedTools && agent.disallowedTools.length > 0) {
    frontmatter.push(`disallowedTools: ${agent.disallowedTools.join(", ")}`)
  }
  if (agent.model && agent.model !== "inherit") {
    frontmatter.push(`model: ${agent.model}`)
  }

  return `---\n${frontmatter.join("\n")}\n---\n\n${agent.prompt}`
}

/**
 * Load agent definition from filesystem by name
 * Searches in user (~/.claude/agents/) and project (.claude/agents/) directories
 */
export async function loadAgent(
  name: string,
  cwd?: string
): Promise<ParsedAgent | null> {
  const locations = [
    path.join(os.homedir(), ".claude", "agents"),
    ...(cwd ? [path.join(cwd, ".claude", "agents")] : []),
  ]

  for (const dir of locations) {
    const agentPath = path.join(dir, `${name}.md`)
    try {
      const content = await fs.readFile(agentPath, "utf-8")
      const parsed = parseAgentMd(content, `${name}.md`)

      if (parsed.description && parsed.prompt) {
        return {
          name: parsed.name || name,
          description: parsed.description,
          prompt: parsed.prompt,
          tools: parsed.tools,
          disallowedTools: parsed.disallowedTools,
          model: parsed.model,
        }
      }
    } catch {
      continue
    }
  }

  return null
}

/**
 * Scan directory for agent .md files
 * Format: .claude/agents/agent-name.md
 */
export async function scanAgentsDirectory(
  dir: string,
  source: "user" | "project",
  basePath?: string // For project agents, the cwd to make paths relative to
): Promise<FileAgent[]> {
  const agents: FileAgent[] = []

  try {
    await fs.access(dir)
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      // Validate entry name for security (prevent path traversal)
      if (
        entry.name.includes("..") ||
        entry.name.includes("/") ||
        entry.name.includes("\\")
      ) {
        console.warn(`[agents] Skipping invalid filename: ${entry.name}`)
        continue
      }

      // Accept .md files (Claude Code native format)
      if (entry.isFile() && entry.name.endsWith(".md")) {
        const agentPath = path.join(dir, entry.name)
        try {
          const content = await fs.readFile(agentPath, "utf-8")
          const parsed = parseAgentMd(content, entry.name)

          if (parsed.description && parsed.prompt) {
            // For project agents, show relative path; for user agents, show ~/.claude/... path
            let displayPath: string
            if (source === "project" && basePath) {
              displayPath = path.relative(basePath, agentPath)
            } else {
              // For user agents, show ~/.claude/agents/... format
              const homeDir = os.homedir()
              displayPath = agentPath.startsWith(homeDir)
                ? "~" + agentPath.slice(homeDir.length)
                : agentPath
            }

            agents.push({
              name: parsed.name || entry.name.replace(".md", ""),
              description: parsed.description,
              prompt: parsed.prompt,
              tools: parsed.tools,
              disallowedTools: parsed.disallowedTools,
              model: parsed.model,
              source,
              path: displayPath,
            })
          }
        } catch (err) {
          console.error(`[agents] Failed to read agent ${entry.name}:`, err)
        }
      }
    }
  } catch (err) {
    // Directory doesn't exist or not accessible
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(`[agents] Could not scan directory ${dir}:`, err)
    }
  }

  return agents
}

// Cache for loaded agents to avoid re-reading from disk
const agentCache = new Map<string, ParsedAgent | null>()

/**
 * Clear the agent cache (for testing/debugging)
 */
export function clearAgentCache() {
  agentCache.clear()
  console.log("[agents] Cache cleared")
}

/**
 * Build agents Record for SDK Options
 * This properly registers agents with the SDK so Claude can invoke them via Task tool
 * OPTIMIZATION: Caches loaded agents to avoid re-reading from disk
 */
export async function buildAgentsOption(
  agentNames: string[],
  cwd?: string
): Promise<
  Record<
    string,
    { description: string; prompt: string; tools?: string[]; model?: AgentModel }
  >
> {
  if (agentNames.length === 0) return {}

  const agents: Record<
    string,
    { description: string; prompt: string; tools?: string[]; model?: AgentModel }
  > = {}

  for (const name of agentNames) {
    // Create cache key including cwd to handle project-specific agents
    const cacheKey = cwd ? `${name}:${cwd}` : name

    // Check cache first
    let agent = agentCache.get(cacheKey)
    if (agent === undefined) {
      // Not in cache, load from disk
      console.log(`[agents] Cache MISS for ${name} - loading from disk`)
      agent = await loadAgent(name, cwd)
      agentCache.set(cacheKey, agent)
    } else {
      console.log(`[agents] Cache HIT for ${name}`)
    }

    if (agent) {
      agents[name] = {
        description: agent.description,
        prompt: agent.prompt,
        ...(agent.tools && { tools: agent.tools }),
        ...(agent.model && { model: agent.model }),
      }
    }
  }

  return agents
}
