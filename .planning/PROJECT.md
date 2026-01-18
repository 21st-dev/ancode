# 21st Agents — Workflow Inspector

## What This Is

A local-first Electron desktop app for AI-powered code assistance with Claude. Users create chat sessions linked to local project folders, interact with Claude in Plan or Agent mode, and see real-time tool execution. This project adds a **Workflow Inspector** feature for visualizing and understanding Claude Code agents, commands, and their dependencies.

## Core Value

**See inside your Claude Code workflows** — Understand how agents and commands work by visualizing their dependency tree with full source code inspection.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Electron desktop app with 3-process architecture (Main, Preload, Renderer)
- ✓ tRPC-based IPC communication between processes
- ✓ SQLite + Drizzle ORM for local-first data storage
- ✓ Claude SDK integration with streaming responses
- ✓ Multiple authentication modes: OAuth, AWS Bedrock, API Key (with encrypted storage)
- ✓ Claude Code settings: custom binary path, environment variables, config directory, MCP servers
- ✓ Terminal integration via xterm + node-pty
- ✓ Git operations via simple-git wrapper
- ✓ React 19 UI with Jotai, Zustand, and React Query for state management

### Active

<!-- Current scope. Building toward these. -->

- [ ] **Workflows sidebar section** — New section at bottom of sidebar with "Agents" and "Commands" entries
- [ ] **Dependency tree viewer** — Nested tree showing execution order: skills → tools → MCP → agent/command calls
- [ ] **Full content preview** — Clicking any node shows its full source code/file content
- [ ] **Claude config integration** — Uses custom config directory from Claude Code settings
- [ ] **SDK-based discovery** — Dependencies discovered via Claude Code SDK API

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- **Editing agents/commands** — This is a viewer-only tool; editing would require full CRUD UI and validation
- **Creating new agents/commands** — Creation is out of scope for v1; users can edit files directly
- **Deleting agents/commands** — Deletion would require undo/confirmation; out of scope for viewer
- **Executing agents/commands** — Execution already exists in chat interface; this is for inspection only
- **Workflow modification** — Reordering or changing dependencies is not supported
- **Version control for workflows** — No git integration for workflow versioning
- **Multi-config comparison** — Only one config dir at a time (from settings)

## Context

**Existing Codebase:**
- 21st Agents is a mature Electron app with completed Phases 01-03 (Remove Auth, Shell Detection, Claude Settings)
- State management: Jotai (ephemeral UI state), Zustand (persistent state), React Query (server state)
- UI components: Radix UI primitives with Tailwind CSS
- Terminal: xterm.js with node-pty for pseudo-terminal spawning
- Claude Code SDK: @anthropic-ai/claude-agent-sdk 0.2.5 (early version, monitor for updates)

**Claude Code Config Structure:**
- `~/.claude/skills/` — Skill definitions with frontmatter
- `~/.claude/commands/` — Command definitions
- `~/.claude/agents/` — Agent definitions
- Custom config directory is user-configurable in Claude Code Advanced Settings

**Key Technical Considerations:**
- Claude Code SDK API may have limitations for dependency discovery; may need to parse files as fallback
- Large agent/command files (1000+ lines in claude.ts) could affect preview performance
- No test infrastructure exists; manual testing required

## Constraints

- **Claude Code SDK limitations** — Must work within @anthropic-ai/claude-agent-sdk 0.2.5 capabilities; may need file parsing fallback
- **Custom config directory** — Must use the directory specified in Claude Code settings (claude_code_settings.custom_config_dir)
- **Single config at a time** — User can switch config dirs in settings, but viewer only shows one at a time
- **Read-only operations** — Viewer must not modify any files in the Claude config directory

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SDK-first with fallback | Claude Code SDK is canonical source but may not expose all deps; file parsing ensures completeness | — Pending |
| Nested tree view | Hierarchical execution order is clearest in tree form; graphs are complex to implement for this use case | — Pending |
| Full content preview | Users want to see actual code/definitions, not just metadata; supports both debugging and discovery | — Pending |
| Viewer-only MVP | Editing significantly increases scope; inspection alone provides value | — Pending |

---
*Last updated: 2025-01-18 after initialization*
