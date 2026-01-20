import { z } from "zod"
import { router, publicProcedure } from "../index"
import { getDatabase, taskRouting, aiProviders } from "../../db"
import { eq } from "drizzle-orm"
import { createId } from "../../db/utils"

// Default subagent types that can be routed
export const ROUTABLE_AGENT_TYPES = [
  "Explore",
  "Plan",
  "Bash",
  "general-purpose",
  "code-reviewer",
  "code-archaeologist",
  "documentation-specialist",
  "performance-optimizer",
] as const

// ============ VALIDATION SCHEMAS ============

const setRoutingSchema = z.object({
  agentType: z.string().min(1),
  providerId: z.string().nullable(), // null = use primary
})

const bulkSetRoutingSchema = z.object({
  routings: z.array(setRoutingSchema),
})

// ============ ROUTER ============

export const routingRouter = router({
  /**
   * List all routing configurations
   */
  list: publicProcedure.query(() => {
    const db = getDatabase()

    // Get all routings with provider info
    const routings = db
      .select({
        id: taskRouting.id,
        agentType: taskRouting.agentType,
        providerId: taskRouting.providerId,
        isEnabled: taskRouting.isEnabled,
        providerName: aiProviders.name,
        providerType: aiProviders.type,
      })
      .from(taskRouting)
      .leftJoin(aiProviders, eq(taskRouting.providerId, aiProviders.id))
      .all()

    return routings
  }),

  /**
   * Get routing for a specific agent type
   */
  getForAgent: publicProcedure
    .input(z.object({ agentType: z.string() }))
    .query(({ input }) => {
      const db = getDatabase()

      const routing = db
        .select({
          id: taskRouting.id,
          agentType: taskRouting.agentType,
          providerId: taskRouting.providerId,
          isEnabled: taskRouting.isEnabled,
          providerName: aiProviders.name,
          providerType: aiProviders.type,
          providerBaseUrl: aiProviders.baseUrl,
        })
        .from(taskRouting)
        .leftJoin(aiProviders, eq(taskRouting.providerId, aiProviders.id))
        .where(eq(taskRouting.agentType, input.agentType))
        .get()

      return routing ?? null
    }),

  /**
   * Set routing for an agent type
   */
  set: publicProcedure
    .input(setRoutingSchema)
    .mutation(({ input }) => {
      const db = getDatabase()

      // If providerId is set, verify provider exists
      if (input.providerId) {
        const provider = db
          .select()
          .from(aiProviders)
          .where(eq(aiProviders.id, input.providerId))
          .get()

        if (!provider) {
          throw new Error("Provider not found")
        }
      }

      // Check if routing already exists
      const existing = db
        .select()
        .from(taskRouting)
        .where(eq(taskRouting.agentType, input.agentType))
        .get()

      if (existing) {
        // Update existing
        db.update(taskRouting)
          .set({ providerId: input.providerId })
          .where(eq(taskRouting.agentType, input.agentType))
          .run()
      } else {
        // Create new
        db.insert(taskRouting)
          .values({
            id: createId(),
            agentType: input.agentType,
            providerId: input.providerId,
            isEnabled: 1,
            createdAt: new Date(),
          })
          .run()
      }

      return { success: true }
    }),

  /**
   * Bulk set routings
   */
  bulkSet: publicProcedure
    .input(bulkSetRoutingSchema)
    .mutation(({ input }) => {
      const db = getDatabase()

      for (const routing of input.routings) {
        // Check if routing already exists
        const existing = db
          .select()
          .from(taskRouting)
          .where(eq(taskRouting.agentType, routing.agentType))
          .get()

        if (existing) {
          db.update(taskRouting)
            .set({ providerId: routing.providerId })
            .where(eq(taskRouting.agentType, routing.agentType))
            .run()
        } else {
          db.insert(taskRouting)
            .values({
              id: createId(),
              agentType: routing.agentType,
              providerId: routing.providerId,
              isEnabled: 1,
              createdAt: new Date(),
            })
            .run()
        }
      }

      return { success: true }
    }),

  /**
   * Enable/disable routing for an agent type
   */
  setEnabled: publicProcedure
    .input(z.object({
      agentType: z.string(),
      isEnabled: z.boolean(),
    }))
    .mutation(({ input }) => {
      const db = getDatabase()

      db.update(taskRouting)
        .set({ isEnabled: input.isEnabled ? 1 : 0 })
        .where(eq(taskRouting.agentType, input.agentType))
        .run()

      return { success: true }
    }),

  /**
   * Delete routing for an agent type (reset to primary)
   */
  delete: publicProcedure
    .input(z.object({ agentType: z.string() }))
    .mutation(({ input }) => {
      const db = getDatabase()

      db.delete(taskRouting)
        .where(eq(taskRouting.agentType, input.agentType))
        .run()

      return { success: true }
    }),

  /**
   * Get list of routable agent types
   */
  getAgentTypes: publicProcedure.query(() => {
    return ROUTABLE_AGENT_TYPES
  }),
})
