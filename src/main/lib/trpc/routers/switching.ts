// #NP - Provider switching rules tRPC router
import { z } from "zod"
import { router, publicProcedure } from "../index"
import { getDatabase, providerSwitchingRules, providerCredentials, aiProviders } from "../../db"
import { eq, asc } from "drizzle-orm"
import { createId } from "../../db/utils"

// ============ VALIDATION SCHEMAS ============

// #P - Supported trigger types
const triggerConditionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("usage_exceeded"),
  }),
  z.object({
    type: z.literal("error_rate"),
    threshold: z.number().min(0).max(1),
    windowMinutes: z.number().int().positive().default(60),
  }),
  z.object({
    type: z.literal("cost_threshold"),
    maxCostPerDay: z.number().positive(),
  }),
  z.object({
    type: z.literal("model_unavailable"),
  }),
  z.object({
    type: z.literal("time_based"),
    schedule: z.object({
      start: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM
      end: z.string().regex(/^\d{2}:\d{2}$/),
      timezone: z.string().default("UTC"),
    }),
  }),
])

const actionTypeSchema = z.enum([
  "switch_credential",
  "switch_provider",
  "notify",
  "disable_model",
])

const createRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  triggerCondition: triggerConditionSchema,
  actionType: actionTypeSchema,
  targetCredentialId: z.string().optional(),
  targetProviderId: z.string().optional(),
  targetModelId: z.string().optional(),
  priority: z.number().int().min(0).default(0),
  isEnabled: z.boolean().default(true),
})

const updateRuleSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  triggerCondition: triggerConditionSchema.optional(),
  actionType: actionTypeSchema.optional(),
  targetCredentialId: z.string().optional().nullable(),
  targetProviderId: z.string().optional().nullable(),
  targetModelId: z.string().optional().nullable(),
  priority: z.number().int().min(0).optional(),
  isEnabled: z.boolean().optional(),
})

// ============ ROUTER ============

export const switchingRouter = router({
  /**
   * List all switching rules
   */
  list: publicProcedure.query(() => {
    const db = getDatabase()
    const rules = db
      .select()
      .from(providerSwitchingRules)
      .orderBy(asc(providerSwitchingRules.priority))
      .all()

    return rules.map((rule) => ({
      ...rule,
      triggerCondition: JSON.parse(rule.triggerCondition),
    }))
  }),

  /**
   * Get a single rule by ID
   */
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const db = getDatabase()
      const rule = db
        .select()
        .from(providerSwitchingRules)
        .where(eq(providerSwitchingRules.id, input.id))
        .get()

      if (!rule) return null

      return {
        ...rule,
        triggerCondition: JSON.parse(rule.triggerCondition),
      }
    }),

  /**
   * Create a new rule
   */
  create: publicProcedure
    .input(createRuleSchema)
    .mutation(({ input }) => {
      const db = getDatabase()

      // Validate target exists if specified
      if (input.targetCredentialId) {
        const credential = db
          .select()
          .from(providerCredentials)
          .where(eq(providerCredentials.id, input.targetCredentialId))
          .get()
        if (!credential) {
          throw new Error(`Target credential not found: ${input.targetCredentialId}`)
        }
      }

      if (input.targetProviderId) {
        const provider = db
          .select()
          .from(aiProviders)
          .where(eq(aiProviders.id, input.targetProviderId))
          .get()
        if (!provider) {
          throw new Error(`Target provider not found: ${input.targetProviderId}`)
        }
      }

      const id = createId()

      db.insert(providerSwitchingRules)
        .values({
          id,
          name: input.name,
          description: input.description,
          triggerCondition: JSON.stringify(input.triggerCondition),
          actionType: input.actionType,
          targetCredentialId: input.targetCredentialId,
          targetProviderId: input.targetProviderId,
          targetModelId: input.targetModelId,
          priority: input.priority,
          isEnabled: input.isEnabled ? 1 : 0,
          createdAt: new Date(),
        })
        .run()

      return { id }
    }),

  /**
   * Update a rule
   */
  update: publicProcedure
    .input(updateRuleSchema)
    .mutation(({ input }) => {
      const db = getDatabase()
      const { id, triggerCondition, isEnabled, ...rest } = input

      const updates: Record<string, unknown> = { ...rest }

      if (triggerCondition !== undefined) {
        updates.triggerCondition = JSON.stringify(triggerCondition)
      }

      if (isEnabled !== undefined) {
        updates.isEnabled = isEnabled ? 1 : 0
      }

      db.update(providerSwitchingRules)
        .set(updates)
        .where(eq(providerSwitchingRules.id, id))
        .run()

      return { success: true }
    }),

  /**
   * Delete a rule
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      const db = getDatabase()
      db.delete(providerSwitchingRules)
        .where(eq(providerSwitchingRules.id, input.id))
        .run()
      return { success: true }
    }),

  /**
   * Toggle rule enabled state
   */
  toggle: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      const db = getDatabase()
      const rule = db
        .select()
        .from(providerSwitchingRules)
        .where(eq(providerSwitchingRules.id, input.id))
        .get()

      if (!rule) {
        throw new Error(`Rule not found: ${input.id}`)
      }

      db.update(providerSwitchingRules)
        .set({ isEnabled: rule.isEnabled === 1 ? 0 : 1 })
        .where(eq(providerSwitchingRules.id, input.id))
        .run()

      return { success: true, isEnabled: rule.isEnabled !== 1 }
    }),

  /**
   * Reorder rules (update priorities)
   */
  reorder: publicProcedure
    .input(
      z.object({
        orderedIds: z.array(z.string()),
      })
    )
    .mutation(({ input }) => {
      const db = getDatabase()

      input.orderedIds.forEach((id, index) => {
        db.update(providerSwitchingRules)
          .set({ priority: index })
          .where(eq(providerSwitchingRules.id, id))
          .run()
      })

      return { success: true }
    }),

  /**
   * Test a rule (dry run)
   * Returns what would happen if the rule triggered now
   */
  test: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const db = getDatabase()
      const rule = db
        .select()
        .from(providerSwitchingRules)
        .where(eq(providerSwitchingRules.id, input.id))
        .get()

      if (!rule) {
        throw new Error(`Rule not found: ${input.id}`)
      }

      const triggerCondition = JSON.parse(rule.triggerCondition)

      // Build result based on action type
      const result: {
        rule: typeof rule & { triggerCondition: unknown }
        wouldTrigger: boolean
        reason: string
        action: {
          type: string
          target?: {
            id: string
            name: string
          }
        }
      } = {
        rule: {
          ...rule,
          triggerCondition,
        },
        wouldTrigger: false,
        reason: "Dry run - checking rule configuration",
        action: {
          type: rule.actionType,
        },
      }

      // Get target info if available
      if (rule.actionType === "switch_credential" && rule.targetCredentialId) {
        const credential = db
          .select()
          .from(providerCredentials)
          .where(eq(providerCredentials.id, rule.targetCredentialId))
          .get()
        if (credential) {
          result.action.target = {
            id: credential.id,
            name: credential.name,
          }
        }
      } else if (rule.actionType === "switch_provider" && rule.targetProviderId) {
        const provider = db
          .select()
          .from(aiProviders)
          .where(eq(aiProviders.id, rule.targetProviderId))
          .get()
        if (provider) {
          result.action.target = {
            id: provider.id,
            name: provider.name,
          }
        }
      }

      return result
    }),

  /**
   * Get enabled rules for evaluation
   */
  getEnabled: publicProcedure.query(() => {
    const db = getDatabase()
    const rules = db
      .select()
      .from(providerSwitchingRules)
      .where(eq(providerSwitchingRules.isEnabled, 1))
      .orderBy(asc(providerSwitchingRules.priority))
      .all()

    return rules.map((rule) => ({
      ...rule,
      triggerCondition: JSON.parse(rule.triggerCondition),
    }))
  }),
})
