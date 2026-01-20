// #NP - Credentials tRPC router
import { z } from "zod"
import { router, publicProcedure } from "../index"
import { getDatabase, providerCredentials, aiProviders } from "../../db"
import { eq, and, asc } from "drizzle-orm"
import { createId } from "../../db/utils"
import {
  encryptString,
  resolveCredential,
  resetCredentialUsage,
  getCredentialById,
} from "../../providers/credential-resolver"
import {
  getCredentialUsage,
  getCredentialUsageSummary,
} from "../../providers/usage-tracker"

// ============ VALIDATION SCHEMAS ============

const authTypeSchema = z.enum(["oauth", "api_key"])

const createCredentialSchema = z.object({
  providerId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  authType: authTypeSchema,
  apiKey: z.string().optional(),
  oauthToken: z.string().optional(),
  oauthRefreshToken: z.string().optional(),
  priority: z.number().int().min(0).default(0),
  usageLimitType: z.enum(["time_based", "token_based", "request_based"]).optional(),
  usageLimitValue: z.number().int().positive().optional(),
  usageLimitPeriod: z.enum(["daily", "monthly", "none"]).optional(),
})

const updateCredentialSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  priority: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  usageLimitType: z.enum(["time_based", "token_based", "request_based"]).optional().nullable(),
  usageLimitValue: z.number().int().positive().optional().nullable(),
  usageLimitPeriod: z.enum(["daily", "monthly", "none"]).optional().nullable(),
  // Update credentials (re-encrypt)
  apiKey: z.string().optional(),
  oauthToken: z.string().optional(),
  oauthRefreshToken: z.string().optional(),
})

// ============ ROUTER ============

export const credentialsRouter = router({
  /**
   * List all credentials for a provider
   */
  list: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .query(({ input }) => {
      const db = getDatabase()
      const credentials = db
        .select()
        .from(providerCredentials)
        .where(eq(providerCredentials.providerId, input.providerId))
        .orderBy(asc(providerCredentials.priority))
        .all()

      // Mask sensitive data
      return credentials.map((c) => ({
        ...c,
        apiKey: c.apiKey ? "••••••••" : null,
        oauthToken: c.oauthToken ? "••••••••" : null,
        oauthRefreshToken: c.oauthRefreshToken ? "••••••••" : null,
        hasApiKey: !!c.apiKey,
        hasOAuthToken: !!c.oauthToken,
      }))
    }),

  /**
   * Get a single credential by ID (masked)
   */
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const db = getDatabase()
      const credential = db
        .select()
        .from(providerCredentials)
        .where(eq(providerCredentials.id, input.id))
        .get()

      if (!credential) return null

      return {
        ...credential,
        apiKey: credential.apiKey ? "••••••••" : null,
        oauthToken: credential.oauthToken ? "••••••••" : null,
        oauthRefreshToken: credential.oauthRefreshToken ? "••••••••" : null,
        hasApiKey: !!credential.apiKey,
        hasOAuthToken: !!credential.oauthToken,
      }
    }),

  /**
   * Create a new credential
   */
  create: publicProcedure
    .input(createCredentialSchema)
    .mutation(({ input }) => {
      const db = getDatabase()

      // Verify provider exists
      const provider = db
        .select()
        .from(aiProviders)
        .where(eq(aiProviders.id, input.providerId))
        .get()

      if (!provider) {
        throw new Error(`Provider not found: ${input.providerId}`)
      }

      const id = createId()
      const now = new Date()

      db.insert(providerCredentials)
        .values({
          id,
          providerId: input.providerId,
          name: input.name,
          description: input.description,
          authType: input.authType,
          apiKey: input.apiKey ? encryptString(input.apiKey) : null,
          oauthToken: input.oauthToken ? encryptString(input.oauthToken) : null,
          oauthRefreshToken: input.oauthRefreshToken
            ? encryptString(input.oauthRefreshToken)
            : null,
          isActive: 1,
          priority: input.priority,
          usageLimitType: input.usageLimitType,
          usageLimitValue: input.usageLimitValue,
          usageLimitPeriod: input.usageLimitPeriod,
          currentUsage: 0,
          createdAt: now,
          updatedAt: now,
        })
        .run()

      return { id }
    }),

  /**
   * Update a credential
   */
  update: publicProcedure
    .input(updateCredentialSchema)
    .mutation(({ input }) => {
      const db = getDatabase()
      const { id, apiKey, oauthToken, oauthRefreshToken, ...rest } = input

      const updates: Record<string, unknown> = {
        ...rest,
        updatedAt: new Date(),
      }

      // Encrypt new credentials if provided
      if (apiKey !== undefined) {
        updates.apiKey = apiKey ? encryptString(apiKey) : null
      }
      if (oauthToken !== undefined) {
        updates.oauthToken = oauthToken ? encryptString(oauthToken) : null
      }
      if (oauthRefreshToken !== undefined) {
        updates.oauthRefreshToken = oauthRefreshToken
          ? encryptString(oauthRefreshToken)
          : null
      }

      db.update(providerCredentials)
        .set(updates)
        .where(eq(providerCredentials.id, id))
        .run()

      return { success: true }
    }),

  /**
   * Delete a credential
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      const db = getDatabase()
      db.delete(providerCredentials)
        .where(eq(providerCredentials.id, input.id))
        .run()

      return { success: true }
    }),

  /**
   * Get the active credential for a provider
   */
  getActive: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .query(async ({ input }) => {
      const resolved = await resolveCredential(input.providerId)
      if (!resolved) return null

      return {
        id: resolved.credential.id,
        name: resolved.credential.name,
        authType: resolved.credential.authType,
        isActive: resolved.credential.isActive === 1,
        priority: resolved.credential.priority,
        currentUsage: resolved.credential.currentUsage,
        usageLimitValue: resolved.credential.usageLimitValue,
        // Include provider info
        provider: {
          id: resolved.provider.id,
          name: resolved.provider.name,
          type: resolved.provider.type,
        },
      }
    }),

  /**
   * Get usage statistics for a credential
   */
  getUsage: publicProcedure
    .input(
      z.object({
        credentialId: z.string(),
        limit: z.number().int().positive().default(100),
      })
    )
    .query(({ input }) => {
      return getCredentialUsage(input.credentialId, input.limit)
    }),

  /**
   * Get usage summary for a credential
   */
  getUsageSummary: publicProcedure
    .input(
      z.object({
        credentialId: z.string(),
        sinceTimestamp: z.number().optional(),
      })
    )
    .query(({ input }) => {
      return getCredentialUsageSummary(input.credentialId, input.sinceTimestamp)
    }),

  /**
   * Reset usage counter for a credential
   */
  resetUsage: publicProcedure
    .input(z.object({ credentialId: z.string() }))
    .mutation(({ input }) => {
      resetCredentialUsage(input.credentialId)
      return { success: true }
    }),

  /**
   * Set credential priority (reorder)
   */
  setPriority: publicProcedure
    .input(
      z.object({
        id: z.string(),
        priority: z.number().int().min(0),
      })
    )
    .mutation(({ input }) => {
      const db = getDatabase()
      db.update(providerCredentials)
        .set({
          priority: input.priority,
          updatedAt: new Date(),
        })
        .where(eq(providerCredentials.id, input.id))
        .run()

      return { success: true }
    }),

  /**
   * Toggle credential active state
   */
  toggleActive: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      const db = getDatabase()
      const credential = db
        .select()
        .from(providerCredentials)
        .where(eq(providerCredentials.id, input.id))
        .get()

      if (!credential) {
        throw new Error(`Credential not found: ${input.id}`)
      }

      db.update(providerCredentials)
        .set({
          isActive: credential.isActive === 1 ? 0 : 1,
          updatedAt: new Date(),
        })
        .where(eq(providerCredentials.id, input.id))
        .run()

      return { success: true, isActive: credential.isActive !== 1 }
    }),
})
