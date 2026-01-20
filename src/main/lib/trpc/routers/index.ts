// #NP - Main tRPC router composition
import { router } from "../index"
import { projectsRouter } from "./projects"
import { chatsRouter } from "./chats"
import { claudeRouter } from "./claude"
import { claudeCodeRouter } from "./claude-code"
import { terminalRouter } from "./terminal"
import { externalRouter } from "./external"
import { filesRouter } from "./files"
import { debugRouter } from "./debug"
import { skillsRouter } from "./skills"
import { agentsRouter } from "./agents"
import { providersRouter } from "./providers"
import { routingRouter } from "./routing"
import { credentialsRouter } from "./credentials"
import { modelsRouter } from "./models"
import { switchingRouter } from "./switching"
import { integrationsRouter } from "./integrations"
import { ccsRouter } from "./ccs"
import { ccrRouter } from "./ccr"
import { createGitRouter } from "../../git"
import { BrowserWindow } from "electron"

/**
 * Create the main app router
 * Uses getter pattern to avoid stale window references
 */
export function createAppRouter(getWindow: () => BrowserWindow | null) {
  return router({
    projects: projectsRouter,
    chats: chatsRouter,
    claude: claudeRouter,
    claudeCode: claudeCodeRouter,
    terminal: terminalRouter,
    external: externalRouter,
    files: filesRouter,
    debug: debugRouter,
    skills: skillsRouter,
    agents: agentsRouter,
    providers: providersRouter,
    routing: routingRouter,
    // New multi-provider infrastructure
    credentials: credentialsRouter,
    models: modelsRouter,
    switching: switchingRouter,
    // External tool integrations
    integrations: integrationsRouter,
    // CCS (Claude Code Switch) multi-provider management
    ccs: ccsRouter,
    // CCR (Claude Code Router) provider routing
    ccr: ccrRouter,
    // Git operations - named "changes" to match Superset API
    changes: createGitRouter(),
  })
}

/**
 * Export the router type for client usage
 */
export type AppRouter = ReturnType<typeof createAppRouter>
