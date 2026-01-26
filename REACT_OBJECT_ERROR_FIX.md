# Fix: "Objects are not valid as a React child" Error

## Error Message
```
Error: Objects are not valid as a React child (found: object with keys {name, type})
```

## How to Find the Issue

### Step 1: Check Browser DevTools
1. Open the app: `cd ~/1code && bun run dev`
2. Open DevTools (Cmd+Option+I)
3. Look at the Console error - it should show a component stack trace

### Step 2: Common Causes in Your Codebase

The error mentions an object with `{name, type}` keys. Check these locations:

#### A) MCP Server Objects
File: `src/renderer/features/agents/ui/mcp-servers-indicator.tsx`
```tsx
// BAD - rendering object directly:
<div>{server.serverInfo}</div>

// GOOD - extract property:
<div>{server.serverInfo?.name}</div>
```

#### B) Shortcut/Hotkey Objects
Files with `getShortcut()` or `useShortcut()` calls:
```tsx
// BAD - getShortcut returns {hotkey, display}:
const shortcut = getShortcut("closeTab")
<Kbd>{shortcut}</Kbd>

// GOOD - extract display property:
const shortcut = getShortcut("closeTab")
<Kbd>{shortcut.display}</Kbd>

// OR use getShortcutKey which returns string:
<Kbd>{getShortcutKey("closeTab")}</Kbd>
```

#### C) File Mention Options
File: `src/renderer/features/agents/mentions/agents-file-mention.tsx`
```tsx
// BAD:
<div>{option}</div>

// GOOD:
<div>{option.label}</div>
```

### Step 3: Quick Search Commands

```bash
cd ~/1code

# Find potential issues with server objects
grep -rn "{server}" src/renderer --include="*.tsx" | grep -v "server\."

# Find potential issues with option objects
grep -rn "{option}" src/renderer --include="*.tsx" | grep -v "option\."

# Find getShortcut usage (should use .display or getShortcutKey)
grep -rn "getShortcut(" src/renderer --include="*.tsx" -A3 | grep "Kbd"
```

### Step 4: Use React Error Boundary

Add this to catch and display the error with more context:

```tsx
// src/renderer/components/error-boundary.tsx
import React from 'react'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error:', error)
    console.error('Component Stack:', errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#fee', color: '#c00' }}>
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.toString()}</pre>
          </details>
        </div>
      )
    }

    return this.props.children
  }
}
```

## Quick Fix Template

When you find the error location, apply this pattern:

```tsx
// Before:
<Component>{objectVariable}</Component>

// After - extract the string property:
<Component>{objectVariable?.someStringProperty || 'fallback'}</Component>

// OR - stringify for debugging:
<Component>{JSON.stringify(objectVariable)}</Component>
```

## Most Likely Culprits

Based on your codebase analysis:

1. **Line 102-106** in `agents-mcp-tab.tsx` - server.serverInfo rendering
2. **Any Kbd component** receiving shortcut objects instead of strings
3. **Tooltip content** in file mention popovers rendering option objects

## To Fix Right Now

Run the app with detailed logging:

```bash
cd ~/1code
NODE_ENV=development bun run dev 2>&1 | tee /tmp/app-debug.log
```

Then search the log for the component stack to find the exact file and line.
