---
phase: 01-discovery-layer
plan: 02
subsystem: workflows
tags: [tRPC, dependency-graph, yaml-parsing, gray-matter]

# Dependency graph
requires:
  - phase: 01-discovery-layer/01-01
    provides: workflows router with listAgents, listCommands, listSkills procedures
provides:
  - getWorkflowGraph procedure returning agents with categorized dependencies
  - Dependency extraction from agent frontmatter tools field
  - File body scanning for agent/command invocation patterns
affects: [01-discovery-layer/01-03, 02-visualization-layer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Hierarchical dependency graph structure
    - Categorized dependencies (tools, skills, mcpServers, agents, commands)
    - Regex-based file body pattern extraction

key-files:
  modified: [src/main/lib/trpc/routers/workflows.ts]

key-decisions:
  - "Hardcoded BUILTIN_TOOLS list for Claude Code tools"
  - "File body scanning with regex patterns for agent/command invocations"
  - "Dependency categorization by type (tool vs skill vs MCP vs agent)"

patterns-established:
  - "DependencyGraph interface for categorized agent dependencies"
  - "WorkflowGraph interface for complete graph output"

issues-created: []

# Metrics
duration: 8min
completed: 2026-01-18
---

# Phase 01: Discovery Layer Plan 02 Summary

**Dependency graph extraction with categorized dependencies (tools, skills, MCP servers, agents, commands) from agent frontmatter and file body patterns**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-18T10:30:00Z (approx)
- **Completed:** 2026-01-18T10:38:00Z (approx)
- **Tasks:** 2/2
- **Files modified:** 1

## Accomplishments

- **getWorkflowGraph procedure** returns complete dependency graph for all workflow items
- **Dependency extraction** from agent frontmatter `tools` field with categorization
- **File body scanning** detects agent/command invocations using regex patterns
- **MCP server detection** extracts @mcp- patterns from file content

## Task Commits

Each task was committed atomically:

1. **Task 1: Add getWorkflowGraph procedure with dependency extraction** - `251187e` (feat)

**Plan metadata:** (pending - SUMMARY/STATE commit)

## Files Created/Modified

- `src/main/lib/trpc/routers/workflows.ts` - Added getWorkflowGraph procedure with dependency extraction logic
  - New types: `DependencyGraph`, `AgentWithDependencies`, `WorkflowGraph`
  - New constant: `BUILTIN_TOOLS` (65 built-in Claude Code tools)
  - New helpers: `extractMcpServers()`, `extractAgentInvocations()`, `extractCommandInvocations()`, `buildAgentDependencies()`
  - New procedure: `getWorkflowGraph` returns agents with categorized dependencies

## Decisions Made

1. **Hardcoded BUILTIN_TOOLS list** - Maintaining a list of known Claude Code tools is more reliable than dynamic detection. Tools can be added to the list as Claude Code evolves.

2. **File body scanning with regex patterns** - Agent/command invocations often happen in the agent body (not just frontmatter). Regex patterns like "Use the {agent} agent" and "/{command}" capture these.

3. **Dependency categorization by type** - Separating tools into built-in tools, skills, MCP servers, agents, and commands enables better UI visualization in later phases.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - build succeeded, TypeScript compilation worked for new code.

## Next Phase Readiness

- getWorkflowGraph procedure ready for consumption by UI components
- Dependency graph structure supports tree visualization in Phase 2
- No known blockers for next plan

---
*Phase: 01-discovery-layer*
*Plan: 02*
*Completed: 2026-01-18*
