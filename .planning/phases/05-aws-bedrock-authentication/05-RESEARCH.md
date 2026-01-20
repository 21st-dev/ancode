# Phase 5: AWS Bedrock Authentication - Research

**Researched:** 2026-01-20
**Domain:** AWS SSO authentication, Bedrock integration, Electron secure credential storage
**Confidence:** HIGH

## Summary

AWS Bedrock authentication with SSO profile selection requires a multi-step flow involving AWS SDK v3 packages for SSO OIDC device authorization. The standard approach uses device code flow (similar to what AWS CLI implements) where the user authenticates via browser and the app polls for token completion. After authentication, the app can list available AWS accounts and roles assigned to the user via IAM Identity Center.

The Claude Agent SDK expects AWS credentials to be available in the environment and uses the `CLAUDE_CODE_USE_BEDROCK=1` flag to enable Bedrock mode. The SDK does not handle authentication itself - it relies on the AWS SDK's credential chain (environment variables, credentials file, or SSO token cache).

**Primary recommendation:** Implement device authorization flow using @aws-sdk/client-sso-oidc for initial SSO login, then use @aws-sdk/client-sso to list accounts/roles and obtain temporary credentials. Store the selected profile configuration (account ID, role name, SSO session) in the database for subsequent Claude SDK sessions.

## Standard Stack

The established libraries/tools for AWS SSO authentication:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @aws-sdk/client-sso-oidc | 3.971.x | Device authorization flow | Official AWS SDK for SSO authentication, handles OAuth2 device grant |
| @aws-sdk/client-sso | 3.971.x | List accounts and roles, get credentials | Official AWS SDK for IAM Identity Center operations |
| @aws-sdk/client-bedrock-runtime | 3.971.x | Bedrock API client | Official AWS SDK for Bedrock model invocation |
| @aws-sdk/credential-providers | 3.971.x | Credential resolution | Provides fromSSO() and other credential providers |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @aws-sdk/credential-provider-sso | 3.971.x | SSO credential provider | Used internally by credential-providers, not directly imported |
| @aws-sdk/token-providers | 3.971.x | SSO token management | For advanced token refresh scenarios |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Device authorization | PKCE browser flow | Device flow better for desktop apps (no localhost callback handling), PKCE better for web apps |
| AWS SDK v3 | AWS SDK v2 | v3 is modular (smaller bundle), v2 is legacy and larger |

**Installation:**
```bash
npm install @aws-sdk/client-sso-oidc @aws-sdk/client-sso @aws-sdk/client-bedrock-runtime @aws-sdk/credential-providers
```

## Architecture Patterns

### AWS SSO Authentication Flow

The standard AWS SSO authentication follows OAuth2 Device Authorization Grant (RFC 8628):

```
1. RegisterClient → Get client ID and secret
2. StartDeviceAuthorization → Get device code and verification URL
3. Open browser to verification URL (user authenticates)
4. Poll CreateToken → Wait for user to complete authentication
5. Cache access token in ~/.aws/sso/cache/
6. Use token to call SSO APIs (ListAccounts, ListAccountRoles)
7. Get temporary credentials via GetRoleCredentials
```

### Recommended Data Flow

```
Onboarding/Settings UI
    ↓
tRPC: startAwsSsoLogin()
    ↓
Main Process: Device Authorization Flow
    ↓
Open Browser (shell.openExternal)
    ↓
Poll for Token (tRPC subscription)
    ↓
tRPC: listAwsAccounts()
    ↓
UI: Display account/role selector
    ↓
tRPC: saveAwsSsoProfile({ accountId, roleName })
    ↓
Database: Store in claudeCodeSettings
    ↓
Claude SDK: Use profile for Bedrock auth
```

### Pattern 1: Device Authorization Flow
**What:** OAuth2 device authorization for SSO login
**When to use:** Initial SSO authentication, token refresh on expiration
**Example:**
```typescript
// Source: AWS SDK v3 documentation
import { SSOOIDCClient, RegisterClientCommand, StartDeviceAuthorizationCommand, CreateTokenCommand } from "@aws-sdk/client-sso-oidc";

// 1. Register client application
const client = new SSOOIDCClient({ region: "us-east-1" });
const registerResponse = await client.send(new RegisterClientCommand({
  clientName: "1Code Desktop",
  clientType: "public"
}));

// 2. Start device authorization
const deviceAuthResponse = await client.send(new StartDeviceAuthorizationCommand({
  clientId: registerResponse.clientId,
  clientSecret: registerResponse.clientSecret,
  startUrl: "https://d-9067694978.awsapps.com/start" // User's SSO portal URL
}));

// 3. Open browser to verification URL
shell.openExternal(deviceAuthResponse.verificationUriComplete);

// 4. Poll for token (every 5 seconds until complete or timeout)
const interval = deviceAuthResponse.interval || 5;
let attempts = 0;
while (attempts < 60) { // 5 min timeout
  await new Promise(resolve => setTimeout(resolve, interval * 1000));

  try {
    const tokenResponse = await client.send(new CreateTokenCommand({
      clientId: registerResponse.clientId,
      clientSecret: registerResponse.clientSecret,
      grantType: "urn:ietf:params:oauth:grant-type:device_code",
      deviceCode: deviceAuthResponse.deviceCode
    }));

    // Success - cache the token
    return tokenResponse.accessToken;
  } catch (error) {
    if (error.name === "AuthorizationPendingException") {
      attempts++;
      continue; // User hasn't authorized yet
    }
    throw error; // Other errors are fatal
  }
}

throw new Error("SSO login timed out");
```

### Pattern 2: List Accounts and Roles
**What:** Fetch available AWS accounts and roles for the authenticated user
**When to use:** After successful SSO login, for profile selection UI
**Example:**
```typescript
// Source: AWS SDK v3 documentation
import { SSOClient, ListAccountsCommand, ListAccountRolesCommand } from "@aws-sdk/client-sso";

const ssoClient = new SSOClient({ region: "us-east-1" });

// List all accounts assigned to user
const accountsResponse = await ssoClient.send(new ListAccountsCommand({
  accessToken: ssoAccessToken
}));

// For each account, list available roles
const accountsWithRoles = await Promise.all(
  accountsResponse.accountList.map(async (account) => {
    const rolesResponse = await ssoClient.send(new ListAccountRolesCommand({
      accessToken: ssoAccessToken,
      accountId: account.accountId
    }));

    return {
      accountId: account.accountId,
      accountName: account.accountName,
      emailAddress: account.emailAddress,
      roles: rolesResponse.roleList.map(role => ({
        roleName: role.roleName,
        accountId: role.accountId
      }))
    };
  })
);
```

### Pattern 3: Claude SDK with Bedrock
**What:** Configure environment for Claude SDK to use Bedrock
**When to use:** When starting a Claude agent session with Bedrock authentication
**Example:**
```typescript
// Source: Claude Agent SDK documentation, current codebase
import { query } from "@anthropic-ai/claude-agent-sdk";

// Build environment with Bedrock configuration
const env = {
  ...process.env,
  // Enable Bedrock mode
  CLAUDE_CODE_USE_BEDROCK: "1",
  // Set AWS region for Bedrock
  AWS_REGION: "us-east-1",
  // AWS SDK will automatically use profile from AWS_PROFILE or credentials file
  AWS_PROFILE: "SSO-Staging-075505783641" // Selected profile name
};

// Claude SDK will use Bedrock with the configured AWS credentials
for await (const message of query({
  prompt: "Explain this code",
  options: {
    env,
    cwd: "/path/to/project"
  }
})) {
  console.log(message);
}
```

### Anti-Patterns to Avoid
- **Don't store SSO access tokens long-term:** They expire and can't be refreshed. Store the profile configuration (account ID, role name, SSO start URL) instead and re-authenticate when needed.
- **Don't use PKCE flow for desktop apps:** Device authorization flow is better for desktop apps as it doesn't require localhost callback handling or custom URL schemes.
- **Don't bypass AWS SDK credential chain:** Let the AWS SDK handle credential resolution via environment variables or credentials file. Don't implement custom credential management.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSO authentication | Custom OAuth2 implementation | @aws-sdk/client-sso-oidc device flow | Handles token expiration, polling intervals, error states, OAuth2 compliance |
| Credential management | Custom token storage and refresh | AWS SDK credential chain + ~/.aws/sso/cache | AWS SDK handles token caching, profile resolution, automatic refresh |
| Account/role selection | Custom AWS API calls | @aws-sdk/client-sso ListAccounts/ListAccountRoles | Handles pagination, error handling, IAM Identity Center API versions |
| Secure storage | Custom encryption | Electron safeStorage (already in use) | OS-level encryption (Keychain on macOS, Credential Vault on Windows) |

**Key insight:** AWS SSO has many edge cases (token expiration, slow authorization, IAM permissions, region-specific endpoints). The AWS SDK packages handle all of these. Don't try to implement OAuth2 device flow manually or manage tokens directly.

## Common Pitfalls

### Pitfall 1: Token Expiration Not Handled
**What goes wrong:** SSO access tokens expire (typically after 1-8 hours). If the app doesn't detect expiration, Claude SDK calls fail with authentication errors.
**Why it happens:** Tokens are cached in ~/.aws/sso/cache/ with expiration timestamps, but the app doesn't check them before use.
**How to avoid:** Before starting a Claude session with Bedrock, check if the cached SSO token is still valid (read cache file, check expiresAt). If expired, trigger re-authentication flow.
**Warning signs:** Claude SDK errors with "ExpiredTokenException" or "invalid_grant" after the app has been running for several hours.

### Pitfall 2: Region Mismatch
**What goes wrong:** SSO OIDC client region must match the IAM Identity Center region (where the SSO portal is hosted), but Bedrock client region must match where Bedrock models are available. Mixing these up causes API errors.
**Why it happens:** Assuming SSO region = Bedrock region, or not storing the SSO region separately.
**How to avoid:** Store two separate region values: `ssoRegion` (for IAM Identity Center) and `bedrockRegion` (for Bedrock API). Use `ssoRegion` for SSO OIDC/SSO clients, `bedrockRegion` for Bedrock client and Claude SDK.
**Warning signs:** "UnrecognizedClientException" from SSO API, or "AccessDeniedException" from Bedrock despite valid credentials.

### Pitfall 3: Profile vs Session Confusion
**What goes wrong:** AWS SDK v3 has two SSO configuration patterns: legacy (per-profile) and modern (sso-session). Mixing them causes credential resolution failures.
**Why it happens:** Reading outdated documentation or copying examples from AWS SDK v2.
**How to avoid:** Use sso-session configuration (recommended by AWS since CLI v2.22.0). Store `ssoSession` name, `ssoStartUrl`, and `ssoRegion` in the database. Generate AWS config file entries using sso-session pattern.
**Warning signs:** "Unable to load credentials from SSO profile" errors despite successful SSO login.

### Pitfall 4: Missing Environment Variable Propagation
**What goes wrong:** The app sets `CLAUDE_CODE_USE_BEDROCK=1` and `AWS_PROFILE`, but the Claude SDK subprocess doesn't receive them because environment variables aren't inherited correctly.
**Why it happens:** Electron's sandboxed processes don't automatically inherit all environment variables, especially when using custom shell environments.
**How to avoid:** Explicitly pass environment variables through `buildClaudeEnv()` function (already exists in codebase). Ensure `CLAUDE_CODE_USE_BEDROCK`, `AWS_PROFILE`, and `AWS_REGION` are included in the env object passed to Claude SDK.
**Warning signs:** Claude SDK falls back to Anthropic API despite Bedrock configuration, or "No authentication method found" errors.

### Pitfall 5: Device Code Polling Too Aggressive
**What goes wrong:** Polling CreateToken too frequently causes rate limiting errors from AWS SSO OIDC service.
**Why it happens:** Not respecting the `interval` field returned by StartDeviceAuthorization.
**How to avoid:** Always use the `interval` value from the device authorization response (typically 5 seconds). Add exponential backoff if SlowDownException is encountered.
**Warning signs:** "SlowDownException" errors during polling, SSO login taking unusually long to complete.

## Code Examples

Verified patterns from official sources:

### Complete Device Authorization Flow
```typescript
// Source: AWS SDK v3 documentation + current codebase patterns
import { SSOOIDCClient, RegisterClientCommand, StartDeviceAuthorizationCommand, CreateTokenCommand } from "@aws-sdk/client-sso-oidc";
import { shell } from "electron";

interface DeviceAuthResult {
  accessToken: string;
  expiresAt: Date;
  refreshToken?: string;
}

async function performDeviceAuthorization(
  ssoStartUrl: string,
  ssoRegion: string,
  clientName: string = "1Code Desktop"
): Promise<DeviceAuthResult> {
  const client = new SSOOIDCClient({ region: ssoRegion });

  // Step 1: Register client (can be cached for 90 days)
  const registerResponse = await client.send(new RegisterClientCommand({
    clientName,
    clientType: "public",
    scopes: ["sso:account:access"] // Required for ListAccounts
  }));

  // Step 2: Start device authorization
  const deviceAuthResponse = await client.send(new StartDeviceAuthorizationCommand({
    clientId: registerResponse.clientId,
    clientSecret: registerResponse.clientSecret,
    startUrl: ssoStartUrl
  }));

  // Step 3: Open browser with verification URL
  await shell.openExternal(deviceAuthResponse.verificationUriComplete);

  // Step 4: Poll for token completion
  const pollInterval = (deviceAuthResponse.interval || 5) * 1000; // Convert to ms
  const expiresAt = new Date(Date.now() + (deviceAuthResponse.expiresIn || 600) * 1000);

  while (Date.now() < expiresAt.getTime()) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    try {
      const tokenResponse = await client.send(new CreateTokenCommand({
        clientId: registerResponse.clientId,
        clientSecret: registerResponse.clientSecret,
        grantType: "urn:ietf:params:oauth:grant-type:device_code",
        deviceCode: deviceAuthResponse.deviceCode
      }));

      // Success!
      return {
        accessToken: tokenResponse.accessToken,
        expiresAt: new Date(Date.now() + tokenResponse.expiresIn * 1000),
        refreshToken: tokenResponse.refreshToken
      };
    } catch (error: any) {
      if (error.name === "AuthorizationPendingException") {
        continue; // User hasn't authorized yet, keep polling
      }
      if (error.name === "SlowDownException") {
        // AWS is rate limiting, increase polling interval
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      // Any other error is fatal
      throw error;
    }
  }

  throw new Error("Device authorization timed out");
}
```

### List Accounts and Roles with Pagination
```typescript
// Source: AWS SDK v3 documentation
import { SSOClient, ListAccountsCommand, ListAccountRolesCommand, paginateListAccounts } from "@aws-sdk/client-sso";

interface AccountWithRoles {
  accountId: string;
  accountName: string;
  emailAddress?: string;
  roles: Array<{
    roleName: string;
    accountId: string;
  }>;
}

async function listAccountsAndRoles(
  accessToken: string,
  ssoRegion: string
): Promise<AccountWithRoles[]> {
  const client = new SSOClient({ region: ssoRegion });

  // List all accounts (with pagination support)
  const accounts: AccountWithRoles[] = [];

  for await (const page of paginateListAccounts(
    { client },
    { accessToken }
  )) {
    for (const account of page.accountList || []) {
      // For each account, list available roles
      const rolesResponse = await client.send(new ListAccountRolesCommand({
        accessToken,
        accountId: account.accountId
      }));

      accounts.push({
        accountId: account.accountId!,
        accountName: account.accountName!,
        emailAddress: account.emailAddress,
        roles: (rolesResponse.roleList || []).map(role => ({
          roleName: role.roleName!,
          accountId: role.accountId!
        }))
      });
    }
  }

  return accounts;
}
```

### Cache SSO Token to Disk (AWS CLI Compatible)
```typescript
// Source: AWS SDK credential-provider-sso implementation pattern
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";

interface CachedToken {
  accessToken: string;
  expiresAt: string; // ISO 8601 timestamp
  region: string;
  startUrl: string;
}

async function cacheSsoToken(
  startUrl: string,
  region: string,
  accessToken: string,
  expiresAt: Date
): Promise<void> {
  // Use same cache directory as AWS CLI for compatibility
  const ssoDir = path.join(os.homedir(), ".aws", "sso", "cache");
  await fs.mkdir(ssoDir, { recursive: true });

  // Generate cache key (same algorithm as AWS CLI)
  const cacheKey = crypto
    .createHash("sha1")
    .update(startUrl)
    .digest("hex");

  const cacheFile = path.join(ssoDir, `${cacheKey}.json`);

  const cached: CachedToken = {
    accessToken,
    expiresAt: expiresAt.toISOString(),
    region,
    startUrl
  };

  await fs.writeFile(cacheFile, JSON.stringify(cached, null, 2));
}

async function loadCachedSsoToken(
  startUrl: string
): Promise<string | null> {
  const ssoDir = path.join(os.homedir(), ".aws", "sso", "cache");

  const cacheKey = crypto
    .createHash("sha1")
    .update(startUrl)
    .digest("hex");

  const cacheFile = path.join(ssoDir, `${cacheKey}.json`);

  try {
    const content = await fs.readFile(cacheFile, "utf-8");
    const cached: CachedToken = JSON.parse(content);

    // Check if token is expired
    if (new Date(cached.expiresAt) <= new Date()) {
      return null; // Token expired
    }

    return cached.accessToken;
  } catch (error) {
    return null; // Cache file doesn't exist or is invalid
  }
}
```

### Database Schema Addition
```typescript
// Source: Current codebase pattern (src/main/lib/db/schema/index.ts)
export const claudeCodeSettings = sqliteTable("claude_code_settings", {
  id: text("id").primaryKey().default("default"),
  // ... existing fields ...
  authMode: text("auth_mode").notNull().default("oauth"),

  // AWS SSO fields (new)
  awsSsoStartUrl: text("aws_sso_start_url"), // e.g., "https://d-9067694978.awsapps.com/start"
  awsSsoRegion: text("aws_sso_region").notNull().default("us-east-1"), // SSO region
  awsSsoAccountId: text("aws_sso_account_id"), // Selected account ID
  awsSsoRoleName: text("aws_sso_role_name"), // Selected role name
  awsSsoSessionName: text("aws_sso_session_name"), // Optional session name

  bedrockRegion: text("bedrock_region").notNull().default("us-east-1"), // Bedrock API region

  // Existing fields
  apiKey: text("api_key"),
  anthropicBaseUrl: text("anthropic_base_url"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AWS SDK v2 | AWS SDK v3 | 2020 | Modular packages, smaller bundles, better TypeScript support |
| Legacy SSO config | sso-session config | AWS CLI v2.22.0 (2022) | Reusable SSO sessions across profiles, automatic token refresh |
| Manual OAuth2 | AWS SDK device flow | AWS SDK v3 GA (2020) | Handles all OAuth2 edge cases, compatible with AWS CLI token cache |
| Static credentials | SSO temporary credentials | IAM Identity Center (2021) | Short-lived credentials, centralized access management, audit logging |

**Deprecated/outdated:**
- AWS SDK v2 (@aws-sdk/client-* packages replaced aws-sdk monolith)
- Legacy SSO config without sso-session (still works but not recommended)
- Long-lived IAM user access keys for developer access (SSO is now best practice)

## Open Questions

Things that couldn't be fully resolved:

1. **User email auto-population**
   - What we know: Phase description mentions "default: $DEVELOPER_EMAIL env var"
   - What's unclear: Is this a Vidyard-specific environment variable, or should it be a general user input? Devyard config doesn't currently include user email.
   - Recommendation: Make it an optional text input with no default, or derive from SSO response (emailAddress field in ListAccountsResponse)

2. **SSO portal URL discovery**
   - What we know: Phase mentions default URL "https://d-9067694978.awsapps.com/start" (Vidyard's SSO portal)
   - What's unclear: Should the app support multiple organizations' SSO portals, or is this Vidyard-specific?
   - Recommendation: Store as user input in onboarding, default to Vidyard URL if in Devyard mode, otherwise require user to provide it

3. **Profile name generation**
   - What we know: AWS CLI generates profile names like "SSO-{AccountName}-{AccountId}"
   - What's unclear: Should we use the same naming convention, or let users name profiles?
   - Recommendation: Auto-generate profile names following AWS CLI convention, store in database as `awsSsoSessionName`

## Sources

### Primary (HIGH confidence)
- AWS SDK for JavaScript v3 documentation (https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/)
- @aws-sdk/client-sso-oidc npm package (v3.971.0)
- @aws-sdk/client-sso npm package (v3.971.0)
- @aws-sdk/client-bedrock-runtime npm package (v3.971.0)
- @aws-sdk/credential-providers npm package (v3.971.0)
- Claude Agent SDK documentation (https://platform.claude.com/docs/en/agent-sdk/overview)
- AWS CLI SSO configuration guide (https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)

### Secondary (MEDIUM confidence)
- Current codebase implementation (Devyard config, authentication patterns)
- OAuth 2.0 Device Authorization Grant (RFC 8628)

### Tertiary (LOW confidence)
- None - all findings verified with official documentation or package inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages are official AWS SDK v3, versions verified from npm
- Architecture: HIGH - Device authorization flow is the standard AWS SSO pattern, verified in AWS CLI source code
- Pitfalls: MEDIUM - Based on AWS SDK documentation and common issues in AWS SDK GitHub issues, not from direct experience with all edge cases

**Research date:** 2026-01-20
**Valid until:** 60 days (AWS SDK releases monthly but rarely changes authentication APIs)
