/**
 * CCR tRPC Router
 *
 * Exposes CCR (Claude Code Router) functionality through tRPC.
 * Handles server management and proxies API calls.
 */

// #NP - CCR tRPC Router

import { z } from "zod"
import { router, publicProcedure } from "../index"
import {
  startServer,
  stopServer,
  restartServer,
  getServerStatus,
  checkHealth,
  isCCRAvailable,
  createCCRApiClient,
  type CCRProvider,
} from "../../integrations/ccr"

// ============ SCHEMAS ============

const providerSchema = z.object({
  name: z.string().min(1),
  api_base_url: z.string().url(),
  api_key: z.string(),
  models: z.array(z.string()),
  transformer: z
    .object({
      use: z.array(z.union([z.string(), z.tuple([z.string(), z.record(z.unknown())])])),
    })
    .passthrough()
    .optional(),
})

const routerConfigSchema = z.object({
  default: z.string(),
  background: z.string(),
  think: z.string(),
  longContext: z.string(),
  longContextThreshold: z.number(),
  webSearch: z.string(),
  image: z.string(),
})

// ============ ROUTER ============

export const ccrRouter = router({
  // ============ SERVER MANAGEMENT ============

  /**
   * Get CCR server status
   */
  status: publicProcedure.query(() => {
    return {
      available: isCCRAvailable(),
      ...getServerStatus(),
    }
  }),

  /**
   * Start CCR server
   */
  start: publicProcedure
    .input(z.object({ port: z.number().optional() }).optional())
    .mutation(async ({ input }) => {
      return startServer(input ? { port: input.port, autoStart: true } : undefined)
    }),

  /**
   * Stop CCR server
   */
  stop: publicProcedure.mutation(async () => {
    return stopServer()
  }),

  /**
   * Restart CCR server
   */
  restart: publicProcedure
    .input(z.object({ port: z.number().optional() }).optional())
    .mutation(async ({ input }) => {
      return restartServer(input ? { port: input.port, autoStart: true } : undefined)
    }),

  /**
   * Check CCR server health
   */
  health: publicProcedure.query(async () => {
    const client = createCCRApiClient()
    if (!client) {
      return { status: "offline" as const, available: isCCRAvailable() }
    }
    const health = await client.checkHealth()
    return { ...health, available: true }
  }),

  // ============ CONFIG ============

  /**
   * Get full CCR configuration
   */
  getConfig: publicProcedure.query(async () => {
    const client = createCCRApiClient()
    if (!client) throw new Error("CCR server not running")
    return client.getConfig()
  }),

  /**
   * Save CCR configuration
   */
  saveConfig: publicProcedure
    .input(z.object({
      Providers: z.array(providerSchema),
      Router: routerConfigSchema,
      transformers: z.array(z.object({
        name: z.string(),
        description: z.string().optional(),
        path: z.string().optional(),
      })).optional(),
    }).passthrough())
    .mutation(async ({ input }) => {
      const client = createCCRApiClient()
      if (!client) throw new Error("CCR server not running")
      return client.saveConfig(input as any)
    }),

  /**
   * Restart CCR service (reload config)
   */
  restartService: publicProcedure.mutation(async () => {
    const client = createCCRApiClient()
    if (!client) throw new Error("CCR server not running")
    await client.restartService()
    return { success: true }
  }),

  // ============ PROVIDERS ============

  providers: router({
    /**
     * List all CCR providers
     */
    list: publicProcedure.query(async () => {
      const client = createCCRApiClient()
      if (!client) throw new Error("CCR server not running")
      return client.getProviders()
    }),

    /**
     * Add a new provider
     */
    add: publicProcedure.input(providerSchema).mutation(async ({ input }) => {
      const client = createCCRApiClient()
      if (!client) throw new Error("CCR server not running")
      await client.addProvider(input as CCRProvider)
      return { success: true }
    }),

    /**
     * Update a provider
     */
    update: publicProcedure
      .input(z.object({ index: z.number(), provider: providerSchema }))
      .mutation(async ({ input }) => {
        const client = createCCRApiClient()
        if (!client) throw new Error("CCR server not running")
        await client.updateProvider(input.index, input.provider as CCRProvider)
        return { success: true }
      }),

    /**
     * Delete a provider
     */
    delete: publicProcedure
      .input(z.object({ index: z.number() }))
      .mutation(async ({ input }) => {
        const client = createCCRApiClient()
        if (!client) throw new Error("CCR server not running")
        await client.deleteProvider(input.index)
        return { success: true }
      }),
  }),

  // ============ ROUTER CONFIG ============

  router: router({
    /**
     * Get router configuration
     */
    get: publicProcedure.query(async () => {
      const client = createCCRApiClient()
      if (!client) throw new Error("CCR server not running")
      return client.getRouter()
    }),

    /**
     * Update router configuration
     */
    update: publicProcedure.input(routerConfigSchema).mutation(async ({ input }) => {
      const client = createCCRApiClient()
      if (!client) throw new Error("CCR server not running")
      await client.updateRouter(input)
      return { success: true }
    }),
  }),

  // ============ TRANSFORMERS ============

  /**
   * List available transformers
   */
  transformers: publicProcedure.query(async () => {
    const client = createCCRApiClient()
    if (!client) throw new Error("CCR server not running")
    return client.getTransformers()
  }),

  // ============ PRESETS ============

  presets: router({
    /**
     * List installed presets
     */
    list: publicProcedure.query(async () => {
      const client = createCCRApiClient()
      if (!client) throw new Error("CCR server not running")
      return client.getPresets()
    }),

    /**
     * Get preset details
     */
    get: publicProcedure
      .input(z.object({ name: z.string() }))
      .query(async ({ input }) => {
        const client = createCCRApiClient()
        if (!client) throw new Error("CCR server not running")
        return client.getPreset(input.name)
      }),

    /**
     * Install preset from URL
     */
    install: publicProcedure
      .input(z.object({ url: z.string().url(), name: z.string().optional() }))
      .mutation(async ({ input }) => {
        const client = createCCRApiClient()
        if (!client) throw new Error("CCR server not running")
        return client.installPreset(input.url, input.name)
      }),

    /**
     * Apply preset with secrets
     */
    applyPreset: publicProcedure
      .input(z.object({ name: z.string(), secrets: z.record(z.string()) }))
      .mutation(async ({ input }) => {
        const client = createCCRApiClient()
        if (!client) throw new Error("CCR server not running")
        await client.applyPreset(input.name, input.secrets)
        return { success: true }
      }),

    /**
     * Delete preset
     */
    delete: publicProcedure
      .input(z.object({ name: z.string() }))
      .mutation(async ({ input }) => {
        const client = createCCRApiClient()
        if (!client) throw new Error("CCR server not running")
        await client.deletePreset(input.name)
        return { success: true }
      }),
  }),

  // ============ LOGS ============

  logs: router({
    /**
     * List log files
     */
    files: publicProcedure.query(async () => {
      const client = createCCRApiClient()
      if (!client) throw new Error("CCR server not running")
      return client.getLogFiles()
    }),

    /**
     * Get logs from file
     */
    get: publicProcedure
      .input(z.object({ filePath: z.string() }))
      .query(async ({ input }) => {
        const client = createCCRApiClient()
        if (!client) throw new Error("CCR server not running")
        return client.getLogs(input.filePath)
      }),

    /**
     * Clear logs
     */
    clear: publicProcedure
      .input(z.object({ filePath: z.string() }))
      .mutation(async ({ input }) => {
        const client = createCCRApiClient()
        if (!client) throw new Error("CCR server not running")
        await client.clearLogs(input.filePath)
        return { success: true }
      }),
  }),

  // ============ UPDATES ============

  /**
   * Check for CCR updates
   */
  checkUpdates: publicProcedure.query(async () => {
    const client = createCCRApiClient()
    if (!client) throw new Error("CCR server not running")
    return client.checkForUpdates()
  }),
})
