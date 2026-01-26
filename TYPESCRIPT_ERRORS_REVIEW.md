# TypeScript Errors Review

**Date:** January 26, 2026  
**Total Errors:** 139 TypeScript errors  
**Status:** 🔴 Needs Fixing

## Error Categories

### 1. Missing Module Imports (10 errors)
**File:** `src/main/lib/credential-manager.ts`

These appear to be legacy imports from removed/refactored modules:

- `./types.ts` - Missing credential types
- `../credentials/types.ts` - Missing credentials module
- `../credentials/index.ts` - Missing credentials module
- `../auth/oauth.ts` - Missing OAuth module
- `../auth/google-oauth.ts` - Missing Google OAuth
- `../auth/slack-oauth.ts` - Missing Slack OAuth
- `../auth/microsoft-oauth.ts` - Missing Microsoft OAuth
- `../utils/debug.ts` - Missing debug utilities
- `./storage.ts` - Missing storage module

**Action:** Review `credential-manager.ts` and either remove unused imports or restore missing modules.

---

### 2. Projects Query Type Mismatch (50+ errors)
**Issue:** Projects query returns paginated response `{ items: [], total: number, hasMore: boolean }` but code expects array `Project[]`

**Affected Files:**
- `src/renderer/App.tsx` (2 errors)
- `src/renderer/components/dialogs/agents-settings-dialog.tsx` (3 errors)
- `src/renderer/components/dialogs/settings-tabs/agents-worktrees-tab.tsx` (4 errors)
- `src/renderer/features/agents/components/project-selector.tsx` (12 errors)
- `src/renderer/features/agents/main/new-chat-form.tsx` (3 errors)
- `src/renderer/features/agents/ui/agents-content.tsx` (2 errors)
- `src/renderer/features/agents/ui/archive-popover.tsx` (2 errors)
- `src/renderer/features/kanban/kanban-view.tsx` (3 errors)
- `src/renderer/features/layout/agents-layout.tsx` (1 error)
- `src/renderer/features/onboarding/select-repo-page.tsx` (6 errors)
- `src/renderer/features/sidebar/agents-sidebar.tsx` (1 error)

**Error Pattern:**
```typescript
// Code expects:
projects.some(p => ...)
projects.map(p => ...)
projects.length
projects[0]
projects.find(p => ...)

// But receives:
{ items: Project[], total: number, hasMore: boolean }
```

**Fix:** Update all usages to handle paginated response:
```typescript
const projectItems = Array.isArray(projects) ? projects : projects.items
```

---

### 3. Missing Atom Exports (8 errors)

**Missing from `src/renderer/features/agents/atoms/index.ts`:**
- `chatSourceModeAtom` (used in 2 files)
- `planSidebarOpenAtomFamily` (used in agent-plan-file-tool.tsx)
- `currentPlanPathAtomFamily` (used in agent-plan-file-tool.tsx)
- `subChatModeAtomFamily` (used in agent-plan-file-tool.tsx)
- `pendingBuildPlanSubChatIdAtom` (used in agent-plan-file-tool.tsx)
- `AgentMode` type (used in 3 files)
- `showNewChatFormAtom` (used in kanban-view.tsx)

**Missing from `src/renderer/features/terminal/atoms.ts`:**
- `terminalSidebarOpenAtomFamily` (used in terminal-section.tsx)

**Action:** Export these atoms/types or remove/update code that uses them.

---

### 4. Missing tRPC Router Methods (15 errors)

**Missing from projects router:**
- `locateAndAddProject` (open-locally-dialog.tsx)
- `pickCloneDestination` (open-locally-dialog.tsx)

**Missing from files router:**
- `readFile` (used in 3 files: agent-plan-sidebar.tsx, plan-section.tsx, plan-widget.tsx)

**Missing from chats router:**
- `exportChat` (export-chat.ts)

**Missing from external router:**
- `sandboxImport` (used in 2 files: open-locally-dialog.tsx, use-auto-import.ts)
- `writePastedText` (use-pasted-text-files.ts)

**Missing from voice router:**
- `voice` (voice-input-button.tsx)

**Action:** Either implement these router methods or remove code that calls them.

---

### 5. Missing DesktopApi Methods (12 errors)

**Missing from `src/preload/index.d.ts`:**

**Streaming methods:**
- `streamFetch` (remote-chat-transport.ts - 2 errors)
- `onStreamChunk` (remote-chat-transport.ts)
- `onStreamDone` (remote-chat-transport.ts)
- `onStreamError` (remote-chat-transport.ts)

**Other methods:**
- `signedFetch` (remote-api.ts - 4 errors, remote-trpc.ts - 2 errors)
- `trackMetric` (web-vitals.ts - 2 errors)
- `newWindow` (kanban-card.tsx)

**Action:** Add these methods to DesktopApi interface or remove code that uses them.

---

### 6. Missing Database Exports (2 errors)

**File:** `src/main/lib/trpc/routers/anthropic-accounts.ts`

Missing from `src/main/lib/db/index.ts`:
- `anthropicAccounts` table
- `anthropicSettings` table

**Note:** Migration `0009_clever_talkback.sql` drops these tables, so this router may need to be removed or updated.

---

### 7. Missing Function Exports (3 errors)

**File:** `src/main/lib/trpc/routers/voice.ts`
- `getAuthManager` doesn't exist, should use `AuthManager` class

**File:** `src/main/windows/window-manager.ts`
- `cleanupWindowSubscriptions` missing from `ipc-bridge.ts`

---

### 8. Missing Icon Exports (3 errors)

**File:** `src/renderer/features/details-sidebar/sections/info-section.tsx`

Missing from `src/renderer/components/ui/icons.tsx`:
- `GitBranchFilledIcon`
- `FolderFilledIcon`
- `GitPullRequestFilledIcon`

---

### 9. Missing Hook Exports (4 errors)

**File:** `src/renderer/lib/hotkeys/index.ts`

Missing export:
- `useResolvedHotkeyDisplay` (used in 4 files)

**Note:** This was removed in a previous refactor. Need to restore or update usages.

---

### 10. Missing Type Definitions (5 errors)

**File:** `src/renderer/features/agents/main/active-chat.tsx`

Missing types:
- `PlaybackSpeed` type
- `PLAYBACK_SPEEDS` constant

**File:** `src/renderer/features/details-sidebar/sections/todo-widget.tsx`
- `CheckIcon` not imported

**File:** `src/renderer/lib/remote-trpc.ts`
- Cannot find module `../../../../web/server/api/root` (web app dependency)

---

### 11. Type Mismatches (10 errors)

**Settings Tab Type:**
- `agents-project-worktree-tab.tsx`: `"account"` not assignable to `SettingsTab`

**User Type:**
- `agents-layout.tsx`: User type mismatch (missing `imageUrl`, `username` fields)

**Terminal Props:**
- `terminal-widget.tsx`: TerminalTabsProps mismatch

**Chat Type:**
- `agents-content.tsx`: Chat array type mismatch
- `agents-sidebar.tsx`: `chat.name` possibly null, type mismatches

---

### 12. Implicit Any Types (17 errors)

Multiple files have parameters with implicit `any` type:
- `credential-manager.ts` (2 errors)
- `vscode-theme-scanner.ts` (1 error)
- Various renderer components (14 errors)

**Fix:** Add explicit type annotations.

---

## Priority Fix Order

### 🔴 Critical (Blocks Functionality)
1. **Projects Query Type Mismatch** (50+ errors) - Most widespread issue
2. **Missing tRPC Router Methods** (15 errors) - Breaks features
3. **Missing DesktopApi Methods** (12 errors) - Breaks IPC communication

### 🟡 High (Breaks Type Safety)
4. **Missing Atom Exports** (8 errors) - State management issues
5. **Missing Module Imports** (10 errors) - Legacy code cleanup
6. **Type Mismatches** (10 errors) - Type safety issues

### 🟢 Medium (Code Quality)
7. **Implicit Any Types** (17 errors) - Type safety improvements
8. **Missing Icon/Hook Exports** (7 errors) - Missing UI elements
9. **Missing Type Definitions** (5 errors) - Type completeness

---

## Recommended Fix Strategy

1. **Start with Projects Query** - Create a helper function to normalize projects response
   - **Root Cause:** `projects.list` returns `Project[]` OR `{ items: Project[], total: number, hasMore: boolean }` based on pagination params
   - **Solution:** Create `normalizeProjectsResponse()` helper or update query to always return consistent type
   - **Files Affected:** 12 files using `projects.list`

2. **Review Missing Modules** - Determine if they should exist or be removed
   - `credential-manager.ts` has 10 missing imports - likely legacy code

3. **Add Missing Exports** - Export required atoms, types, and functions
   - Check `atoms/index.ts` for missing exports
   - Check `icons.tsx` for missing icon exports
   - Check `hotkeys/index.ts` for missing hook exports

4. **Implement Missing Methods** - Add tRPC router methods and DesktopApi methods
   - Review if methods are needed or code should be removed
   - Add to router definitions or DesktopApi interface

5. **Fix Type Annotations** - Add explicit types to eliminate implicit any

---

## Files Requiring Immediate Attention

1. `src/renderer/features/agents/components/project-selector.tsx` (12 errors)
2. `src/main/lib/credential-manager.ts` (10 errors)
3. `src/renderer/features/agents/lib/remote-chat-transport.ts` (5 errors)
4. `src/renderer/lib/remote-api.ts` (4 errors)
5. `src/renderer/features/agents/components/open-locally-dialog.tsx` (7 errors)

---

**Next Steps:**
1. Review this document
2. Prioritize fixes based on impact
3. Create fix plan for each category
4. Implement fixes systematically
