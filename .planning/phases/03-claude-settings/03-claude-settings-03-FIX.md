---
phase: 03-claude-settings
plan: 03-03-FIX
type: fix
wave: 1
depends_on: []
files_modified:
  - src/renderer/features/onboarding/anthropic-onboarding-page.tsx
  - src/renderer/components/dialogs/settings-tabs/agents-claude-code-tab.tsx
  - src/renderer/components/dialogs/agents-settings-dialog.tsx
  - src/renderer/features/agents/components/settings-tabs/agents-claude-code-tab.tsx
autonomous: true
---

<objective>
Fix 2 UAT issues from plan 03-03.

Source: 03-claude-settings-03-ISSUES.md
Priority: 0 critical, 0 major, 2 minor
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

**Issues being fixed:**
@.planning/phases/03-claude-settings/03-claude-settings-03-ISSUES.md

**Original plan for reference:**
@.planning/phases/03-claude-settings/03-claude-settings-03-SUMMARY.md
</context>

<tasks>
<task type="auto">
  <name>Fix UAT-002: API key from onboarding not displaying in settings</name>
  <files>src/renderer/components/dialogs/settings-tabs/agents-claude-code-tab.tsx, src/renderer/components/dialogs/settings-tabs/agents-preferences-tab.tsx</files>
  <action>
Investigate why API key entered during onboarding doesn't display in the Claude Code settings page.

Root cause analysis:
1. Check how onboarding saves the API key - look at `anthropic-onboarding-page.tsx`
2. Check how the Claude Code settings tab reads the API key - look at `getSettings` query and `apiKey` state
3. Identify the mismatch (different table, field name, or query logic)

The issue is likely one of:
- Onboarding saves to a different table (e.g., `claude_code_credentials` instead of `claude_code_settings`)
- Field name mismatch (onboarding uses different key name)
- Settings query doesn't include the API key field

Fix the data flow so:
- Onboarding saves API key to the correct location that settings page reads from
- OR: Settings page reads from the location where onboarding saves
- Display the key masked (show •••••• for existing keys, not the actual value)

Expected behavior: When user enters API key during onboarding, the Claude Code settings page should show "API Key Configured" with a masked display.
</action>
  <verify>
1. Enter API key in onboarding
2. Complete onboarding
3. Open Settings → Claude Code
4. Observe "API Key Configured" status (not empty field)
5. Verify key still works (can use Claude)
</verify>
  <done>
API key from onboarding displays as "Configured" in settings page, key remains functional.
</done>
</task>

<task type="auto">
  <name>Fix UAT-003: Consolidate duplicate settings tabs files</name>
  <files>src/renderer/components/dialogs/agents-settings-dialog.tsx, src/renderer/components/dialogs/settings-tabs/agents-claude-code-tab.tsx</files>
  <action>
Address the code smell of duplicate settings tabs files.

Current situation:
- `src/renderer/features/agents/components/settings-tabs/` - Original location
- `src/renderer/components/dialogs/settings-tabs/` - Where the dialog actually imports from

This duplication creates maintenance burden. Fix by:
1. Delete the copy at `src/renderer/components/dialogs/settings-tabs/agents-claude-code-tab.tsx`
2. Update the import in `agents-settings-dialog.tsx` to import from the original location:
   - Change from: `import { AgentsClaudeCodeTab } from "./settings-tabs/agents-claude-code-tab"`
   - Change to: `import { AgentsClaudeCodeTab } from "../../../features/agents/components/settings-tabs/agents-claude-code-tab"`
3. Verify build succeeds

This establishes a single source of truth for settings tabs. The original location (`features/agents/components/settings-tabs/`) becomes the canonical source.
</action>
  <verify>
1. `bun run build` succeeds without errors
2. No duplicate file exists at dialogs/settings-tabs/agents-claude-code-tab.tsx
3. Settings dialog still loads Claude Code tab correctly
</verify>
  <done>
Single source of truth established, no duplicate files, Claude Code tab still accessible.
</done>
</task>
</tasks>

<verification>
Before declaring plan complete:
- [x] UAT-001 already resolved (tab added during UAT)
- [ ] API key from onboarding displays in settings (UAT-002)
- [ ] Duplicate settings tab file removed (UAT-003)
- [ ] Build succeeds
- [ ] All Claude Code settings functionality still works
</verification>

<success_criteria>
- API key entered during onboarding shows as configured in settings
- Single source of truth for settings tabs (no duplicates)
- All existing functionality preserved
</success_criteria>

<output>
After completion, create `.planning/phases/03-claude-settings/03-claude-settings-03-FIX-SUMMARY.md`
</output>
