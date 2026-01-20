// #NP - Universal models tRPC router
import { z } from "zod"
import { router, publicProcedure } from "../index"
import { getDatabase, models, aiProviders } from "../../db"
import { eq } from "drizzle-orm"
import { createId } from "../../db/utils"
import {
  getModelsForProvider,
  getProvidersForModel,
  updateModelProviderStatus,
  addProviderToModel,
  removeProviderFromModel,
} from "../../providers/model-resolver"
import { getModelUsage } from "../../providers/usage-tracker"

// ============ VALIDATION SCHEMAS ============

const modelStatusSchema = z.enum(["A", "D", "X"])

const createModelSchema = z.object({
  modelId: z.string().min(1),
  displayName: z.string().min(1),
  providerIds: z.string().min(1), // Comma-separated
  providerStatus: z.string().min(1), // Comma-separated A/D/X
  apiFormat: z.enum(["openai", "anthropic"]).default("openai"),
  version: z.string().optional(),
  maxContextLength: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  defaultTemperature: z.number().min(0).max(2).optional(),
  supportsVision: z.boolean().optional(),
  supportsTools: z.boolean().optional(),
  supportsStreaming: z.boolean().optional(),
  supportsSystemPrompt: z.boolean().optional(),
  pricingInputPerMtok: z.number().optional(),
  pricingOutputPerMtok: z.number().optional(),
  capabilities: z.string().optional(), // JSON
  isDefault: z.boolean().optional(),
})

const updateModelSchema = z.object({
  modelId: z.string(),
  displayName: z.string().min(1).optional(),
  version: z.string().optional().nullable(),
  maxContextLength: z.number().int().positive().optional().nullable(),
  maxOutputTokens: z.number().int().positive().optional().nullable(),
  defaultTemperature: z.number().min(0).max(2).optional().nullable(),
  supportsVision: z.boolean().optional(),
  supportsTools: z.boolean().optional(),
  supportsStreaming: z.boolean().optional(),
  supportsSystemPrompt: z.boolean().optional(),
  pricingInputPerMtok: z.number().optional().nullable(),
  pricingOutputPerMtok: z.number().optional().nullable(),
  capabilities: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
})

// ============ ROUTER ============

export const modelsRouter = router({
  /**
   * List all models with their provider availability
   */
  list: publicProcedure.query(() => {
    const db = getDatabase()
    const allModels = db.select().from(models).all()

    return allModels.map((m) => ({
      ...m,
      // Parse provider mapping for convenience
      providers: parseProviderMapping(m.providerIds, m.providerStatus),
    }))
  }),

  /**
   * Get a single model by modelId
   */
  get: publicProcedure
    .input(z.object({ modelId: z.string() }))
    .query(({ input }) => {
      const db = getDatabase()
      const model = db
        .select()
        .from(models)
        .where(eq(models.modelId, input.modelId))
        .get()

      if (!model) return null

      return {
        ...model,
        providers: parseProviderMapping(model.providerIds, model.providerStatus),
      }
    }),

  /**
   * Get models available for a specific provider
   */
  listByProvider: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .query(({ input }) => {
      const providerModels = getModelsForProvider(input.providerId)
      return providerModels.map((m) => ({
        ...m,
        providers: parseProviderMapping(m.providerIds, m.providerStatus),
      }))
    }),

  /**
   * Get providers that offer a specific model
   */
  getProviders: publicProcedure
    .input(z.object({ modelId: z.string() }))
    .query(({ input }) => {
      return getProvidersForModel(input.modelId)
    }),

  /**
   * Create a new model
   */
  create: publicProcedure
    .input(createModelSchema)
    .mutation(({ input }) => {
      const db = getDatabase()

      // Check if model already exists
      const existing = db
        .select()
        .from(models)
        .where(eq(models.modelId, input.modelId))
        .get()

      if (existing) {
        throw new Error(`Model already exists: ${input.modelId}`)
      }

      const id = createId()
      const now = new Date()

      db.insert(models)
        .values({
          id,
          modelId: input.modelId,
          displayName: input.displayName,
          providerIds: input.providerIds,
          providerStatus: input.providerStatus,
          apiFormat: input.apiFormat,
          version: input.version,
          maxContextLength: input.maxContextLength,
          maxOutputTokens: input.maxOutputTokens,
          defaultTemperature: input.defaultTemperature,
          supportsVision: input.supportsVision ? 1 : 0,
          supportsTools: input.supportsTools ? 1 : 0,
          supportsStreaming: input.supportsStreaming !== false ? 1 : 0,
          supportsSystemPrompt: input.supportsSystemPrompt !== false ? 1 : 0,
          pricingInputPerMtok: input.pricingInputPerMtok,
          pricingOutputPerMtok: input.pricingOutputPerMtok,
          capabilities: input.capabilities,
          isDefault: input.isDefault ? 1 : 0,
          createdAt: now,
          updatedAt: now,
        })
        .run()

      return { id, modelId: input.modelId }
    }),

  /**
   * Update a model
   */
  update: publicProcedure
    .input(updateModelSchema)
    .mutation(({ input }) => {
      const db = getDatabase()
      const { modelId, supportsVision, supportsTools, supportsStreaming, supportsSystemPrompt, isDefault, ...rest } = input

      const updates: Record<string, unknown> = {
        ...rest,
        updatedAt: new Date(),
      }

      // Convert booleans to integers
      if (supportsVision !== undefined) {
        updates.supportsVision = supportsVision ? 1 : 0
      }
      if (supportsTools !== undefined) {
        updates.supportsTools = supportsTools ? 1 : 0
      }
      if (supportsStreaming !== undefined) {
        updates.supportsStreaming = supportsStreaming ? 1 : 0
      }
      if (supportsSystemPrompt !== undefined) {
        updates.supportsSystemPrompt = supportsSystemPrompt ? 1 : 0
      }
      if (isDefault !== undefined) {
        updates.isDefault = isDefault ? 1 : 0
      }

      db.update(models)
        .set(updates)
        .where(eq(models.modelId, modelId))
        .run()

      return { success: true }
    }),

  /**
   * Delete a model
   */
  delete: publicProcedure
    .input(z.object({ modelId: z.string() }))
    .mutation(({ input }) => {
      const db = getDatabase()
      db.delete(models).where(eq(models.modelId, input.modelId)).run()
      return { success: true }
    }),

  /**
   * Update status for a specific provider
   */
  updateProviderStatus: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        providerId: z.string(),
        status: modelStatusSchema,
      })
    )
    .mutation(({ input }) => {
      const success = updateModelProviderStatus(
        input.modelId,
        input.providerId,
        input.status
      )
      return { success }
    }),

  /**
   * Add a provider to a model
   */
  addProvider: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        providerId: z.string(),
        status: modelStatusSchema.default("A"),
      })
    )
    .mutation(({ input }) => {
      const success = addProviderToModel(
        input.modelId,
        input.providerId,
        input.status
      )
      return { success }
    }),

  /**
   * Remove a provider from a model
   */
  removeProvider: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        providerId: z.string(),
      })
    )
    .mutation(({ input }) => {
      const success = removeProviderFromModel(input.modelId, input.providerId)
      return { success }
    }),

  /**
   * Get usage statistics for a model
   */
  getUsage: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        limit: z.number().int().positive().default(100),
      })
    )
    .query(({ input }) => {
      return getModelUsage(input.modelId, input.limit)
    }),

  /**
   * Set a model as default
   */
  setDefault: publicProcedure
    .input(z.object({ modelId: z.string() }))
    .mutation(({ input }) => {
      const db = getDatabase()

      // Clear existing default
      db.update(models).set({ isDefault: 0 }).run()

      // Set new default
      db.update(models)
        .set({ isDefault: 1, updatedAt: new Date() })
        .where(eq(models.modelId, input.modelId))
        .run()

      return { success: true }
    }),
})

// ============ HELPERS ============

export interface ProviderMapping {
  providerId: string
  status: "A" | "D" | "X"
}

function parseProviderMapping(
  providerIds: string,
  providerStatus: string
): ProviderMapping[] {
  const ids = providerIds.split(",").map((s) => s.trim())
  const statuses = providerStatus.split(",").map((s) => s.trim())

  return ids.map((providerId, i) => ({
    providerId,
    status: (statuses[i] || "X") as "A" | "D" | "X",
  }))
}
