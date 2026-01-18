# Project State

**Last Updated:** 2025-01-17
**Current Phase:** 03-claude-settings
**Current Plan:** 03-claude-settings-03-FIX (COMPLETE)

## Completed Work

### Phase 01: Remove Auth (COMPLETE)
- Plan 01: **01-remove-auth-01** - Complete
  - All 8 tasks executed successfully
  - 4 files deleted (auth-manager.ts, auth-store.ts, login.html, claude-login-modal.tsx)
  - 11 files modified (main/index.ts, windows/main.ts, preload/index.ts, App.tsx, agents-layout.tsx, agents-sidebar.tsx, analytics.ts, debug.ts, chats.ts, claude-code.ts, package.json)
  - SUMMARY.md created at `.planning/phases/01-remove-auth/01-remove-auth-SUMMARY.md`

### Phase 03: Claude Settings
- Plan 01: **03-claude-settings-01** - Complete
  - All 6 tasks executed successfully
  - 5 files modified/created:
    - `src/main/lib/db/schema/index.ts` - Added claudeCodeSettings table
    - `src/main/lib/trpc/routers/claude-settings.ts` - Created tRPC router
    - `src/main/lib/trpc/routers/index.ts` - Registered claudeSettings router
    - `src/main/lib/trpc/routers/claude.ts` - Integrated settings for binary path and env vars
    - `src/renderer/features/agents/components/settings-tabs/agents-claude-code-tab.tsx` - Added Advanced Settings UI
  - Migration generated: `drizzle/0005_bouncy_sister_grimm.sql`
  - SUMMARY.md created at `.planning/phases/03-claude-settings/03-claude-settings-01-SUMMARY.md`

- Plan 02: **03-claude-settings-02** - Complete
  - All 6 tasks executed successfully
  - 4 files modified + 1 migration created:
    - `src/main/lib/db/schema/index.ts` - Added customConfigDir and mcpServerSettings fields
    - `src/main/lib/trpc/routers/claude-settings.ts` - Updated router for new fields, added listMcpServers
    - `src/main/lib/trpc/routers/claude.ts` - Uses custom config dir when provided
    - `src/renderer/features/agents/components/settings-tabs/agents-claude-code-tab.tsx` - Added Config Directory input and MCP Servers list
  - Migration generated: `drizzle/0006_rainy_the_watchers.sql`
  - SUMMARY.md created at `.planning/phases/03-claude-settings/03-claude-settings-02-SUMMARY.md`

- Plan 03: **03-claude-settings-03** - Complete
  - All 6 tasks executed successfully
  - 5 files modified + 1 migration created:
    - `src/main/lib/db/schema/index.ts` - Added authMode, apiKey, bedrockRegion fields
    - `src/main/lib/trpc/routers/claude-settings.ts` - Added encrypt/decrypt helpers, auth mode handling
    - `src/main/lib/trpc/routers/claude.ts` - Added AWS credential detection, auth mode routing
    - `src/renderer/features/agents/components/settings-tabs/agents-claude-code-tab.tsx` - Added credential selector, API key input, Bedrock region input
    - `drizzle/0007_fixed_speed.sql` - Migration for new auth fields
  - Migration generated: `drizzle/0007_fixed_speed.sql`
  - SUMMARY.md created at `.planning/phases/03-claude-settings/03-claude-settings-03-SUMMARY.md`

- Plan 03-FIX: **03-claude-settings-03-FIX** - Complete
  - Fixed 2 UAT issues from plan 03-03
  - 2 files modified, 1 file deleted:
    - `src/renderer/features/agents/components/settings-tabs/agents-claude-code-tab.tsx` - Fixed API key status display to check claudeSettings.apiKey instead of local state
    - `src/renderer/components/dialogs/agents-settings-dialog.tsx` - Updated import to canonical location
    - `src/renderer/components/dialogs/settings-tabs/agents-claude-code-tab.tsx` - DELETED (duplicate)
  - SUMMARY.md created at `.planning/phases/03-claude-settings/03-claude-settings-03-FIX-SUMMARY.md`

## Codebase Status

### Authentication
**Status:** Removed
- No OAuth flow
- No auth storage (auth-store removed)
- No login UI
- No protocol schemes for deep links
- App launches directly into main interface

### Analytics
**Status:** Active (no user identification)
- Tracks events without user ID association
- `initAnalytics()` and `trackAppOpened()` still work
- `identify()` function available but not used for auth

### Claude Code Integration
**Status:** Enhanced with configurable settings and multiple auth modes
- Local token storage still works (encrypted with safeStorage)
- Server integration no longer requires desktop auth token
- User ID stored as null
- **NEW:** Users can configure custom Claude binary path via Advanced Settings
- **NEW:** Users can set custom environment variables (e.g., ANTHROPIC_MODEL)
- **NEW:** Users can specify custom Claude config directory (defaults to isolated per-subchat)
- **NEW:** Users can view and enable/disable MCP servers from ~/.claude/
- **NEW:** Multiple authentication modes:
  - OAuth (browser-based flow)
  - AWS Bedrock (uses AWS credentials from env vars or ~/.aws/credentials)
  - API Key (direct Anthropic API key with encrypted storage)
- Settings persist in SQLite database (`claude_code_settings` table)
- **FIXED:** API key status now correctly displays as "Configured" when saved from onboarding
- **FIXED:** Single source of truth for settings tabs (duplicates removed)

## Next Steps

### Phase 03: Claude Settings
- Plans 01, 02, 03, and 03-FIX are complete
- All UAT issues from plan 03-03 have been resolved
- Additional plans may be added for further Claude Code configuration options

### Phase Directory
See `.planning/phases/03-claude-settings/` for phase plans.
