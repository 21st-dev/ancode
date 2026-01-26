# GitHub MCP Setup Guide

## Step 1: Create GitHub Personal Access Token

1. Go to GitHub: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name it: "Cursor MCP GitHub Access"
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `read:org` (Read org and team membership)
   - ✅ `read:user` (Read user profile data)
   - ✅ `user:email` (Access user email addresses)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again!)

## Step 2: Configure in Cursor

### Option A: Via Cursor Settings (Recommended)

1. Open Cursor Settings (Cmd+,)
2. Search for "MCP" or "Model Context Protocol"
3. Find "GitHub" server configuration
4. Add/update the `GITHUB_TOKEN` environment variable
5. Paste your token
6. Restart Cursor

### Option B: Via Settings JSON

1. Open Cursor Settings JSON (Cmd+Shift+P → "Preferences: Open User Settings (JSON)")
2. Find or add MCP server configuration:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_TOKEN": "your_token_here"
      }
    }
  }
}
```

3. Replace `your_token_here` with your actual token
4. Restart Cursor

### Option C: Via Environment Variable

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export GITHUB_TOKEN="your_token_here"
```

Then restart Cursor.

## Step 3: Verify Setup

After restarting Cursor, test the GitHub MCP:

```typescript
// This should work after token is configured
await call_mcp_tool('user-github', 'search_repositories', {
  query: 'user:21st-dev',
  per_page: 5
})
```

## Security Notes

- ⚠️ Never commit tokens to git
- ✅ Use environment variables or secure storage
- ✅ Use minimal required scopes
- ✅ Rotate tokens periodically
- ✅ Revoke if compromised

## Troubleshooting

**Error: "Authentication Failed: Bad credentials"**
- Token may be incorrect or expired
- Check token has correct scopes
- Verify token is set in environment

**Error: "Token not found"**
- Ensure token is set in MCP server config
- Restart Cursor after adding token
- Check environment variables are loaded

---

**Once configured, you'll have full GitHub API access through MCP!**
