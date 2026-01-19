# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2025-01-18)

**Core value:** See inside your Claude Code workflows — Understand how agents and commands work by visualizing their dependency tree with full source code inspection.
**Current focus:** Phase 2 — Tree Visualization

## Current Position

Phase: 2 of 3 (Tree Visualization)
Plan: 02 of 3 (Workflows sidebar component)
Status: Plan 02-02 complete, continuing Phase 2 execution
Last activity: 2026-01-18 — Workflows sidebar section created

Progress: ██████████ 85%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 10.5 min
- Total execution time: 0.7 hours

**By Phase:**

| Phase | Plans | Complete | Avg/Plan |
|-------|-------|----------|----------|
| 01-discovery-layer | 3 | 3 | 11.5min |
| 02-tree-visualization | 3 | 2 | 9.5min |

**Recent Trend:**
- Last 3 plans: 8min, 7min, 12min
- Trend: Stable

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

1. **Reused gray-matter dependency** (2026-01-18): Already installed for skills router, consistent parsing approach for YAML frontmatter
2. **Path validation pattern** (2026-01-18): Each scanner validates filenames don't contain "..", "/", or "\\" to prevent path traversal
3. **Graceful degradation** (2026-01-18): If directory doesn't exist, return empty array rather than error
4. **Config directory resolution** (2026-01-18): Read customConfigDir from claudeCodeSettings table, fallback to ~/.claude/
5. **Hardcoded BUILTIN_TOOLS list** (2026-01-18): Maintaining 65 known Claude Code tools in constant; more reliable than dynamic detection
6. **File body scanning with regex** (2026-01-18): Agent/command invocations detected via patterns like "Use the {agent} agent" and "/{command}"
7. **Dependency categorization by type** (2026-01-18): Dependencies separated into tools, skills, MCP servers, agents, commands for UI visualization
8. **Workflows atoms with localStorage persistence** (2026-01-18): Using atomWithStorage for sidebar state, tree expansion (Set<string>), selected node, and refresh trigger
9. **Direct tRPC query in UI components** (2026-01-18): WorkflowTree uses tRPC useQuery directly instead of prop drilling for simplicity
10. **3-level tree nesting structure** (2026-01-18): Category (Agents/Commands/Skills) -> Item -> Dependency categories (Tools, Skills, MCP servers, Agents, Commands)
11. **WorkflowGraph type exports** (2026-01-18): Types exported from workflows router for shared type safety across main/renderer

### Deferred Issues

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-18
Stopped at: Plan 02-02 complete (workflows sidebar section created)
Resume file: None

## Next Steps

**Phase 2: Tree Visualization** — Plan 02-03: Source code preview panel

Next command: Execute plan 02-03 or continue with remaining Phase 2 plans
