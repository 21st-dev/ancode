# UAT Issues: Phase 03 - Claude Settings

**Tested:** 2025-01-17
**Source:** .planning/phases/03-claude-settings/03-claude-settings-01-SUMMARY.md, 03-claude-settings-02-SUMMARY.md, 03-claude-settings-03-SUMMARY.md
**Tester:** User via /gsd:verify-work

## Open Issues

### UAT-001: Claude Code tab missing from settings dialog

**Discovered:** 2025-01-17
**Phase/Plan:** 03-01, 03-02, 03-03
**Severity:** Blocker
**Feature:** Claude Code settings UI
**Description:** The Claude Code settings tab was completely missing from the settings dialog. The component existed at `src/renderer/features/agents/components/settings-tabs/agents-claude-code-tab.tsx` but was never added to the `ALL_TABS` array in the settings dialog.
**Expected:** Settings dialog should show a "Claude Code" tab with the Claude Code icon.
**Actual:** Tab was not visible in settings dialog sidebar.
**Repro:**
1. Open the app
2. Click Settings
3. Observe no "Claude Code" tab in the sidebar
**Status:** FIXED - Added tab to `src/renderer/components/dialogs/agents-settings-dialog.tsx`, copied component to correct location, fixed import paths.

### UAT-002: API key from onboarding not displaying in settings

**Discovered:** 2025-01-17
**Phase/Plan:** 03-03
**Severity:** Minor
**Feature:** API Key display in Claude Code settings
**Description:** When an API key is entered during onboarding, it is saved to the database but does not display back in the Claude Code settings page. The key field shows empty instead of showing the saved key (masked).
**Expected:** API key entered during onboarding should appear masked (••••••) in the settings page.
**Actual:** API key field shows empty, even though the key is saved and functional.
**Repro:**
1. Complete onboarding with API key auth mode
2. Open Settings → Claude Code
3. Observe API key field is empty (should show masked value)

### UAT-003: Duplicate settings tabs files (code smell)

**Discovered:** 2025-01-17
**Phase/Plan:** 03-01, 03-02, 03-03
**Severity:** Minor
**Feature:** Code organization
**Description:** Settings tabs exist in two locations:
- `src/renderer/features/agents/components/settings-tabs/`
- `src/renderer/components/dialogs/settings-tabs/`

This creates potential for divergence and maintenance burden. During UAT, the fix required copying the file to the second location.
**Expected:** Single source of truth for settings tab components.
**Actual:** Duplicated files causing confusion during debugging.

## Resolved Issues

### UAT-001: Claude Code tab missing from settings dialog
**Resolved:** 2025-01-17 - Fixed during UAT session
**Files modified:**
- `src/renderer/components/dialogs/agents-settings-dialog.tsx` - Added Claude Code tab to ALL_TABS and renderTabContent
- `src/renderer/components/dialogs/settings-tabs/agents-claude-code-tab.tsx` - Copied from features location, fixed import paths

---

*Phase: 03-claude-settings*
*Tested: 2025-01-17*
