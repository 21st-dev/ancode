#!/bin/bash

# Script to find React objects being rendered as children
# Searches for patterns that render {name, type} objects

echo "🔍 Searching for potential React child object errors..."
echo "Looking for objects with {name, type} keys being rendered..."
echo ""

cd ~/1code/src/renderer

# 1. Find direct object rendering (most common)
echo "1️⃣  Checking for {variable} patterns that might render objects:"
grep -rn ">{[a-zA-Z]*}<\|{[a-zA-Z]*}}" . --include="*.tsx" \
  | grep -v "className\|style\|props\|children\|\.map\|import\|//" \
  | grep -v "onClick\|onChange\|onSubmit\|key=" \
  | head -20
echo ""

# 2. Find MCP server rendering
echo "2️⃣  Checking MCP server rendering:"
grep -rn "server\.serverInfo\|{server" . --include="*.tsx" \
  | grep -v "server\.\|//" \
  | head -10
echo ""

# 3. Find tool/skill rendering
echo "3️⃣  Checking tool/skill object rendering:"
grep -rn "{tool}\|{skill}\|{agent}" . --include="*.tsx" \
  | grep -v "tool\.\|skill\.\|agent\.\|//" \
  | head -10
echo ""

# 4. Find file option rendering
echo "4️⃣  Checking file option rendering:"
grep -rn "{option}" . --include="*.tsx" \
  | grep -v "option\.\|//" \
  | head -10
echo ""

# 5. Find shortcut object rendering
echo "5️⃣  Checking shortcut object rendering (should use .display):"
grep -rn "getShortcut(" . --include="*.tsx" -A3 \
  | grep -B2 "Kbd\|<kbd" \
  | grep -v "getShortcutKey\|\.display"
echo ""

echo "✅ Search complete!"
echo ""
echo "Next steps:"
echo "1. Review the output above for suspicious patterns"
echo "2. Look for {variable} where variable might be an object"
echo "3. Check if any match the line mentioned in the React error"
echo ""
echo "Common fixes:"
echo "  - {object} → {object.name} or {object.someProperty}"
echo "  - {getShortcut('key')} → {getShortcutKey('key')}"
echo "  - {server.serverInfo} → {server.serverInfo?.name}"
