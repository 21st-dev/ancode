# CCS Integration Journal

## Session: 2026-01-20

### Objective
Integrate CCS (Claude Code Switch) as the AI provider management system for 1code, replacing/enhancing the current provider settings with CCS's comprehensive multi-provider capabilities.

---

## CCS Analysis Summary

### What CCS Provides
- **Multi-provider support**: OpenRouter, GLM, GLMT, Kimi, DeepSeek, Qwen, Minimax, Azure Foundry
- **OAuth providers** (via CLIProxy): Gemini, Codex, Antigravity, Kiro, GitHub Copilot
- **Web dashboard**: React 19 + Radix UI + Tailwind
- **REST API**: Full CRUD for profiles, variants, accounts
- **Real-time**: WebSocket support for auth status, quota updates
- **Config**: YAML unified config at `~/.ccs/config.yaml`

### Key Files Identified
| File | Purpose |
|------|---------|
| `src/web-server/index.ts` | Express server setup (106 lines) |
| `src/api/services/provider-presets.ts` | 8 provider presets with configs |
| `ui/src/lib/api-client.ts` | Full REST API client (527 lines) |
| `ui/src/pages/api.tsx` | Provider management UI (339 lines) |
| `ui/src/components/profile-editor.tsx` | Profile editing component |

### Provider Presets (from CCS)
1. **OpenRouter** - 349+ models, `openrouter.ai/api`
2. **GLM** - Claude via Z.AI, `api.z.ai/api/anthropic`
3. **GLMT** - GLM with thinking mode
4. **Kimi** - Moonshot AI, thinking model
5. **Azure Foundry** - Claude via Microsoft Azure
6. **Minimax** - 1M context window
7. **DeepSeek** - V3.2 and R1 models
8. **Qwen** - Alibaba Cloud, 256K context

---

## Integration Strategy

### Approach: Hybrid Integration
1. **CCS as subprocess**: Start CCS web server from Electron main process
2. **API proxy**: tRPC router proxies to CCS REST API
3. **Native UI**: Adapt CCS React components to 1code styling
4. **Fallback**: Keep existing provider system as fallback when CCS unavailable

### Architecture
```
1code Electron App
├── Main Process
│   ├── CCS Server Manager (start/stop/health)
│   └── tRPC Router (proxies to CCS API)
├── Renderer
│   ├── Provider Tab (CCS API profiles)
│   ├── CLIProxy Tab (OAuth accounts)
│   └── Integration Tab (external tools toggle)
└── External Tools
    └── ccs/ (submodule)
```

### Phase 1: CCS Server Integration
- [ ] Create CCS server manager in main process
- [ ] Add health check endpoint
- [ ] Configure port detection
- [ ] Handle auto-start based on integration settings

### Phase 2: tRPC API Proxy
- [ ] Create `ccs.ts` tRPC router
- [ ] Proxy profile CRUD operations
- [ ] Proxy CLIProxy operations
- [ ] Handle authentication flows

### Phase 3: UI Components
- [ ] Create CCS provider management tab
- [ ] Add provider preset selector
- [ ] Port profile editor component
- [ ] Add model selector with preset support

### Phase 4: Full Integration
- [ ] Connect chat to CCS providers
- [ ] Handle provider switching
- [ ] Add quota monitoring
- [ ] Implement failover logic

---

## Implementation Notes

### CCS Server Startup
```typescript
// From ccs/src/commands/config-command.ts
const server = await startWebServer({
  dev: false,
  port: await getPort({ port: [3000, 3001, 3002, ...] }),
  open: false, // Don't auto-open browser in Electron
});
```

### API Client Adaptation
The CCS `api-client.ts` uses `/api` base URL. In 1code, we'll proxy through tRPC:
- CCS API: `http://localhost:3000/api/profiles`
- 1code tRPC: `trpc.ccs.profiles.list()`

### Provider Selection Flow
1. User selects provider preset
2. UI shows model selector for that provider
3. On chat start, inject provider env vars
4. Monitor quota and handle failover

---

## Open Questions
1. Should CCS run always or on-demand?
2. How to handle CCS config vs 1code db providers?
3. OAuth flows - redirect handling in Electron?
4. CLIProxy binary - bundle or require separate install?

---

## Next Steps
1. Create CCS server manager (`src/main/lib/integrations/ccs/server.ts`)
2. Create tRPC CCS router (`src/main/lib/trpc/routers/ccs.ts`)
3. Update providers settings tab to show CCS profiles
4. Test provider switching in chat
