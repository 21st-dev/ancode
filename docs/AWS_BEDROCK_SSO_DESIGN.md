# AWS Bedrock SSO Authentication Design Document

## Overview

This document describes the design and implementation plan for adding comprehensive AWS Bedrock SSO (IAM Identity Center) authentication to the 1Code desktop application.

## Current State Analysis

### Existing Authentication Modes

The app currently supports four authentication modes defined in `claudeCodeSettings.authMode`:

1. **OAuth** - Claude Code OAuth flow (default)
2. **AWS Bedrock** - Basic region-only configuration
3. **API Key** - Direct Anthropic API key
4. **Devyard** - Vidyard internal development environment

### Current AWS Bedrock Implementation (Limited)

**Location:** `src/renderer/features/agents/components/settings-tabs/agents-claude-code-tab.tsx`

Current AWS Bedrock mode only stores:
- `bedrockRegion` - AWS region (e.g., "us-east-1")

**Problems:**
- No SSO integration
- Relies on users having pre-configured AWS credentials in `~/.aws/`
- No profile selection UI
- No account/role selection
- No credential validation
- No session management

### Database Schema

**Table:** `claude_code_settings` (from `src/main/lib/db/schema/index.ts`)

```typescript
export const claudeCodeSettings = sqliteTable("claude_code_settings", {
  id: text("id").primaryKey().default("default"),
  authMode: text("auth_mode").notNull().default("oauth"),
  apiKey: text("api_key"), // Encrypted with safeStorage
  bedrockRegion: text("bedrock_region").notNull().default("us-east-1"),
  // ... other fields
})
```

---

## Requirements

### Functional Requirements

1. **SSO Login Flow**
   - User enters SSO Start URL
   - App initiates device authorization flow
   - User authenticates in browser
   - App receives and caches SSO tokens

2. **Profile/Account Selection**
   - Retrieve available AWS accounts from SSO
   - Retrieve available roles for selected account
   - Allow user to select account + role combination
   - Support multiple profiles

3. **Credential Storage**
   - Encrypt sensitive tokens using Electron's `safeStorage`
   - Store SSO session configuration
   - Support credential refresh

4. **Integration**
   - Pass credentials to Claude SDK via environment variables
   - Set `CLAUDE_CODE_USE_BEDROCK=1`
   - Configure correct region

### Non-Functional Requirements

- Secure credential storage
- Graceful session expiration handling
- Clear error messages for auth failures
- Offline capability awareness

---

## Architecture Design

### SSO Flow Sequence

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   1Code     │     │   AWS SSO   │     │   Browser   │     │  AWS STS    │
│   Desktop   │     │   OIDC      │     │             │     │             │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │ 1. Register Client│                   │                   │
       │──────────────────>│                   │                   │
       │                   │                   │                   │
       │ 2. Start Device Auth                  │                   │
       │──────────────────>│                   │                   │
       │                   │                   │                   │
       │ 3. Device Code + URL                  │                   │
       │<──────────────────│                   │                   │
       │                   │                   │                   │
       │ 4. Open Browser   │                   │                   │
       │──────────────────────────────────────>│                   │
       │                   │                   │                   │
       │                   │   5. User Login   │                   │
       │                   │<─────────────────>│                   │
       │                   │                   │                   │
       │ 6. Poll for Tokens│                   │                   │
       │──────────────────>│                   │                   │
       │                   │                   │                   │
       │ 7. Access Token   │                   │                   │
       │<──────────────────│                   │                   │
       │                   │                   │                   │
       │ 8. List Accounts  │                   │                   │
       │──────────────────>│                   │                   │
       │                   │                   │                   │
       │ 9. Get Role Creds │                   │                   │
       │─────────────────────────────────────────────────────────>│
       │                   │                   │                   │
       │ 10. Temp Credentials                  │                   │
       │<─────────────────────────────────────────────────────────│
       │                   │                   │                   │
```

### Database Schema Extension

Add new fields to `claude_code_settings`:

```typescript
export const claudeCodeSettings = sqliteTable("claude_code_settings", {
  // ... existing fields ...

  // AWS SSO Configuration
  ssoStartUrl: text("sso_start_url"),         // e.g., "https://d-abc123.awsapps.com/start"
  ssoRegion: text("sso_region"),               // e.g., "us-east-1"
  ssoAccountId: text("sso_account_id"),        // e.g., "123456789012"
  ssoRoleName: text("sso_role_name"),          // e.g., "AdministratorAccess"
  ssoSessionName: text("sso_session_name"),    // Optional custom session name

  // Encrypted tokens (using safeStorage)
  ssoAccessToken: text("sso_access_token"),    // Encrypted SSO access token
  ssoRefreshToken: text("sso_refresh_token"),  // Encrypted refresh token
  ssoTokenExpiresAt: integer("sso_token_expires_at", { mode: "timestamp" }),

  // Client registration (for device auth flow)
  ssoClientId: text("sso_client_id"),
  ssoClientSecret: text("sso_client_secret"),  // Encrypted
  ssoClientExpiresAt: integer("sso_client_expires_at", { mode: "timestamp" }),
})
```

### New tRPC Router: `aws-sso.ts`

```typescript
// src/main/lib/trpc/routers/aws-sso.ts

export const awsSsoRouter = router({
  // 1. Start SSO device authorization
  startDeviceAuth: publicProcedure
    .input(z.object({
      ssoStartUrl: z.string().url(),
      ssoRegion: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Register OIDC client and start device authorization
      // Returns: { deviceCode, userCode, verificationUri, expiresIn }
    }),

  // 2. Poll for auth completion
  pollDeviceAuth: publicProcedure
    .input(z.object({
      deviceCode: z.string(),
      ssoRegion: z.string(),
    }))
    .query(async ({ input }) => {
      // Poll for token using device code
      // Returns: { status, accessToken?, expiresAt? }
    }),

  // 3. List available accounts
  listAccounts: publicProcedure
    .query(async () => {
      // Use stored access token to list accounts
      // Returns: { accounts: [{ accountId, accountName, emailAddress }] }
    }),

  // 4. List roles for account
  listAccountRoles: publicProcedure
    .input(z.object({
      accountId: z.string(),
    }))
    .query(async ({ input }) => {
      // Returns: { roles: [{ roleName, accountId }] }
    }),

  // 5. Select profile (save account + role)
  selectProfile: publicProcedure
    .input(z.object({
      accountId: z.string(),
      roleName: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Save selection and get role credentials
    }),

  // 6. Get current SSO status
  getStatus: publicProcedure.query(async () => {
    // Returns: { configured, authenticated, account, role, expiresAt }
  }),

  // 7. Refresh credentials
  refreshCredentials: publicProcedure.mutation(async () => {
    // Refresh SSO token and get new role credentials
  }),

  // 8. Logout
  logout: publicProcedure.mutation(async () => {
    // Clear all SSO tokens and credentials
  }),
})
```

### Claude Environment Integration

Update `src/main/lib/claude/env.ts` to include AWS credentials:

```typescript
export function buildClaudeEnv(options?: {
  ghToken?: string
  customEnv?: Record<string, string>
  awsCredentials?: {
    accessKeyId: string
    secretAccessKey: string
    sessionToken?: string
    region: string
  }
}): Record<string, string> {
  // ... existing code ...

  // 6. Add AWS Bedrock credentials if provided
  if (options?.awsCredentials) {
    env.CLAUDE_CODE_USE_BEDROCK = "1"
    env.AWS_ACCESS_KEY_ID = options.awsCredentials.accessKeyId
    env.AWS_SECRET_ACCESS_KEY = options.awsCredentials.secretAccessKey
    if (options.awsCredentials.sessionToken) {
      env.AWS_SESSION_TOKEN = options.awsCredentials.sessionToken
    }
    env.AWS_REGION = options.awsCredentials.region
    env.AWS_DEFAULT_REGION = options.awsCredentials.region
  }

  return env
}
```

---

## UI Design

### Settings Tab Update

The AWS Bedrock section in settings will be expanded:

```
┌──────────────────────────────────────────────────────────────┐
│ Authentication Mode                                          │
│ ┌─────────┐ ┌───────────────┐ ┌──────────┐ ┌──────────────┐ │
│ │  OAuth  │ │ AWS Bedrock   │ │ API Key  │ │   Devyard    │ │
│ └─────────┘ └───────────────┘ └──────────┘ └──────────────┘ │
└──────────────────────────────────────────────────────────────┘

When "AWS Bedrock" is selected:

┌──────────────────────────────────────────────────────────────┐
│ AWS Bedrock Configuration                                    │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Connection Method                                         │ │
│ │ ○ SSO (IAM Identity Center)    ○ Existing AWS Profile    │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ If SSO selected:                                             │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ SSO Start URL                                             │ │
│ │ ┌────────────────────────────────────────────────────┐   │ │
│ │ │ https://d-abc123.awsapps.com/start                 │   │ │
│ │ └────────────────────────────────────────────────────┘   │ │
│ │                                                           │ │
│ │ SSO Region                                                │ │
│ │ ┌────────────────────────────────────────────────────┐   │ │
│ │ │ us-east-1                                     ▼    │   │ │
│ │ └────────────────────────────────────────────────────┘   │ │
│ │                                                           │ │
│ │          ┌─────────────────────────────┐                 │ │
│ │          │     Start SSO Login          │                 │ │
│ │          └─────────────────────────────┘                 │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ After SSO login:                                             │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ ✓ Connected to AWS SSO                                    │ │
│ │                                                           │ │
│ │ AWS Account                                               │ │
│ │ ┌────────────────────────────────────────────────────┐   │ │
│ │ │ Production (123456789012)                      ▼   │   │ │
│ │ └────────────────────────────────────────────────────┘   │ │
│ │                                                           │ │
│ │ Role                                                      │ │
│ │ ┌────────────────────────────────────────────────────┐   │ │
│ │ │ AdministratorAccess                            ▼   │   │ │
│ │ └────────────────────────────────────────────────────┘   │ │
│ │                                                           │ │
│ │ Bedrock Region                                            │ │
│ │ ┌────────────────────────────────────────────────────┐   │ │
│ │ │ us-east-1                                     ▼    │   │ │
│ │ └────────────────────────────────────────────────────┘   │ │
│ │                                                           │ │
│ │ Session Expires: Jan 22, 2025 3:45 PM                    │ │
│ │                                                           │ │
│ │ ┌─────────────────────┐  ┌─────────────────────────────┐ │ │
│ │ │   Save Settings     │  │      Disconnect SSO         │ │ │
│ │ └─────────────────────┘  └─────────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ If "Existing AWS Profile" selected:                          │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ AWS Profile Name (from ~/.aws/credentials)               │ │
│ │ ┌────────────────────────────────────────────────────┐   │ │
│ │ │ default                                        ▼   │   │ │
│ │ └────────────────────────────────────────────────────┘   │ │
│ │                                                           │ │
│ │ Bedrock Region                                            │ │
│ │ ┌────────────────────────────────────────────────────┐   │ │
│ │ │ us-east-1                                     ▼    │   │ │
│ │ └────────────────────────────────────────────────────┘   │ │
│ │                                                           │ │
│ │          ┌─────────────────────────────┐                 │ │
│ │          │       Save Settings          │                 │ │
│ │          └─────────────────────────────┘                 │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### SSO Login Modal

When "Start SSO Login" is clicked:

```
┌──────────────────────────────────────────────────────────────┐
│                    AWS SSO Login                             │
│                                                              │
│   A browser window will open for authentication.             │
│                                                              │
│   Enter this code when prompted:                             │
│                                                              │
│           ┌─────────────────────────────────┐               │
│           │         ABCD-EFGH               │               │
│           └─────────────────────────────────┘               │
│                   ┌─────────┐                                │
│                   │  Copy   │                                │
│                   └─────────┘                                │
│                                                              │
│   ◐ Waiting for authentication...                            │
│                                                              │
│   ┌─────────────────────┐  ┌───────────────────────────┐    │
│   │ Open Browser Again  │  │         Cancel            │    │
│   └─────────────────────┘  └───────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Database Schema Migration

**Files to modify:**
- `src/main/lib/db/schema/index.ts` - Add SSO fields

**Migration:**
```sql
ALTER TABLE claude_code_settings ADD COLUMN sso_start_url TEXT;
ALTER TABLE claude_code_settings ADD COLUMN sso_region TEXT;
ALTER TABLE claude_code_settings ADD COLUMN sso_account_id TEXT;
ALTER TABLE claude_code_settings ADD COLUMN sso_role_name TEXT;
ALTER TABLE claude_code_settings ADD COLUMN sso_session_name TEXT;
ALTER TABLE claude_code_settings ADD COLUMN sso_access_token TEXT;
ALTER TABLE claude_code_settings ADD COLUMN sso_refresh_token TEXT;
ALTER TABLE claude_code_settings ADD COLUMN sso_token_expires_at INTEGER;
ALTER TABLE claude_code_settings ADD COLUMN sso_client_id TEXT;
ALTER TABLE claude_code_settings ADD COLUMN sso_client_secret TEXT;
ALTER TABLE claude_code_settings ADD COLUMN sso_client_expires_at INTEGER;
ALTER TABLE claude_code_settings ADD COLUMN aws_profile_name TEXT;
ALTER TABLE claude_code_settings ADD COLUMN bedrock_connection_method TEXT DEFAULT 'sso';
```

### Phase 2: AWS SSO Backend Service

**Files to create:**
- `src/main/lib/aws/sso-service.ts` - SSO OIDC client wrapper
- `src/main/lib/aws/credential-cache.ts` - Credential caching with encryption
- `src/main/lib/trpc/routers/aws-sso.ts` - tRPC router for SSO operations

**Dependencies to add:**
```json
{
  "@aws-sdk/client-sso": "^3.x",
  "@aws-sdk/client-sso-oidc": "^3.x",
  "@aws-sdk/credential-provider-sso": "^3.x"
}
```

### Phase 3: Claude Environment Integration

**Files to modify:**
- `src/main/lib/claude/env.ts` - Add AWS credential injection
- `src/main/lib/trpc/routers/claude.ts` - Load AWS credentials before Claude sessions

### Phase 4: Settings UI Update

**Files to modify:**
- `src/renderer/features/agents/components/settings-tabs/agents-claude-code-tab.tsx` - Expand AWS section

**Files to create:**
- `src/renderer/features/agents/components/aws-sso-login-modal.tsx` - SSO login flow UI
- `src/renderer/features/agents/components/aws-account-selector.tsx` - Account/role dropdowns

### Phase 5: Testing & Polish

- Unit tests for SSO service
- Integration tests for credential refresh
- E2E test for full SSO flow
- Error handling and recovery
- Credential expiration UI warnings

---

## File-by-File Implementation Details

### 1. `src/main/lib/db/schema/index.ts`

Add new columns to `claudeCodeSettings` table.

### 2. `src/main/lib/aws/sso-service.ts` (NEW)

```typescript
import { SSOClient, ListAccountsCommand, ListAccountRolesCommand, GetRoleCredentialsCommand } from "@aws-sdk/client-sso"
import { SSOOIDCClient, RegisterClientCommand, StartDeviceAuthorizationCommand, CreateTokenCommand } from "@aws-sdk/client-sso-oidc"
import { safeStorage } from "electron"

export class AwsSsoService {
  private oidcClient: SSOOIDCClient
  private ssoClient: SSOClient | null = null

  constructor(private region: string) {
    this.oidcClient = new SSOOIDCClient({ region })
  }

  // Register OIDC client (one-time, cached)
  async registerClient(): Promise<{ clientId: string, clientSecret: string, expiresAt: Date }>

  // Start device authorization flow
  async startDeviceAuthorization(ssoStartUrl: string): Promise<{
    deviceCode: string
    userCode: string
    verificationUri: string
    verificationUriComplete: string
    expiresIn: number
  }>

  // Poll for access token
  async pollForToken(deviceCode: string): Promise<{
    accessToken: string
    refreshToken?: string
    expiresAt: Date
  }>

  // List accounts available to user
  async listAccounts(accessToken: string): Promise<Array<{
    accountId: string
    accountName: string
    emailAddress: string
  }>>

  // List roles for account
  async listRoles(accessToken: string, accountId: string): Promise<Array<{
    roleName: string
    accountId: string
  }>>

  // Get temporary credentials for role
  async getRoleCredentials(accessToken: string, accountId: string, roleName: string): Promise<{
    accessKeyId: string
    secretAccessKey: string
    sessionToken: string
    expiration: Date
  }>

  // Refresh access token
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string
    expiresAt: Date
  }>
}
```

### 3. `src/main/lib/trpc/routers/aws-sso.ts` (NEW)

Full tRPC router with all endpoints as described above.

### 4. `src/main/lib/trpc/routers/index.ts`

Add `awsSsoRouter` to the router exports.

### 5. `src/main/lib/claude/env.ts`

Add `getAwsCredentials()` function and update `buildClaudeEnv()`.

### 6. `src/main/lib/trpc/routers/claude.ts`

Update `chat` subscription to load AWS credentials when `authMode === 'aws'`.

### 7. `src/renderer/features/agents/components/settings-tabs/agents-claude-code-tab.tsx`

Expand AWS Bedrock section with:
- Connection method toggle (SSO vs Profile)
- SSO configuration inputs
- Account/role selectors
- Status display
- Login/logout buttons

### 8. `src/renderer/features/agents/components/aws-sso-login-modal.tsx` (NEW)

Modal component for SSO device authorization flow.

---

## Security Considerations

1. **Token Encryption**
   - All tokens encrypted using Electron's `safeStorage` (OS keychain)
   - Never log or expose tokens in plaintext

2. **Token Refresh**
   - Automatically refresh tokens before expiration
   - Handle refresh failures gracefully

3. **Session Cleanup**
   - Clear all credentials on logout
   - Warn about expired sessions

4. **Principle of Least Privilege**
   - Only request necessary OAuth scopes
   - Document required IAM permissions for Bedrock access

---

## Required IAM Permissions

Users need these IAM permissions for Bedrock:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-*"
      ]
    }
  ]
}
```

---

## Testing Strategy

### Unit Tests

1. SSO Service
   - Client registration
   - Device authorization
   - Token polling
   - Token refresh
   - Account/role listing

2. Credential Cache
   - Encryption/decryption
   - Expiration handling
   - Cache invalidation

### Integration Tests

1. Full SSO login flow (mocked AWS responses)
2. Credential injection into Claude environment
3. Session expiration and refresh

### Manual Testing

1. SSO login with real AWS account
2. Multiple account/role combinations
3. Session expiration handling
4. Network error recovery

---

## Rollout Plan

1. **Alpha Release**
   - Feature flag: `ENABLE_AWS_SSO=true`
   - Internal testing only

2. **Beta Release**
   - Enable for Devyard users
   - Collect feedback

3. **GA Release**
   - Enable for all users
   - Documentation update

---

## Open Questions

1. Should we support multiple AWS profiles simultaneously?
2. Should we cache role credentials or always fetch fresh?
3. How long should device auth polling continue before timeout?
4. Should we support Organizations-level SSO configurations?

---

## References

- [AWS IAM Identity Center Documentation](https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html)
- [AWS SSO OIDC API Reference](https://docs.aws.amazon.com/singlesignon/latest/PortalAPIReference/Welcome.html)
- [AWS SDK for JavaScript v3 - SSO Credentials](https://github.com/aws/aws-sdk-js-v3/tree/main/packages/credential-provider-sso)
- [Electron safeStorage API](https://www.electronjs.org/docs/latest/api/safe-storage)
