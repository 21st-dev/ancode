# Coding Conventions

**Analysis Date:** 2025-01-17

## Naming Patterns

**Files:**
- TypeScript files: `kebab-case.ts` (e.g., `auth-store.ts`, `claude-env.ts`, `auth-manager.ts`)
- React components: `PascalCase.tsx` (e.g., `ActiveChat.tsx`, `AgentsSidebar.tsx`, `CommitInput.tsx`)
- Test files: `*.test.ts` (not currently used)
- Config files: `kebab-case.config.ts` or `*.config.js` (e.g., `electron.vite.config.ts`, `tailwind.config.js`)
- UI components: `PascalCase.tsx` in `components/ui/` (e.g., `Button.tsx`, `Dialog.tsx`)

**Functions:**
- camelCase for all functions (e.g., `createChat`, `saveAuthData`, `isEncryptionAvailable`)
- Async functions: No special prefix (e.g., `executeClaude`, `fetchRepoInfo`)
- Event handlers: `handle<EventName>` (e.g., `handleSubmit`, `handleClick`)

**Variables:**
- camelCase for variables (e.g., `userDataPath`, `filePath`, `encryptionAvailable`)
- Constants: UPPER_SNAKE_CASE (not commonly used, most constants are camelCase)
- Private members: No underscore prefix (TypeScript `private` keyword instead)

**Types:**
- Interfaces: PascalCase, no `I` prefix (e.g., `AuthUser`, `AuthData`, `ChangedFile`)
- Type aliases: PascalCase (e.g., `FileStatus`, `GitChangesStatus`)
- Enums: PascalCase for enum name, UPPER_CASE for values

## Code Style

**Formatting:**
- Tailwind CSS + class-variance-authority for component styling
- No explicit Prettier config detected
- No ESLint config detected
- 2-space indentation (TypeScript default)
- Semicolons: Required (TypeScript strict mode)

**Linting:**
- TypeScript strict mode enabled
- No explicit linting rules defined
- Type checking via `bun run ts:check`

**Import Organization:**

**Order:**
1. External packages (react, electron, drizzle-orm, etc.)
2. Internal modules (relative imports from same layer)
3. Type imports (import type)

**Grouping:**
- Blank line between top-level import groups
- Group related imports together

**Path Aliases:**
- `@/*` maps to `src/renderer/*` (configured in `tsconfig.json` and `electron.vite.config.ts`)

**Examples:**
```typescript
import { useState } from "react"
import { safeStorage } from "electron"
import { readFileSync } from "fs"
import type { FileStatus } from "../types/file-status"
```

## Error Handling

**Patterns:**
- Try-catch at service boundaries (especially file operations, external calls)
- Throw errors with descriptive messages
- Use `TRPCError` for tRPC procedure errors
- Console logging for development (electron-log for production)

**Error Types:**
- Throw on invalid input, missing dependencies, invariant violations
- Log error with context before throwing where helpful
- Include cause in error: `new Error('Failed to X', { cause: originalError })`

## Logging

**Framework:**
- electron-log 5.4.3 for structured logging
- `console.log`, `console.error` for development
- PostHog for analytics (optional)

**Patterns:**
- Log at service boundaries, not in utilities
- Log state transitions, external API calls, errors
- No console.log in committed production code (prefer electron-log)

## Comments

**When to Comment:**
- Explain why, not what (documenting business rules, algorithms, edge cases)
- Document non-obvious algorithms or workarounds
- JSDoc comments for public API functions
- Explaining Electron-specific patterns (e.g., " Falls back to plaintext only if encryption is unavailable (rare edge case)")

**JSDoc/TSDoc:**
- Required for public API functions in main process (e.g., AuthStore class methods)
- Optional for internal functions if signature is self-explanatory
- Use standard JSDoc tags (`@param`, `@returns`, `@throws`)

**TODO Comments:**
- Format: `// TODO: description` (no username, using git blame)
- Can link to issue if exists: `// TODO: Fix race condition (issue #123)`
- Currently minimal in codebase

## Function Design

**Size:**
- Keep functions focused, extract helpers when needed
- Class files can be larger (e.g., `auth-store.ts` is 203 lines)

**Parameters:**
- Destructure objects in parameter list: `function process({ id, name }: ProcessParams)`
- Use options object for 4+ parameters

**Return Values:**
- Explicit return statements
- Return early for guard clauses
- No implicit undefined returns

## Module Design

**Exports:**
- Named exports preferred over default exports
- Default exports only for React components (Radix UI pattern)
- Export public API from index.ts barrel files

**Barrel Files:**
- `index.ts` files re-export public API
- Examples: `src/renderer/lib/atoms/index.ts`, `src/renderer/lib/stores/changes-store.ts`

**Shared Code:**
- `src/shared/` for types shared between main and renderer processes
- Common UI components in `src/renderer/components/ui/`
- Feature-specific code stays in feature directories

## React-Specific Conventions

**Component Structure:**
- Functional components with hooks (no class components)
- Props interfaces defined as TypeScript types
- ForwardRef for components accepting refs (Radix UI pattern)
- Slot pattern for composables (Radix UI pattern)

**State Management:**
- Jotai atoms for ephemeral UI state (selected chat, sidebar open state)
- Zustand stores for persistent state (sub-chats, pinned tabs)
- React Query for server state caching

**Styling:**
- Tailwind CSS utility classes
- class-variance-authority for variant props (Radix UI pattern)
- cn() utility for conditional className merging

**File Organization in Features:**
- `main/` - Primary components for the feature
- `ui/` - Feature-specific UI components
- `atoms/` - Jotai atoms for feature state
- `stores/` - Zustand stores for feature state
- `commands/` - Slash command handlers
- `hooks/` - Custom React hooks

---
*Convention analysis: 2025-01-17*
*Update when patterns change*
