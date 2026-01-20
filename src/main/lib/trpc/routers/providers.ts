import { z } from "zod"
import { safeStorage } from "electron"
import { observable } from "@trpc/server/observable"
import { router, publicProcedure } from "../index"
import { getDatabase, aiProviders, claudeCodeCredentials, providerModels } from "../../db"
import { eq, and, desc } from "drizzle-orm"
import { createId } from "../../db/utils"
import {
  fetchProviderModels,
  type FetchedModel,
  resolveModelAlias,
} from "../../providers/model-fetcher"
import { streamChat as openaiStreamChat } from "../../providers/openai-client"

// ============ ENCRYPTION HELPERS ============

function encryptApiKey(apiKey: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn("[Providers] Encryption not available, storing as base64")
    return Buffer.from(apiKey).toString("base64")
  }
  return safeStorage.encryptString(apiKey).toString("base64")
}

function decryptApiKey(encrypted: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    return Buffer.from(encrypted, "base64").toString("utf-8")
  }
  const buffer = Buffer.from(encrypted, "base64")
  return safeStorage.decryptString(buffer)
}

// ============ VALIDATION SCHEMAS ============

const providerTypeSchema = z.enum(["anthropic_oauth", "api_key"])
const providerRoleSchema = z.enum(["primary", "secondary"])

const createProviderSchema = z.object({
  name: z.string().min(1).max(100),
  type: providerTypeSchema,
  role: providerRoleSchema.optional().default("secondary"),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  userId: z.string().optional(),
})

const updateProviderSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  role: providerRoleSchema.optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional().nullable(),
  userId: z.string().optional(),
})

// ============ ROUTER ============

export const providersRouter = router({
  /**
   * List all AI providers
   */
  list: publicProcedure.query(() => {
    const db = getDatabase()
    const providers = db.select().from(aiProviders).all()

    // Return without decrypting API keys (mask them)
    return providers.map((p) => ({
      ...p,
      apiKey: p.apiKey ? "••••••••" : null,
      hasApiKey: !!p.apiKey,
    }))
  }),

  /**
   * Get a single provider by ID
   */
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const db = getDatabase()
      const provider = db
        .select()
        .from(aiProviders)
        .where(eq(aiProviders.id, input.id))
        .get()

      if (!provider) return null

      return {
        ...provider,
        apiKey: provider.apiKey ? "••••••••" : null,
        hasApiKey: !!provider.apiKey,
      }
    }),

  /**
   * Get the primary provider
   */
  getPrimary: publicProcedure.query(() => {
    const db = getDatabase()
    const provider = db
      .select()
      .from(aiProviders)
      .where(eq(aiProviders.role, "primary"))
      .get()

    if (!provider) return null

    return {
      ...provider,
      apiKey: provider.apiKey ? "••••••••" : null,
      hasApiKey: !!provider.apiKey,
    }
  }),

  /**
   * Get decrypted credentials for a provider (internal use)
   */
  getCredentials: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const db = getDatabase()
      const provider = db
        .select()
        .from(aiProviders)
        .where(eq(aiProviders.id, input.id))
        .get()

      if (!provider) {
        return { error: "Provider not found" }
      }

      if (provider.type === "anthropic_oauth") {
        // Get OAuth token from credentials table
        const cred = db
          .select()
          .from(claudeCodeCredentials)
          .where(eq(claudeCodeCredentials.id, "default"))
          .get()

        if (!cred?.oauthToken) {
          return { error: "OAuth not connected" }
        }

        // Decrypt OAuth token
        try {
          const buffer = Buffer.from(cred.oauthToken, "base64")
          const token = safeStorage.isEncryptionAvailable()
            ? safeStorage.decryptString(buffer)
            : Buffer.from(cred.oauthToken, "base64").toString("utf-8")

          return {
            type: "oauth" as const,
            token,
            baseUrl: null,
          }
        } catch {
          return { error: "Failed to decrypt OAuth token" }
        }
      }

      // API key provider
      if (!provider.apiKey) {
        return { error: "No API key configured" }
      }

      try {
        const apiKey = decryptApiKey(provider.apiKey)
        return {
          type: "api_key" as const,
          token: apiKey,
          baseUrl: provider.baseUrl,
        }
      } catch {
        return { error: "Failed to decrypt API key" }
      }
    }),

  /**
   * Create a new API key provider
   */
  create: publicProcedure
    .input(createProviderSchema)
    .mutation(({ input }) => {
      const db = getDatabase()

      // Validate API key for api_key type
      if (input.type === "api_key" && !input.apiKey) {
        throw new Error("API key is required for api_key type providers")
      }

      // If setting as primary, demote existing primary
      if (input.role === "primary") {
        db.update(aiProviders)
          .set({ role: "secondary" })
          .where(eq(aiProviders.role, "primary"))
          .run()
      }

      const id = createId()
      const encryptedKey = input.apiKey ? encryptApiKey(input.apiKey) : null

      db.insert(aiProviders)
        .values({
          id,
          name: input.name,
          type: input.type,
          role: input.role,
          isBuiltin: 0,
          apiKey: encryptedKey,
          baseUrl: input.baseUrl ?? null,
          userId: input.userId ?? null,
          createdAt: new Date(),
        })
        .run()

      return { id, name: input.name }
    }),

  /**
   * Update a provider
   */
  update: publicProcedure
    .input(updateProviderSchema)
    .mutation(({ input }) => {
      const db = getDatabase()

      const existing = db
        .select()
        .from(aiProviders)
        .where(eq(aiProviders.id, input.id))
        .get()

      if (!existing) {
        throw new Error("Provider not found")
      }

      // Build update object
      const updates: Partial<typeof aiProviders.$inferInsert> = {}

      if (input.name) updates.name = input.name
      if (input.role) {
        // If setting as primary, demote existing primary
        if (input.role === "primary") {
          db.update(aiProviders)
            .set({ role: "secondary" })
            .where(and(
              eq(aiProviders.role, "primary"),
              // Don't demote self
            ))
            .run()
        }
        updates.role = input.role
      }
      if (input.apiKey) {
        updates.apiKey = encryptApiKey(input.apiKey)
      }
      if (input.baseUrl !== undefined) {
        updates.baseUrl = input.baseUrl
      }
      if (input.userId !== undefined) {
        updates.userId = input.userId
      }

      if (Object.keys(updates).length > 0) {
        db.update(aiProviders)
          .set(updates)
          .where(eq(aiProviders.id, input.id))
          .run()
      }

      return { success: true }
    }),

  /**
   * Set a provider as primary
   */
  setPrimary: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      const db = getDatabase()

      // Verify provider exists
      const provider = db
        .select()
        .from(aiProviders)
        .where(eq(aiProviders.id, input.id))
        .get()

      if (!provider) {
        throw new Error("Provider not found")
      }

      // Demote all to secondary
      db.update(aiProviders)
        .set({ role: "secondary" })
        .run()

      // Set this one as primary
      db.update(aiProviders)
        .set({ role: "primary" })
        .where(eq(aiProviders.id, input.id))
        .run()

      return { success: true }
    }),

  /**
   * Delete a provider
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      const db = getDatabase()

      const provider = db
        .select()
        .from(aiProviders)
        .where(eq(aiProviders.id, input.id))
        .get()

      if (!provider) {
        throw new Error("Provider not found")
      }

      // Don't allow deleting builtin providers
      if (provider.isBuiltin) {
        throw new Error("Cannot delete builtin provider")
      }

      // Don't allow deleting primary provider
      if (provider.role === "primary") {
        throw new Error("Cannot delete primary provider. Set another provider as primary first.")
      }

      db.delete(aiProviders)
        .where(eq(aiProviders.id, input.id))
        .run()

      return { success: true }
    }),

  // ============ MODEL MANAGEMENT ============

  /**
   * Fetch and store models for a provider
   */
  fetchModels: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDatabase()

      // Get provider
      const provider = db
        .select()
        .from(aiProviders)
        .where(eq(aiProviders.id, input.id))
        .get()

      if (!provider) {
        throw new Error("Provider not found")
      }

      // Decrypt API key for fetching
      const apiKey = provider.apiKey ? decryptApiKey(provider.apiKey) : null

      // Fetch models
      const { models, apiFormat } = await fetchProviderModels({
        baseUrl: provider.baseUrl,
        type: provider.type as "anthropic_oauth" | "api_key",
        apiKey,
      })

      // Update provider api_format
      db.update(aiProviders)
        .set({ apiFormat })
        .where(eq(aiProviders.id, input.id))
        .run()

      // Delete existing models for this provider
      db.delete(providerModels)
        .where(eq(providerModels.providerId, input.id))
        .run()

      // Insert fetched models
      const now = new Date()
      for (const model of models) {
        const modelId = resolveModelAlias(model.id)
        db.insert(providerModels)
          .values({
            id: createId(),
            providerId: input.id,
            modelId,
            displayName: model.displayName,
            apiFormat: model.apiFormat,
            capabilities: model.capabilities
              ? JSON.stringify(model.capabilities)
              : null,
            contextLength: model.contextLength ?? null,
            isDefault: model.id === models[0].id ? 1 : 0, // First model is default
            isAvailable: 1,
            createdAt: now,
            updatedAt: now,
          })
          .run()
      }

      return {
        success: true,
        count: models.length,
        models: models.map((m) => ({
          id: resolveModelAlias(m.id),
          displayName: m.displayName,
          apiFormat: m.apiFormat,
        })),
      }
    }),

  /**
   * Get models for a specific provider
   */
  getModels: publicProcedure
    .input(z.object({ providerId: z.string().optional() }))
    .query(({ input }) => {
      const db = getDatabase()

      if (!input.providerId) {
        // Return all models across all providers
        const allModels = db
          .select({
            id: providerModels.id,
            modelId: providerModels.modelId,
            displayName: providerModels.displayName,
            apiFormat: providerModels.apiFormat,
            capabilities: providerModels.capabilities,
            contextLength: providerModels.contextLength,
            isDefault: providerModels.isDefault,
            isAvailable: providerModels.isAvailable,
            providerId: providerModels.providerId,
            providerName: aiProviders.name,
          })
          .from(providerModels)
          .innerJoin(aiProviders, eq(providerModels.providerId, aiProviders.id))
          .orderBy(desc(providerModels.isDefault), providerModels.displayName)
          .all()

        return allModels.map((m) => ({
          ...m,
          capabilities: m.capabilities ? JSON.parse(m.capabilities) : null,
        }))
      }

      const models = db
        .select()
        .from(providerModels)
        .where(eq(providerModels.providerId, input.providerId))
        .orderBy(desc(providerModels.isDefault), providerModels.displayName)
        .all()

      return models.map((m) => ({
        ...m,
        capabilities: m.capabilities ? JSON.parse(m.capabilities) : null,
      }))
    }),

  /**
   * Get default model for a provider
   */
  getDefaultModel: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .query(({ input }) => {
      const db = getDatabase()

      const model = db
        .select()
        .from(providerModels)
        .where(
          and(
            eq(providerModels.providerId, input.providerId),
            eq(providerModels.isDefault, 1),
          ),
        )
        .get()

      if (!model) return null

      return {
        ...model,
        capabilities: model.capabilities ? JSON.parse(model.capabilities) : null,
      }
    }),

  /**
   * Set default model for a provider
   */
  setDefaultModel: publicProcedure
    .input(
      z.object({
        providerId: z.string(),
        modelId: z.string(),
      }),
    )
    .mutation(({ input }) => {
      const db = getDatabase()

      // Verify model exists
      const model = db
        .select()
        .from(providerModels)
        .where(
          and(
            eq(providerModels.providerId, input.providerId),
            eq(providerModels.modelId, input.modelId),
          ),
        )
        .get()

      if (!model) {
        throw new Error("Model not found for this provider")
      }

      // Unset existing default
      db.update(providerModels)
        .set({ isDefault: 0 })
        .where(eq(providerModels.providerId, input.providerId))
        .run()

      // Set new default
      db.update(providerModels)
        .set({ isDefault: 1, updatedAt: new Date() })
        .where(eq(providerModels.id, model.id))
        .run()

      return { success: true }
    }),

  /**
   * Get all available models (grouped by provider)
   */
  getAllModels: publicProcedure.query(() => {
    const db = getDatabase()

    const providers = db.select().from(aiProviders).all()

    return providers.map((provider) => {
      const models = db
        .select()
        .from(providerModels)
        .where(eq(providerModels.providerId, provider.id))
        .orderBy(desc(providerModels.isDefault), providerModels.displayName)
        .all()

      return {
        provider: {
          id: provider.id,
          name: provider.name,
          type: provider.type,
          role: provider.role,
        },
        models: models.map((m) => ({
          modelId: m.modelId,
          displayName: m.displayName,
          apiFormat: m.apiFormat,
          isDefault: m.isDefault === 1,
          capabilities: m.capabilities ? JSON.parse(m.capabilities) : null,
        })),
      }
    })
  }),

  /**
   * Add a custom model to a provider
   */
  addModel: publicProcedure
    .input(
      z.object({
        providerId: z.string(),
        modelId: z.string().min(1),
        displayName: z.string().min(1).max(100),
        apiFormat: z.enum(["openai", "anthropic"]),
        contextLength: z.number().optional(),
      }),
    )
    .mutation(({ input }) => {
      const db = getDatabase()

      // Check if model already exists
      const existing = db
        .select()
        .from(providerModels)
        .where(
          and(
            eq(providerModels.providerId, input.providerId),
            eq(providerModels.modelId, input.modelId),
          ),
        )
        .get()

      if (existing) {
        throw new Error("Model already exists for this provider")
      }

      const now = new Date()
      db.insert(providerModels)
        .values({
          id: createId(),
          providerId: input.providerId,
          modelId: input.modelId,
          displayName: input.displayName,
          apiFormat: input.apiFormat,
          capabilities: null,
          contextLength: input.contextLength ?? null,
          isDefault: 0,
          isAvailable: 1,
          createdAt: now,
          updatedAt: now,
        })
        .run()

      return { success: true }
    }),

  /**
   * Remove a model from a provider
   */
  removeModel: publicProcedure
    .input(z.object({ modelId: z.string() }))
    .mutation(({ input }) => {
      const db = getDatabase()

      db.delete(providerModels)
        .where(eq(providerModels.id, input.modelId))
        .run()

      return { success: true }
    }),

  // ============ OPENAI-CHAT COMPATIBLE STREAMING ============

  /**
   * Stream chat with an OpenAI-compatible provider (GLM, etc.)
   * This is a simplified chat endpoint for non-Claude providers
   */
  chatStream: publicProcedure
    .input(
      z.object({
        providerId: z.string(),
        modelId: z.string(),
        prompt: z.string(),
        temperature: z.number().optional(),
        maxTokens: z.number().optional(),
        systemPrompt: z.string().optional(),
      }),
    )
    .subscription(({ input }) => {
      return observable<{ type: string; content?: string; error?: string }>(
        (emit) => {
          const db = getDatabase()

          // Get provider with decrypted API key
          const provider = db
            .select()
            .from(aiProviders)
            .where(eq(aiProviders.id, input.providerId))
            .get()

          if (!provider) {
            emit.next({ type: "error", error: "Provider not found" })
            emit.complete()
            return () => {}
          }

          if (!provider.apiKey) {
            emit.next({ type: "error", error: "No API key configured" })
            emit.complete()
            return () => {}
          }

          if (!provider.baseUrl) {
            emit.next({ type: "error", error: "No base URL configured" })
            emit.complete()
            return () => {}
          }

          const apiKey = decryptApiKey(provider.apiKey)
          const baseUrl = provider.baseUrl // Capture for async closure (guaranteed non-null after check above)
          const userId = provider.userId ?? undefined

          // Track observable lifecycle for cleanup
          let isObservableActive = true

          // Start streaming
          ;(async () => {
            try {
              for await (const chunk of openaiStreamChat(baseUrl, apiKey, {
                model: input.modelId,
                messages: [
                  ...(input.systemPrompt
                    ? [{ role: "system" as const, content: input.systemPrompt }]
                    : []),
                  { role: "user" as const, content: input.prompt },
                ],
                temperature: input.temperature,
                maxTokens: input.maxTokens,
                stream: true,
              }, userId)) {
                if (!isObservableActive) break

                if (chunk.type === "text") {
                  emit.next({ type: "text", content: chunk.content })
                } else if (chunk.type === "error") {
                  emit.next({ type: "error", error: chunk.error })
                  break
                } else if (chunk.type === "end") {
                  emit.next({ type: "end" })
                  break
                }
              }

              emit.complete()
            } catch (error) {
              emit.next({
                type: "error",
                error: error instanceof Error ? error.message : String(error),
              })
              emit.complete()
            }
          })()

          return () => {
            isObservableActive = false
          }
        },
      )
    }),
})
