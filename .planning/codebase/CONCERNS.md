# Codebase Concerns

**Analysis Date:** 2025-01-17

## Tech Debt

**Large file - Claude Router:** `src/main/lib/trpc/routers/claude.ts`
- Issue: 1000+ lines in single file
- File: `src/main/lib/trpc/routers/claude.ts` (1000 lines)
- Why: Complex Claude integration with streaming, mentions parsing, skill loading
- Impact: Difficult to navigate, hard to maintain, risk of breaking changes
- Fix approach: Split into multiple focused routers or extract modules

**Auth Manager Complexity:** `src/main/auth-manager.ts` (253 lines)
- Issue: Large monolithic authentication manager
- File: `src/main/auth-manager.ts`
- Why: OAuth flow handling with multiple edge cases
- Impact: Hard to test auth flows in isolation
- Fix approach: Extract smaller functions focused on specific OAuth steps

## Known Bugs

**Missing Desktop Notifications:**
- Symptoms: Desktop notification features not implemented
- Files: `src/renderer/features/agents/hooks/use-desktop-notifications.ts:6`, `src/renderer/features/agents/hooks/use-desktop-notifications.ts:9`
- Workaround: No workaround - feature incomplete
- Root cause: TODO comments indicate unimplemented feature
- Fix approach: Implement actual desktop notification APIs

**Terminal File Opening Unimplemented:**
- Symptoms: Cannot open files in editor from terminal
- File: `src/renderer/features/terminal/terminal.tsx:156`
- Workaround: None
- Root cause: TODO comment indicates unimplemented feature
- Fix approach: Implement editor integration protocol

**Terminal Tab Management Unimplemented:**
- Symptoms: Tab title and focus not properly set
- Files: `src/renderer/features/terminal/terminal.tsx:224`, `src/renderer/features/terminal/terminal.tsx:289`
- Workaround: None
- Root cause: TODO comments indicate incomplete feature
- Fix approach: Implement proper tab state management

## Security Considerations

**Environment Variable Exposure in Terminal:**
- Risk: `process.env` exposed to terminal subprocess
- Files: `src/main/lib/terminal/env.ts:306` (sanitizes env but still exposes to shell)
- Current mitigation: SanitizeEnv function filters to allowlisted safe vars only
- Recommendations: Consider further filtering for production

**Claude API Key in Environment:**
- Risk: ANTHROPIC_API_KEY in environment could be logged or exposed
- Files: `src/main/lib/claude/env.ts:16`, `src/main/lib/claude/env.ts:200`, `src/main/lib/trpc/routers/claude.ts:241`
- Current mitigation: Not logged in production (based on grep results), only used in development
- Recommendations: Verify no logging of sensitive data

**.env Files Accessible via File Picker:**
- Risk: Users can open .env files in agent chat, potentially exposing secrets
- Files: `src/renderer/features/agents/mentions/agents-file-mention.tsx` handles .env with special icons
- Current mitigation: UI indicates .env files are config files, not code
- Recommendations: Add warning when opening .env files, or restrict access

## Performance Bottlenecks

**Not Detected:** No obvious performance issues identified in analysis

## Fragile Areas

**Claude Integration (Complex):**
- File: `src/main/lib/trpc/routers/claude.ts` (1000 lines)
- Why fragile: Complex streaming logic, multiple state branches, many integrations
- Common failures: SDK incompatibility, API key issues, streaming errors
- Safe modification: Add integration tests, document error scenarios
- Test coverage: No tests yet

**OAuth Deep Link Registration:**
- File: `src/main/index.ts:167` (protocol handler registration)
- Why fragile: Platform-specific, macOS Launch Services delays
- Common failures: First launch often fails registration, requires user to click sign-in again
- Safe modification: Document in README/CLAUDE.md, add retry logic
- Test coverage: Manual testing required

**Git PATH Handling:**
- Files: `src/main/lib/git/shell-env.ts`, `src/main/lib/terminal/env.ts`
- Why fragile: macOS GUI apps don't inherit shell PATH, requires complex shell env fetching
- Common failures: Git commands not found in PATH
- Safe modification: Existing `shell-env.ts` handles this, but complex
- Test coverage: Manual testing required

## Scaling Limits

**Not Applicable:** Desktop application, no server-side scaling concerns

## Dependencies at Risk

**@anthropic-ai/claude-agent-sdk 0.2.5:**
- Risk: Early version (0.2.5), may have breaking changes
- Impact: API compatibility issues, breaking changes could block Claude integration
- Migration plan: Monitor for updates, test upgrades thoroughly

**better-sqlite3 11.8.1:**
- Risk: Native module, requires rebuild on Node version changes
- Impact: Build failures on Node.js updates
- Migration plan: Postinstall script runs `electron-rebuild` automatically

**node-pty 1.1.0:**
- Risk: Native module, requires rebuild on Node version changes
- Impact: Terminal spawning fails if rebuild not run
- Migration plan: Included in postinstall rebuild

**trpc-electron 0.1.2:**
- Risk: Small package, may not be actively maintained
- Impact: Could block updates if deprecated
- Migration plan: Consider migrating to alternative IPC bridge

## Missing Critical Features

**Test Infrastructure:**
- Problem: No tests configured, no test framework
- Current workaround: Manual testing only
- Blocks: Confidence in refactoring, ability to ship quickly
- Implementation complexity: Medium (requires framework setup, test writing)

**Git Worktree Isolation:**
- Problem: Chats don't use git worktrees yet (all chats use same project directory)
- Current workaround: All chats access same project folder
- Blocks: Parallel agent execution in separate worktrees
- Implementation complexity: Low (worktree code exists in `src/main/lib/git/worktree.ts`)

## Test Coverage Gaps

**No Tests:**
- What's not tested: Everything (entire codebase has no tests)
- Risk: All changes are manual testing only
- Priority: High
- Difficulty: High (requires test framework setup, writing tests from scratch)

**Claude Integration:**
- What's not tested: Claude SDK integration, streaming responses, tool execution
- Risk: Breaking changes to Claude SDK could block core functionality
- Priority: High
- Difficulty: Medium (requires mocking or test credentials)

**Authentication Flow:**
- What's not tested: OAuth flow, token refresh, safeStorage encryption
- Risk: Auth failures could block all app functionality
- Priority: Medium
- Difficulty: Medium (requires OAuth test setup or mocking)

**Database Operations:**
- What's not tested: CRUD operations, migrations, auto-migration
- Risk: Data loss, migration failures
- Priority: Medium
- Difficulty: Low (can use in-memory SQLite for tests)

---
*Concerns audit: 2025-01-17*
*Update as issues are fixed or new ones discovered*
