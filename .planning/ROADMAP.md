# Roadmap: 21st Agents — Workflow Inspector

## Overview

Build a Workflow Inspector feature for the 21st Agents desktop app that lets users visualize and understand Claude Code agents, commands, and their dependencies. The journey starts with discovering agents/commands from the Claude config directory, then visualizing their dependency tree in a sidebar, and finally showing full source content on click.

## Domain Expertise

None

## Phases

- [x] **Phase 1: Discovery Layer** — SDK/file parsing to find agents, commands, skills
- [x] **Phase 2: Tree Visualization** — Sidebar entries + nested dependency tree UI
- [x] **Phase 3: Content Preview** — Full source code/file content on node click
- [x] **Phase 4: Flox Dev Environment** — Update dev env management to use Flox similar to ../avatar
- [ ] **Phase 5: AWS Bedrock Authentication** — AWS SSO profile selection for Bedrock API access

## Phase Details

### Phase 1: Discovery Layer ✅
**Goal**: Establish data pipeline for discovering and parsing Claude Code agents, commands, and their dependencies
**Depends on**: Nothing (first phase)
**Research**: Likely (Claude Code SDK API for dependency discovery is unknown; may need file parsing fallback)
**Research topics**: @anthropic-ai/claude-agent-sdk 0.2.5 capabilities for dependency graph extraction, Claude config directory structure, YAML frontmatter parsing for skills/commands
**Plans**: 2 (consolidated from 3 items during planning for quick depth)

Plans:
- [x] 01-01: Claude config directory integration + Agent and command discovery
- [x] 01-02: Dependency extraction (skills → tools → MCP → calls)

### Phase 2: Tree Visualization ✅
**Goal**: Build sidebar UI with Agents/Commands entries and nested tree view of dependencies
**Depends on**: Phase 1
**Research**: Unlikely (standard React tree components; project has UI patterns established)
**Plans**: 2 (consolidated from 3 during planning for quick depth)

Plans:
- [x] 02-01: Workflows state management (atoms for tree state, expand/collapse, selection)
- [x] 02-02: Dependency tree component with nested rendering and sidebar integration

### Phase 3: Content Preview ✅
**Goal**: Show full source code/file content when clicking any node in the tree
**Depends on**: Phase 2
**Research**: Unlikely (code preview is well-trodden UI pattern)
**Plans**: 1 (consolidated feature implementation)

Plans:
- [x] 03-01: Content preview pane with syntax highlighting (includes file type detection)

### Phase 4: Flox Dev Environment ✅
**Goal**: Establish reproducible development environment using Flox to manage system-level dependencies (bun, electron, typescript-language-server) while keeping JavaScript packages in package.json
**Depends on**: Phase 3
**Research**: Complete (Flox tooling, avatar reference patterns, manifest structure)
**Plans**: 1 plan

Plans:
- [x] 04-01: Flox environment with devyard inheritance + electron

**Details:**
- Initialize Flox environment with manifest.toml declaring bun, electron, typescript-language-server
- Configure ELECTRON_SKIP_BINARY_DOWNLOAD to prevent duplicate electron binary
- Update CLAUDE.md and README.md with Flox workflow instructions
- Verify existing dev commands work within activated environment
- Follow avatar reference pattern for system vs application dependency separation

**Key deliverables:**
- `.flox/env/manifest.toml` with system tool declarations
- `.flox/env/manifest.lock` for reproducible builds
- Updated documentation explaining Flox activation workflow

### Phase 5: AWS Bedrock Authentication
**Goal**: Update Bedrock authentication to use AWS SSO profile selection with user email and portal URL configuration
**Depends on**: Phase 4
**Research**: Complete (AWS SSO authentication flow, profile selection UX patterns)
**Plans**: 5 plans in 4 waves

Plans:
- [ ] 05-01-PLAN.md — AWS SSO Foundation & Client (database migration, AWS SDK packages, SSO client)
- [ ] 05-02-PLAN.md — tRPC Backend (startDeviceAuth, pollDeviceAuth, listAccounts, saveProfile procedures)
- [ ] 05-03-PLAN.md — Onboarding UI (AWS SSO authentication flow in onboarding page)
- [ ] 05-04-PLAN.md — Settings UI (AWS SSO configuration and profile management in settings)
- [ ] 05-05-PLAN.md — Claude Integration (buildClaudeEnv for AWS credentials, end-to-end verification)

**Details:**
- Add AWS SSO fields to claudeCodeSettings table (portal URL, region, account ID, role name)
- Implement OAuth2 device authorization flow using AWS SDK v3
- Cache SSO tokens to ~/.aws/sso/cache/ (AWS CLI compatible)
- List accounts and roles via IAM Identity Center API
- Add AWS SSO configuration UI to onboarding and settings
- Inject AWS credentials into Claude SDK environment for Bedrock API access

**Key deliverables:**
- Database migration with AWS SSO fields
- AWS SSO client module (device flow, account listing, token caching)
- tRPC router for AWS SSO operations
- Onboarding flow with AWS SSO option
- Settings page with AWS SSO management
- Claude SDK integration with Bedrock credentials

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Discovery Layer | 2/2 | Complete | 2025-01-18 |
| 2. Tree Visualization | 2/2 | Complete | 2025-01-18 |
| 3. Content Preview | 1/1 | Complete | 2026-01-18 |
| 4. Flox Dev Environment | 1/1 | Complete | 2026-01-19 |
| 5. AWS Bedrock Authentication | 0/5 | Planned | - |
