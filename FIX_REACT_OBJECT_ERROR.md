# Fix for React Object Error - {name, type}

## The Problem
VSCodeFullTheme objects have the structure:
```typescript
{
  id: string,
  name: string,      // ← Part of the error
  type: "light" | "dark",  // ← Part of the error
  colors: Record<string, string>,
  tokenColors?: any[]
}
```

## Quick Fix - Add to Kbd Component

The most likely culprit is the Kbd component. Let's add defensive rendering:

**File:** `src/renderer/components/ui/kbd.tsx`

**Change line 48** from:
```tsx
{renderShortcut(children)}
```

To:
```tsx
{typeof children === 'object' && children !== null && !Array.isArray(children) && !React.isValidElement(children)
  ? JSON.stringify(children)
  : renderShortcut(children)}
```

This will show us what object is being rendered!

## Or - Wrap SelectValue

If the issue is in Select components, the value prop might be an object.

Check `agents-appearance-tab.tsx` and ensure all Select values are strings (theme IDs), not theme objects.

## Test the Fix

```bash
cd ~/1code
# Stop the current app
pkill -f "electron.*1code"

# Restart with logging
bun run dev 2>&1 | tee /tmp/1code-debug.log
```

Then check the UI - if you see a stringified object like `{"name":"Dark+","type":"dark"}`, you've found it!

## Permanent Fix

Once you see which component is rendering the object:
1. Find where that component gets its data
2. Change from passing the whole object to passing just the needed property
3. Example: `<Component>{theme}</Component>` → `<Component>{theme?.name}</Component>`
