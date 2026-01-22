# AWS Bedrock SSO Implementation Plan

This document provides step-by-step implementation instructions for adding AWS Bedrock SSO authentication to 1Code.

## Step 1: Install Dependencies

```bash
cd /Users/jdeland/dev/vidyard/1code
bun add @aws-sdk/client-sso @aws-sdk/client-sso-oidc @aws-sdk/credential-provider-sso
```

## Step 2: Database Schema Migration

### File: `src/main/lib/db/schema/index.ts`

Add new columns to `claudeCodeSettings`:

```typescript
// Add after existing fields in claudeCodeSettings table
export const claudeCodeSettings = sqliteTable("claude_code_settings", {
  // ... existing fields ...

  // AWS Bedrock connection method
  bedrockConnectionMethod: text("bedrock_connection_method").default("profile"), // "sso" | "profile"

  // AWS Profile mode
  awsProfileName: text("aws_profile_name"), // Name of AWS profile in ~/.aws/credentials

  // AWS SSO Configuration
  ssoStartUrl: text("sso_start_url"),
  ssoRegion: text("sso_region"),
  ssoAccountId: text("sso_account_id"),
  ssoAccountName: text("sso_account_name"), // Display name
  ssoRoleName: text("sso_role_name"),

  // SSO Tokens (encrypted with safeStorage)
  ssoAccessToken: text("sso_access_token"),
  ssoRefreshToken: text("sso_refresh_token"),
  ssoTokenExpiresAt: integer("sso_token_expires_at", { mode: "timestamp" }),

  // OIDC Client registration (for device auth)
  ssoClientId: text("sso_client_id"),
  ssoClientSecret: text("sso_client_secret"), // Encrypted
  ssoClientExpiresAt: integer("sso_client_expires_at", { mode: "timestamp" }),

  // Cached AWS credentials (encrypted)
  awsAccessKeyId: text("aws_access_key_id"),
  awsSecretAccessKey: text("aws_secret_access_key"),
  awsSessionToken: text("aws_session_token"),
  awsCredentialsExpiresAt: integer("aws_credentials_expires_at", { mode: "timestamp" }),
})
```

### Create Migration

Create `drizzle/0005_add_aws_sso_fields.sql`:

```sql
ALTER TABLE claude_code_settings ADD COLUMN bedrock_connection_method TEXT DEFAULT 'profile';
ALTER TABLE claude_code_settings ADD COLUMN aws_profile_name TEXT;
ALTER TABLE claude_code_settings ADD COLUMN sso_start_url TEXT;
ALTER TABLE claude_code_settings ADD COLUMN sso_region TEXT;
ALTER TABLE claude_code_settings ADD COLUMN sso_account_id TEXT;
ALTER TABLE claude_code_settings ADD COLUMN sso_account_name TEXT;
ALTER TABLE claude_code_settings ADD COLUMN sso_role_name TEXT;
ALTER TABLE claude_code_settings ADD COLUMN sso_access_token TEXT;
ALTER TABLE claude_code_settings ADD COLUMN sso_refresh_token TEXT;
ALTER TABLE claude_code_settings ADD COLUMN sso_token_expires_at INTEGER;
ALTER TABLE claude_code_settings ADD COLUMN sso_client_id TEXT;
ALTER TABLE claude_code_settings ADD COLUMN sso_client_secret TEXT;
ALTER TABLE claude_code_settings ADD COLUMN sso_client_expires_at INTEGER;
ALTER TABLE claude_code_settings ADD COLUMN aws_access_key_id TEXT;
ALTER TABLE claude_code_settings ADD COLUMN aws_secret_access_key TEXT;
ALTER TABLE claude_code_settings ADD COLUMN aws_session_token TEXT;
ALTER TABLE claude_code_settings ADD COLUMN aws_credentials_expires_at INTEGER;
```

## Step 3: Create AWS SSO Service

### File: `src/main/lib/aws/sso-service.ts` (NEW)

```typescript
import {
  SSOClient,
  ListAccountsCommand,
  ListAccountRolesCommand,
  GetRoleCredentialsCommand,
} from "@aws-sdk/client-sso"
import {
  SSOOIDCClient,
  RegisterClientCommand,
  StartDeviceAuthorizationCommand,
  CreateTokenCommand,
} from "@aws-sdk/client-sso-oidc"
import { safeStorage } from "electron"

// Encryption helpers
function encrypt(value: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn("[aws-sso] Encryption not available, using base64")
    return Buffer.from(value).toString("base64")
  }
  return safeStorage.encryptString(value).toString("base64")
}

function decrypt(encrypted: string): string {
  if (!encrypted) return ""
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return Buffer.from(encrypted, "base64").toString("utf-8")
    }
    return safeStorage.decryptString(Buffer.from(encrypted, "base64"))
  } catch (error) {
    console.error("[aws-sso] Decryption failed:", error)
    return ""
  }
}

export interface SsoAccount {
  accountId: string
  accountName: string
  emailAddress: string
}

export interface SsoRole {
  roleName: string
  accountId: string
}

export interface AwsCredentials {
  accessKeyId: string
  secretAccessKey: string
  sessionToken: string
  expiration: Date
}

export interface DeviceAuthResult {
  deviceCode: string
  userCode: string
  verificationUri: string
  verificationUriComplete: string
  expiresIn: number
  interval: number
}

export interface TokenResult {
  accessToken: string
  refreshToken?: string
  expiresAt: Date
}

export interface ClientRegistration {
  clientId: string
  clientSecret: string
  expiresAt: Date
}

export class AwsSsoService {
  private oidcClient: SSOOIDCClient
  private ssoClient: SSOClient

  constructor(private region: string) {
    this.oidcClient = new SSOOIDCClient({ region })
    this.ssoClient = new SSOClient({ region })
  }

  /**
   * Register OIDC client for device authorization
   */
  async registerClient(): Promise<ClientRegistration> {
    const command = new RegisterClientCommand({
      clientName: "1Code Desktop",
      clientType: "public",
      scopes: ["sso:account:access"],
    })

    const response = await this.oidcClient.send(command)

    if (!response.clientId || !response.clientSecret || !response.clientSecretExpiresAt) {
      throw new Error("Invalid client registration response")
    }

    return {
      clientId: response.clientId,
      clientSecret: encrypt(response.clientSecret),
      expiresAt: new Date(response.clientSecretExpiresAt * 1000),
    }
  }

  /**
   * Start device authorization flow
   */
  async startDeviceAuthorization(
    clientId: string,
    clientSecret: string, // Already encrypted
    ssoStartUrl: string
  ): Promise<DeviceAuthResult> {
    const command = new StartDeviceAuthorizationCommand({
      clientId,
      clientSecret: decrypt(clientSecret),
      startUrl: ssoStartUrl,
    })

    const response = await this.oidcClient.send(command)

    if (!response.deviceCode || !response.userCode || !response.verificationUri) {
      throw new Error("Invalid device authorization response")
    }

    return {
      deviceCode: response.deviceCode,
      userCode: response.userCode,
      verificationUri: response.verificationUri,
      verificationUriComplete: response.verificationUriComplete || response.verificationUri,
      expiresIn: response.expiresIn || 600,
      interval: response.interval || 5,
    }
  }

  /**
   * Poll for access token (call repeatedly until success or expiry)
   */
  async createToken(
    clientId: string,
    clientSecret: string, // Already encrypted
    deviceCode: string
  ): Promise<TokenResult | null> {
    try {
      const command = new CreateTokenCommand({
        clientId,
        clientSecret: decrypt(clientSecret),
        grantType: "urn:ietf:params:oauth:grant-type:device_code",
        deviceCode,
      })

      const response = await this.oidcClient.send(command)

      if (!response.accessToken) {
        return null
      }

      return {
        accessToken: encrypt(response.accessToken),
        refreshToken: response.refreshToken ? encrypt(response.refreshToken) : undefined,
        expiresAt: new Date(Date.now() + (response.expiresIn || 3600) * 1000),
      }
    } catch (error: any) {
      // AuthorizationPendingException means user hasn't completed auth yet
      if (error.name === "AuthorizationPendingException") {
        return null
      }
      // SlowDownException means we're polling too fast
      if (error.name === "SlowDownException") {
        return null
      }
      throw error
    }
  }

  /**
   * List accounts available to the authenticated user
   */
  async listAccounts(accessToken: string): Promise<SsoAccount[]> {
    const accounts: SsoAccount[] = []
    let nextToken: string | undefined

    do {
      const command = new ListAccountsCommand({
        accessToken: decrypt(accessToken),
        nextToken,
      })

      const response = await this.ssoClient.send(command)

      for (const account of response.accountList || []) {
        if (account.accountId && account.accountName) {
          accounts.push({
            accountId: account.accountId,
            accountName: account.accountName,
            emailAddress: account.emailAddress || "",
          })
        }
      }

      nextToken = response.nextToken
    } while (nextToken)

    return accounts
  }

  /**
   * List roles available for an account
   */
  async listAccountRoles(accessToken: string, accountId: string): Promise<SsoRole[]> {
    const roles: SsoRole[] = []
    let nextToken: string | undefined

    do {
      const command = new ListAccountRolesCommand({
        accessToken: decrypt(accessToken),
        accountId,
        nextToken,
      })

      const response = await this.ssoClient.send(command)

      for (const role of response.roleList || []) {
        if (role.roleName) {
          roles.push({
            roleName: role.roleName,
            accountId,
          })
        }
      }

      nextToken = response.nextToken
    } while (nextToken)

    return roles
  }

  /**
   * Get temporary credentials for a role
   */
  async getRoleCredentials(
    accessToken: string,
    accountId: string,
    roleName: string
  ): Promise<AwsCredentials> {
    const command = new GetRoleCredentialsCommand({
      accessToken: decrypt(accessToken),
      accountId,
      roleName,
    })

    const response = await this.ssoClient.send(command)
    const creds = response.roleCredentials

    if (!creds?.accessKeyId || !creds.secretAccessKey || !creds.sessionToken) {
      throw new Error("Invalid role credentials response")
    }

    return {
      accessKeyId: encrypt(creds.accessKeyId),
      secretAccessKey: encrypt(creds.secretAccessKey),
      sessionToken: encrypt(creds.sessionToken),
      expiration: new Date(creds.expiration || Date.now() + 3600000),
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(
    clientId: string,
    clientSecret: string,
    refreshToken: string
  ): Promise<TokenResult> {
    const command = new CreateTokenCommand({
      clientId,
      clientSecret: decrypt(clientSecret),
      grantType: "refresh_token",
      refreshToken: decrypt(refreshToken),
    })

    const response = await this.oidcClient.send(command)

    if (!response.accessToken) {
      throw new Error("Token refresh failed")
    }

    return {
      accessToken: encrypt(response.accessToken),
      refreshToken: response.refreshToken ? encrypt(response.refreshToken) : refreshToken,
      expiresAt: new Date(Date.now() + (response.expiresIn || 3600) * 1000),
    }
  }
}

// Export encryption helpers for use in other modules
export { encrypt, decrypt }
```

## Step 4: Create tRPC Router

### File: `src/main/lib/trpc/routers/aws-sso.ts` (NEW)

```typescript
import { z } from "zod"
import { shell } from "electron"
import { eq } from "drizzle-orm"
import { router, publicProcedure } from "../index"
import { getDatabase, claudeCodeSettings } from "../../db"
import { AwsSsoService, decrypt } from "../../aws/sso-service"

// Cached service instance
let ssoService: AwsSsoService | null = null

function getSsoService(region: string): AwsSsoService {
  if (!ssoService || ssoService["region"] !== region) {
    ssoService = new AwsSsoService(region)
  }
  return ssoService
}

export const awsSsoRouter = router({
  /**
   * Start SSO device authorization flow
   */
  startDeviceAuth: publicProcedure
    .input(
      z.object({
        ssoStartUrl: z.string().url(),
        ssoRegion: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const service = getSsoService(input.ssoRegion)
      const db = getDatabase()

      // Get or register OIDC client
      let settings = db
        .select()
        .from(claudeCodeSettings)
        .where(eq(claudeCodeSettings.id, "default"))
        .get()

      let clientId = settings?.ssoClientId
      let clientSecret = settings?.ssoClientSecret
      let clientExpiresAt = settings?.ssoClientExpiresAt

      // Register new client if needed
      const now = new Date()
      if (!clientId || !clientSecret || !clientExpiresAt || clientExpiresAt < now) {
        console.log("[aws-sso] Registering new OIDC client")
        const registration = await service.registerClient()
        clientId = registration.clientId
        clientSecret = registration.clientSecret
        clientExpiresAt = registration.expiresAt

        // Save client registration
        if (settings) {
          db.update(claudeCodeSettings)
            .set({
              ssoClientId: clientId,
              ssoClientSecret: clientSecret,
              ssoClientExpiresAt: clientExpiresAt,
              ssoStartUrl: input.ssoStartUrl,
              ssoRegion: input.ssoRegion,
              updatedAt: new Date(),
            })
            .where(eq(claudeCodeSettings.id, "default"))
            .run()
        } else {
          db.insert(claudeCodeSettings)
            .values({
              id: "default",
              ssoClientId: clientId,
              ssoClientSecret: clientSecret,
              ssoClientExpiresAt: clientExpiresAt,
              ssoStartUrl: input.ssoStartUrl,
              ssoRegion: input.ssoRegion,
            })
            .run()
        }
      }

      // Start device authorization
      const deviceAuth = await service.startDeviceAuthorization(
        clientId,
        clientSecret,
        input.ssoStartUrl
      )

      return {
        deviceCode: deviceAuth.deviceCode,
        userCode: deviceAuth.userCode,
        verificationUri: deviceAuth.verificationUri,
        verificationUriComplete: deviceAuth.verificationUriComplete,
        expiresIn: deviceAuth.expiresIn,
        interval: deviceAuth.interval,
      }
    }),

  /**
   * Open SSO verification URL in browser
   */
  openVerificationUrl: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(({ input }) => {
      shell.openExternal(input.url)
      return { opened: true }
    }),

  /**
   * Poll for device auth completion
   */
  pollDeviceAuth: publicProcedure
    .input(z.object({ deviceCode: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDatabase()
      const settings = db
        .select()
        .from(claudeCodeSettings)
        .where(eq(claudeCodeSettings.id, "default"))
        .get()

      if (!settings?.ssoClientId || !settings?.ssoClientSecret || !settings?.ssoRegion) {
        throw new Error("SSO client not registered")
      }

      const service = getSsoService(settings.ssoRegion)

      try {
        const token = await service.createToken(
          settings.ssoClientId,
          settings.ssoClientSecret,
          input.deviceCode
        )

        if (!token) {
          return { status: "pending" as const }
        }

        // Save tokens
        db.update(claudeCodeSettings)
          .set({
            ssoAccessToken: token.accessToken,
            ssoRefreshToken: token.refreshToken || null,
            ssoTokenExpiresAt: token.expiresAt,
            updatedAt: new Date(),
          })
          .where(eq(claudeCodeSettings.id, "default"))
          .run()

        return { status: "success" as const, expiresAt: token.expiresAt.toISOString() }
      } catch (error: any) {
        if (error.name === "ExpiredTokenException") {
          return { status: "expired" as const }
        }
        if (error.name === "AccessDeniedException") {
          return { status: "denied" as const }
        }
        throw error
      }
    }),

  /**
   * List AWS accounts available to authenticated user
   */
  listAccounts: publicProcedure.query(async () => {
    const db = getDatabase()
    const settings = db
      .select()
      .from(claudeCodeSettings)
      .where(eq(claudeCodeSettings.id, "default"))
      .get()

    if (!settings?.ssoAccessToken || !settings?.ssoRegion) {
      return { accounts: [], error: "Not authenticated" }
    }

    // Check if token is expired
    if (settings.ssoTokenExpiresAt && settings.ssoTokenExpiresAt < new Date()) {
      return { accounts: [], error: "Token expired" }
    }

    try {
      const service = getSsoService(settings.ssoRegion)
      const accounts = await service.listAccounts(settings.ssoAccessToken)
      return { accounts }
    } catch (error: any) {
      console.error("[aws-sso] Failed to list accounts:", error)
      return { accounts: [], error: error.message }
    }
  }),

  /**
   * List roles for a specific account
   */
  listRoles: publicProcedure
    .input(z.object({ accountId: z.string() }))
    .query(async ({ input }) => {
      const db = getDatabase()
      const settings = db
        .select()
        .from(claudeCodeSettings)
        .where(eq(claudeCodeSettings.id, "default"))
        .get()

      if (!settings?.ssoAccessToken || !settings?.ssoRegion) {
        return { roles: [], error: "Not authenticated" }
      }

      try {
        const service = getSsoService(settings.ssoRegion)
        const roles = await service.listAccountRoles(settings.ssoAccessToken, input.accountId)
        return { roles }
      } catch (error: any) {
        console.error("[aws-sso] Failed to list roles:", error)
        return { roles: [], error: error.message }
      }
    }),

  /**
   * Select account and role, then fetch credentials
   */
  selectProfile: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        accountName: z.string(),
        roleName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDatabase()
      const settings = db
        .select()
        .from(claudeCodeSettings)
        .where(eq(claudeCodeSettings.id, "default"))
        .get()

      if (!settings?.ssoAccessToken || !settings?.ssoRegion) {
        throw new Error("Not authenticated")
      }

      const service = getSsoService(settings.ssoRegion)

      // Get role credentials
      const credentials = await service.getRoleCredentials(
        settings.ssoAccessToken,
        input.accountId,
        input.roleName
      )

      // Save selection and credentials
      db.update(claudeCodeSettings)
        .set({
          ssoAccountId: input.accountId,
          ssoAccountName: input.accountName,
          ssoRoleName: input.roleName,
          awsAccessKeyId: credentials.accessKeyId,
          awsSecretAccessKey: credentials.secretAccessKey,
          awsSessionToken: credentials.sessionToken,
          awsCredentialsExpiresAt: credentials.expiration,
          updatedAt: new Date(),
        })
        .where(eq(claudeCodeSettings.id, "default"))
        .run()

      return {
        success: true,
        expiresAt: credentials.expiration.toISOString(),
      }
    }),

  /**
   * Get current SSO status
   */
  getStatus: publicProcedure.query(() => {
    const db = getDatabase()
    const settings = db
      .select()
      .from(claudeCodeSettings)
      .where(eq(claudeCodeSettings.id, "default"))
      .get()

    if (!settings) {
      return {
        configured: false,
        authenticated: false,
        hasCredentials: false,
      }
    }

    const now = new Date()
    const tokenValid = settings.ssoTokenExpiresAt && settings.ssoTokenExpiresAt > now
    const credsValid = settings.awsCredentialsExpiresAt && settings.awsCredentialsExpiresAt > now

    return {
      configured: !!settings.ssoStartUrl && !!settings.ssoRegion,
      authenticated: !!settings.ssoAccessToken && tokenValid,
      hasCredentials: !!settings.awsAccessKeyId && credsValid,
      ssoStartUrl: settings.ssoStartUrl,
      ssoRegion: settings.ssoRegion,
      accountId: settings.ssoAccountId,
      accountName: settings.ssoAccountName,
      roleName: settings.ssoRoleName,
      tokenExpiresAt: settings.ssoTokenExpiresAt?.toISOString(),
      credentialsExpiresAt: settings.awsCredentialsExpiresAt?.toISOString(),
    }
  }),

  /**
   * Refresh AWS credentials using stored SSO token
   */
  refreshCredentials: publicProcedure.mutation(async () => {
    const db = getDatabase()
    const settings = db
      .select()
      .from(claudeCodeSettings)
      .where(eq(claudeCodeSettings.id, "default"))
      .get()

    if (!settings?.ssoAccessToken || !settings?.ssoRegion) {
      throw new Error("Not authenticated")
    }

    if (!settings.ssoAccountId || !settings.ssoRoleName) {
      throw new Error("No account/role selected")
    }

    const service = getSsoService(settings.ssoRegion)

    // Check if SSO token needs refresh
    const now = new Date()
    let accessToken = settings.ssoAccessToken

    if (settings.ssoTokenExpiresAt && settings.ssoTokenExpiresAt < now) {
      if (!settings.ssoRefreshToken || !settings.ssoClientId || !settings.ssoClientSecret) {
        throw new Error("SSO session expired, please re-authenticate")
      }

      // Refresh SSO token
      const newToken = await service.refreshToken(
        settings.ssoClientId,
        settings.ssoClientSecret,
        settings.ssoRefreshToken
      )

      accessToken = newToken.accessToken

      db.update(claudeCodeSettings)
        .set({
          ssoAccessToken: newToken.accessToken,
          ssoRefreshToken: newToken.refreshToken || settings.ssoRefreshToken,
          ssoTokenExpiresAt: newToken.expiresAt,
        })
        .where(eq(claudeCodeSettings.id, "default"))
        .run()
    }

    // Get new role credentials
    const credentials = await service.getRoleCredentials(
      accessToken,
      settings.ssoAccountId,
      settings.ssoRoleName
    )

    db.update(claudeCodeSettings)
      .set({
        awsAccessKeyId: credentials.accessKeyId,
        awsSecretAccessKey: credentials.secretAccessKey,
        awsSessionToken: credentials.sessionToken,
        awsCredentialsExpiresAt: credentials.expiration,
        updatedAt: new Date(),
      })
      .where(eq(claudeCodeSettings.id, "default"))
      .run()

    return {
      success: true,
      expiresAt: credentials.expiration.toISOString(),
    }
  }),

  /**
   * Logout from SSO
   */
  logout: publicProcedure.mutation(() => {
    const db = getDatabase()

    db.update(claudeCodeSettings)
      .set({
        ssoAccessToken: null,
        ssoRefreshToken: null,
        ssoTokenExpiresAt: null,
        ssoAccountId: null,
        ssoAccountName: null,
        ssoRoleName: null,
        awsAccessKeyId: null,
        awsSecretAccessKey: null,
        awsSessionToken: null,
        awsCredentialsExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(claudeCodeSettings.id, "default"))
      .run()

    return { success: true }
  }),
})
```

## Step 5: Register Router

### File: `src/main/lib/trpc/routers/index.ts`

Add the new router:

```typescript
import { awsSsoRouter } from "./aws-sso"

export const appRouter = router({
  // ... existing routers ...
  awsSso: awsSsoRouter,
})
```

## Step 6: Update Claude Environment

### File: `src/main/lib/claude/env.ts`

Add function to get AWS credentials:

```typescript
import { getDatabase, claudeCodeSettings } from "../db"
import { eq } from "drizzle-orm"
import { decrypt } from "../aws/sso-service"

export interface AwsCredentials {
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
  region: string
}

/**
 * Get AWS credentials from database if AWS auth mode is enabled
 */
export function getAwsCredentials(): AwsCredentials | null {
  const db = getDatabase()
  const settings = db
    .select()
    .from(claudeCodeSettings)
    .where(eq(claudeCodeSettings.id, "default"))
    .get()

  if (!settings || settings.authMode !== "aws") {
    return null
  }

  // SSO mode
  if (settings.bedrockConnectionMethod === "sso") {
    if (!settings.awsAccessKeyId || !settings.awsSecretAccessKey) {
      console.warn("[claude-env] AWS SSO credentials not available")
      return null
    }

    // Check expiration
    if (settings.awsCredentialsExpiresAt && settings.awsCredentialsExpiresAt < new Date()) {
      console.warn("[claude-env] AWS credentials expired")
      return null
    }

    return {
      accessKeyId: decrypt(settings.awsAccessKeyId),
      secretAccessKey: decrypt(settings.awsSecretAccessKey),
      sessionToken: settings.awsSessionToken ? decrypt(settings.awsSessionToken) : undefined,
      region: settings.bedrockRegion || "us-east-1",
    }
  }

  // Profile mode - rely on AWS SDK to load from ~/.aws/
  // Just return the region, credentials will be loaded by SDK
  return {
    accessKeyId: "", // SDK will load from profile
    secretAccessKey: "",
    region: settings.bedrockRegion || "us-east-1",
  }
}

// Update buildClaudeEnv to accept and apply AWS credentials
export function buildClaudeEnv(options?: {
  ghToken?: string
  customEnv?: Record<string, string>
}): Record<string, string> {
  // ... existing code up to step 5 ...

  // 6. Add AWS Bedrock credentials if in AWS mode
  const awsCreds = getAwsCredentials()
  if (awsCreds) {
    env.CLAUDE_CODE_USE_BEDROCK = "1"
    env.AWS_REGION = awsCreds.region
    env.AWS_DEFAULT_REGION = awsCreds.region

    // Only set credentials if available (SSO mode)
    // Profile mode will use AWS SDK's default credential chain
    if (awsCreds.accessKeyId && awsCreds.secretAccessKey) {
      env.AWS_ACCESS_KEY_ID = awsCreds.accessKeyId
      env.AWS_SECRET_ACCESS_KEY = awsCreds.secretAccessKey
      if (awsCreds.sessionToken) {
        env.AWS_SESSION_TOKEN = awsCreds.sessionToken
      }
    }
  }

  // ... rest of function ...
  return env
}
```

## Step 7: Update Settings UI

### File: `src/renderer/features/agents/components/settings-tabs/agents-claude-code-tab.tsx`

This is a larger update. Key changes:

1. Add SSO state management
2. Add connection method toggle
3. Add SSO login flow UI
4. Add account/role selectors

See separate UI component files below.

### File: `src/renderer/features/agents/components/aws-sso-section.tsx` (NEW)

Create a new component for the AWS Bedrock SSO section:

```tsx
"use client"

import { useState, useEffect } from "react"
import { trpc } from "../../../../lib/trpc"
import { Button } from "../../../../components/ui/button"
import { Input } from "../../../../components/ui/input"
import { Label } from "../../../../components/ui/label"
import { IconSpinner } from "../../../../components/ui/icons"
import { Check, X, ExternalLink, Copy, LogOut, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog"

interface AwsSsoSectionProps {
  bedrockRegion: string
  onBedrockRegionChange: (region: string) => void
  onSave: () => void
  isSaving: boolean
}

type ConnectionMethod = "sso" | "profile"

export function AwsSsoSection({
  bedrockRegion,
  onBedrockRegionChange,
  onSave,
  isSaving,
}: AwsSsoSectionProps) {
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>("profile")
  const [ssoStartUrl, setSsoStartUrl] = useState("")
  const [ssoRegion, setSsoRegion] = useState("us-east-1")
  const [awsProfileName, setAwsProfileName] = useState("")

  // SSO login state
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [deviceCode, setDeviceCode] = useState("")
  const [userCode, setUserCode] = useState("")
  const [verificationUrl, setVerificationUrl] = useState("")
  const [isPolling, setIsPolling] = useState(false)

  // Account/role selection
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const [selectedRoleName, setSelectedRoleName] = useState("")

  // Queries
  const { data: ssoStatus, refetch: refetchStatus } = trpc.awsSso.getStatus.useQuery()
  const { data: accountsData, refetch: refetchAccounts } = trpc.awsSso.listAccounts.useQuery(
    undefined,
    { enabled: ssoStatus?.authenticated === true }
  )
  const { data: rolesData, refetch: refetchRoles } = trpc.awsSso.listRoles.useQuery(
    { accountId: selectedAccountId },
    { enabled: !!selectedAccountId }
  )

  // Mutations
  const startDeviceAuth = trpc.awsSso.startDeviceAuth.useMutation()
  const openVerificationUrl = trpc.awsSso.openVerificationUrl.useMutation()
  const pollDeviceAuth = trpc.awsSso.pollDeviceAuth.useMutation()
  const selectProfile = trpc.awsSso.selectProfile.useMutation()
  const refreshCredentials = trpc.awsSso.refreshCredentials.useMutation()
  const logout = trpc.awsSso.logout.useMutation()

  // Sync from status
  useEffect(() => {
    if (ssoStatus?.configured) {
      setSsoStartUrl(ssoStatus.ssoStartUrl || "")
      setSsoRegion(ssoStatus.ssoRegion || "us-east-1")
      if (ssoStatus.accountId) setSelectedAccountId(ssoStatus.accountId)
      if (ssoStatus.roleName) setSelectedRoleName(ssoStatus.roleName)
    }
  }, [ssoStatus])

  // Polling effect
  useEffect(() => {
    if (!isPolling || !deviceCode) return

    const interval = setInterval(async () => {
      try {
        const result = await pollDeviceAuth.mutateAsync({ deviceCode })

        if (result.status === "success") {
          setIsPolling(false)
          setShowLoginModal(false)
          toast.success("SSO login successful!")
          refetchStatus()
          refetchAccounts()
        } else if (result.status === "expired" || result.status === "denied") {
          setIsPolling(false)
          toast.error("SSO login failed or expired")
        }
      } catch (error) {
        console.error("Polling error:", error)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isPolling, deviceCode])

  const handleStartSsoLogin = async () => {
    if (!ssoStartUrl || !ssoRegion) {
      toast.error("Please enter SSO Start URL and Region")
      return
    }

    try {
      const result = await startDeviceAuth.mutateAsync({
        ssoStartUrl,
        ssoRegion,
      })

      setDeviceCode(result.deviceCode)
      setUserCode(result.userCode)
      setVerificationUrl(result.verificationUriComplete || result.verificationUri)
      setShowLoginModal(true)

      // Open browser
      openVerificationUrl.mutate({ url: result.verificationUriComplete || result.verificationUri })

      // Start polling
      setIsPolling(true)
    } catch (error: any) {
      toast.error(error.message || "Failed to start SSO login")
    }
  }

  const handleSelectProfile = async () => {
    if (!selectedAccountId || !selectedRoleName) {
      toast.error("Please select an account and role")
      return
    }

    const account = accountsData?.accounts.find((a) => a.accountId === selectedAccountId)

    try {
      await selectProfile.mutateAsync({
        accountId: selectedAccountId,
        accountName: account?.accountName || selectedAccountId,
        roleName: selectedRoleName,
      })
      toast.success("AWS profile selected")
      refetchStatus()
    } catch (error: any) {
      toast.error(error.message || "Failed to select profile")
    }
  }

  const handleRefreshCredentials = async () => {
    try {
      await refreshCredentials.mutateAsync()
      toast.success("Credentials refreshed")
      refetchStatus()
    } catch (error: any) {
      toast.error(error.message || "Failed to refresh credentials")
    }
  }

  const handleLogout = async () => {
    try {
      await logout.mutateAsync()
      toast.success("Logged out from AWS SSO")
      setSelectedAccountId("")
      setSelectedRoleName("")
      refetchStatus()
    } catch (error: any) {
      toast.error(error.message || "Failed to logout")
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(userCode)
    toast.success("Code copied to clipboard")
  }

  return (
    <div className="space-y-4">
      {/* Connection Method Toggle */}
      <div className="space-y-2">
        <Label className="text-sm">Connection Method</Label>
        <div className="flex gap-2">
          <Button
            variant={connectionMethod === "sso" ? "default" : "outline"}
            size="sm"
            onClick={() => setConnectionMethod("sso")}
          >
            SSO (IAM Identity Center)
          </Button>
          <Button
            variant={connectionMethod === "profile" ? "default" : "outline"}
            size="sm"
            onClick={() => setConnectionMethod("profile")}
          >
            AWS Profile
          </Button>
        </div>
      </div>

      {/* SSO Configuration */}
      {connectionMethod === "sso" && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          {!ssoStatus?.authenticated ? (
            <>
              {/* SSO URL Input */}
              <div className="space-y-2">
                <Label className="text-sm">SSO Start URL</Label>
                <Input
                  value={ssoStartUrl}
                  onChange={(e) => setSsoStartUrl(e.target.value)}
                  placeholder="https://d-abc123.awsapps.com/start"
                  className="font-mono text-sm"
                />
              </div>

              {/* SSO Region */}
              <div className="space-y-2">
                <Label className="text-sm">SSO Region</Label>
                <Select value={ssoRegion} onValueChange={setSsoRegion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us-east-1">us-east-1</SelectItem>
                    <SelectItem value="us-west-2">us-west-2</SelectItem>
                    <SelectItem value="eu-west-1">eu-west-1</SelectItem>
                    <SelectItem value="ap-northeast-1">ap-northeast-1</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Login Button */}
              <Button
                onClick={handleStartSsoLogin}
                disabled={startDeviceAuth.isPending}
              >
                {startDeviceAuth.isPending && <IconSpinner className="h-4 w-4 mr-2" />}
                Start SSO Login
              </Button>
            </>
          ) : (
            <>
              {/* Authenticated Status */}
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />
                Connected to AWS SSO
              </div>

              {/* Account Selector */}
              <div className="space-y-2">
                <Label className="text-sm">AWS Account</Label>
                <Select
                  value={selectedAccountId}
                  onValueChange={(value) => {
                    setSelectedAccountId(value)
                    setSelectedRoleName("")
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountsData?.accounts.map((account) => (
                      <SelectItem key={account.accountId} value={account.accountId}>
                        {account.accountName} ({account.accountId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Role Selector */}
              {selectedAccountId && (
                <div className="space-y-2">
                  <Label className="text-sm">Role</Label>
                  <Select value={selectedRoleName} onValueChange={setSelectedRoleName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {rolesData?.roles.map((role) => (
                        <SelectItem key={role.roleName} value={role.roleName}>
                          {role.roleName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Save Profile Button */}
              {selectedAccountId && selectedRoleName && (
                <Button
                  onClick={handleSelectProfile}
                  disabled={selectProfile.isPending}
                >
                  {selectProfile.isPending && <IconSpinner className="h-4 w-4 mr-2" />}
                  Use Selected Profile
                </Button>
              )}

              {/* Current Selection Status */}
              {ssoStatus.hasCredentials && (
                <div className="p-3 bg-background rounded-lg space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account:</span>
                    <span>{ssoStatus.accountName} ({ssoStatus.accountId})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role:</span>
                    <span>{ssoStatus.roleName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Credentials Expire:</span>
                    <span>
                      {ssoStatus.credentialsExpiresAt
                        ? new Date(ssoStatus.credentialsExpiresAt).toLocaleString()
                        : "Unknown"}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshCredentials}
                  disabled={refreshCredentials.isPending}
                >
                  {refreshCredentials.isPending ? (
                    <IconSpinner className="h-4 w-4 mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  disabled={logout.isPending}
                  className="text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Profile Configuration */}
      {connectionMethod === "profile" && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label className="text-sm">AWS Profile Name</Label>
            <Input
              value={awsProfileName}
              onChange={(e) => setAwsProfileName(e.target.value)}
              placeholder="default"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Profile from ~/.aws/credentials (leave empty for default)
            </p>
          </div>
        </div>
      )}

      {/* Bedrock Region (both methods) */}
      <div className="space-y-2">
        <Label className="text-sm">Bedrock Region</Label>
        <Select value={bedrockRegion} onValueChange={onBedrockRegionChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="us-east-1">us-east-1 (N. Virginia)</SelectItem>
            <SelectItem value="us-west-2">us-west-2 (Oregon)</SelectItem>
            <SelectItem value="eu-central-1">eu-central-1 (Frankfurt)</SelectItem>
            <SelectItem value="ap-northeast-1">ap-northeast-1 (Tokyo)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving && <IconSpinner className="h-4 w-4 mr-2" />}
          Save Settings
        </Button>
      </div>

      {/* SSO Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AWS SSO Login</DialogTitle>
            <DialogDescription>
              A browser window will open for authentication.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Enter this code when prompted:
              </p>
              <div className="text-2xl font-mono font-bold tracking-widest bg-muted p-4 rounded-lg">
                {userCode}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleCopyCode}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Code
              </Button>
            </div>

            {isPolling && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <IconSpinner className="h-4 w-4" />
                Waiting for authentication...
              </div>
            )}

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => openVerificationUrl.mutate({ url: verificationUrl })}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Browser
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowLoginModal(false)
                  setIsPolling(false)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

## Step 8: Update Router in Main Process

### File: `src/main/lib/trpc/routers/index.ts`

```typescript
import { router } from "../index"
import { projectsRouter } from "./projects"
import { chatsRouter } from "./chats"
import { claudeRouter } from "./claude"
import { claudeCodeRouter } from "./claude-code"
import { claudeSettingsRouter } from "./claude-settings"
import { awsSsoRouter } from "./aws-sso"  // Add this

export const appRouter = router({
  projects: projectsRouter,
  chats: chatsRouter,
  claude: claudeRouter,
  claudeCode: claudeCodeRouter,
  claudeSettings: claudeSettingsRouter,
  awsSso: awsSsoRouter,  // Add this
})

export type AppRouter = typeof appRouter
```

## Testing

### Manual Test Plan

1. **SSO Login Flow**
   - Enter valid SSO Start URL
   - Verify browser opens with correct verification URL
   - Complete authentication in browser
   - Verify app receives and stores tokens

2. **Account Selection**
   - After SSO login, verify accounts are listed
   - Select account and verify roles are loaded
   - Select role and verify credentials are fetched

3. **Credential Usage**
   - Start a chat with AWS Bedrock auth mode
   - Verify Claude receives proper environment variables
   - Verify API calls to Bedrock work

4. **Credential Refresh**
   - Wait for credentials to expire (or mock expiration)
   - Verify refresh button works
   - Verify auto-refresh before expiration

5. **Logout**
   - Click logout
   - Verify all credentials are cleared
   - Verify UI returns to login state

### Integration Test Setup

```typescript
// src/main/lib/aws/__tests__/sso-service.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest"
import { AwsSsoService } from "../sso-service"

describe("AwsSsoService", () => {
  let service: AwsSsoService

  beforeEach(() => {
    service = new AwsSsoService("us-east-1")
  })

  it("should register client successfully", async () => {
    // Mock AWS SDK responses
    // ...
  })

  // Add more tests
})
```

## Deployment Checklist

- [ ] Dependencies added to package.json
- [ ] Database migration created
- [ ] SSO service implemented
- [ ] tRPC router implemented
- [ ] Claude env updated
- [ ] UI components created
- [ ] Manual testing completed
- [ ] Integration tests passing
- [ ] Documentation updated
