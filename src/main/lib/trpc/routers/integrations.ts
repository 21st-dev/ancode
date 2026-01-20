// #NP - Integrations tRPC router for external tool management
import { z } from "zod"
import { router, publicProcedure } from "../index"
import {
  getIntegrationConfig,
  setIntegrationConfig,
  getAllIntegrationConfigs,
  externalToolExists,
  externalToolPaths,
  defaultConfigs,
  type IntegrationType,
  type IntegrationConfig,
} from "../../integrations"

// ============ VALIDATION SCHEMAS ============

const integrationTypeSchema = z.enum(["router", "auth", "memory", "proxy"])

const updateConfigSchema = z.object({
  type: integrationTypeSchema,
  enabled: z.boolean().optional(),
  useExternal: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
})

// ============ ROUTER ============

export const integrationsRouter = router({
  /**
   * List all integrations with their configurations
   */
  list: publicProcedure.query(() => {
    const configs = getAllIntegrationConfigs()
    const types: IntegrationType[] = ["router", "auth", "memory", "proxy"]

    return types.map((type) => ({
      type,
      ...configs[type],
      externalToolPath: externalToolPaths[type],
      externalToolExists: externalToolExists(type),
      defaults: defaultConfigs[type],
    }))
  }),

  /**
   * Get a single integration configuration
   */
  get: publicProcedure
    .input(z.object({ type: integrationTypeSchema }))
    .query(({ input }) => {
      const config = getIntegrationConfig(input.type)
      return {
        type: input.type,
        ...config,
        externalToolPath: externalToolPaths[input.type],
        externalToolExists: externalToolExists(input.type),
        defaults: defaultConfigs[input.type],
      }
    }),

  /**
   * Update an integration configuration
   */
  update: publicProcedure
    .input(updateConfigSchema)
    .mutation(({ input }) => {
      const { type, ...config } = input
      setIntegrationConfig(type, config)
      return { success: true }
    }),

  /**
   * Toggle an integration enabled state
   */
  toggleEnabled: publicProcedure
    .input(z.object({ type: integrationTypeSchema }))
    .mutation(({ input }) => {
      const current = getIntegrationConfig(input.type)
      setIntegrationConfig(input.type, { enabled: !current.enabled })
      return { success: true, enabled: !current.enabled }
    }),

  /**
   * Toggle between external tool and built-in implementation
   */
  toggleExternal: publicProcedure
    .input(z.object({ type: integrationTypeSchema }))
    .mutation(({ input }) => {
      const current = getIntegrationConfig(input.type)
      const hasExternal = externalToolExists(input.type)

      // Only allow switching to external if the tool exists
      if (!current.useExternal && !hasExternal) {
        throw new Error(
          `External tool not found for ${input.type}. Path: ${externalToolPaths[input.type]}`
        )
      }

      setIntegrationConfig(input.type, { useExternal: !current.useExternal })
      return { success: true, useExternal: !current.useExternal }
    }),

  /**
   * Check external tool availability for all integrations
   */
  checkExternalTools: publicProcedure.query(() => {
    const types: IntegrationType[] = ["router", "auth", "memory", "proxy"]
    return types.map((type) => ({
      type,
      path: externalToolPaths[type],
      exists: externalToolExists(type),
    }))
  }),

  /**
   * Reset an integration to default configuration
   */
  resetToDefault: publicProcedure
    .input(z.object({ type: integrationTypeSchema }))
    .mutation(({ input }) => {
      const defaults = defaultConfigs[input.type]
      setIntegrationConfig(input.type, defaults)
      return { success: true, config: defaults }
    }),
})
