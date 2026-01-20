/**
 * CCS tRPC Router
 *
 * Exposes CCS (Claude Code Switch) functionality through tRPC.
 * Handles server management and proxies API calls.
 */

// #NP - CCS tRPC Router

import { z } from "zod"
import { router, publicProcedure } from "../index"
import {
  startServer,
  stopServer,
  restartServer,
  getServerStatus,
  checkHealth,
  isCCSAvailable,
  createCCSApiClient,
} from "../../integrations/ccs"

// ============ SCHEMAS ============

const createProfileSchema = z.object({
  name: z.string().min(1).max(50),
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  model: z.string().optional(),
  opusModel: z.string().optional(),
  sonnetModel: z.string().optional(),
  haikuModel: z.string().optional(),
})

const updateProfileSchema = z.object({
  name: z.string(),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  opusModel: z.string().optional(),
  sonnetModel: z.string().optional(),
  haikuModel: z.string().optional(),
})

const createPresetSchema = z.object({
  profile: z.string(),
  name: z.string().min(1),
  default: z.string().min(1),
  opus: z.string().optional(),
  sonnet: z.string().optional(),
  haiku: z.string().optional(),
})

// ============ ROUTER ============

export const ccsRouter = router({
  // ============ SERVER MANAGEMENT ============

  /**
   * Get CCS server status
   */
  status: publicProcedure.query(() => {
    return {
      available: isCCSAvailable(),
      ...getServerStatus(),
    }
  }),

  /**
   * Start CCS server
   */
  start: publicProcedure
    .input(z.object({ port: z.number().optional() }).optional())
    .mutation(async ({ input }) => {
      return startServer(input ? { port: input.port, autoStart: true } : undefined)
    }),

  /**
   * Stop CCS server
   */
  stop: publicProcedure.mutation(async () => {
    return stopServer()
  }),

  /**
   * Restart CCS server
   */
  restart: publicProcedure
    .input(z.object({ port: z.number().optional() }).optional())
    .mutation(async ({ input }) => {
      return restartServer(input ? { port: input.port, autoStart: true } : undefined)
    }),

  /**
   * Check CCS server health
   */
  health: publicProcedure.query(async () => {
    const client = createCCSApiClient()
    if (!client) {
      return { status: "offline" as const, available: isCCSAvailable() }
    }
    const health = await client.checkHealth()
    return { ...health, available: true }
  }),

  // ============ PROFILES ============

  /**
   * List all CCS profiles
   */
  profiles: router({
    list: publicProcedure.query(async () => {
      const client = createCCSApiClient()
      if (!client) throw new Error("CCS server not running")
      return client.listProfiles()
    }),

    create: publicProcedure.input(createProfileSchema).mutation(async ({ input }) => {
      const client = createCCSApiClient()
      if (!client) throw new Error("CCS server not running")
      await client.createProfile(input)
      return { success: true }
    }),

    update: publicProcedure.input(updateProfileSchema).mutation(async ({ input }) => {
      const client = createCCSApiClient()
      if (!client) throw new Error("CCS server not running")
      const { name, ...updates } = input
      await client.updateProfile(name, updates)
      return { success: true }
    }),

    delete: publicProcedure.input(z.object({ name: z.string() })).mutation(async ({ input }) => {
      const client = createCCSApiClient()
      if (!client) throw new Error("CCS server not running")
      await client.deleteProfile(input.name)
      return { success: true }
    }),
  }),

  // ============ PRESETS ============

  /**
   * Provider presets (templates for creating profiles)
   */
  providerPresets: publicProcedure.query(async () => {
    const client = createCCSApiClient()
    if (!client) throw new Error("CCS server not running")
    return client.getProviderPresets()
  }),

  /**
   * Model presets for a profile
   */
  modelPresets: router({
    list: publicProcedure
      .input(z.object({ profile: z.string() }))
      .query(async ({ input }) => {
        const client = createCCSApiClient()
        if (!client) throw new Error("CCS server not running")
        return client.listModelPresets(input.profile)
      }),

    create: publicProcedure.input(createPresetSchema).mutation(async ({ input }) => {
      const client = createCCSApiClient()
      if (!client) throw new Error("CCS server not running")
      const { profile, ...preset } = input
      return client.createModelPreset(profile, preset)
    }),

    delete: publicProcedure
      .input(z.object({ profile: z.string(), name: z.string() }))
      .mutation(async ({ input }) => {
        const client = createCCSApiClient()
        if (!client) throw new Error("CCS server not running")
        await client.deleteModelPreset(input.profile, input.name)
        return { success: true }
      }),
  }),

  // ============ OAUTH (CLIPROXY) ============

  /**
   * OAuth provider management
   */
  oauth: router({
    /**
     * List OAuth variants
     */
    variants: publicProcedure.query(async () => {
      const client = createCCSApiClient()
      if (!client) throw new Error("CCS server not running")
      return client.listVariants()
    }),

    /**
     * Get OAuth auth status for all providers
     */
    authStatus: publicProcedure.query(async () => {
      const client = createCCSApiClient()
      if (!client) throw new Error("CCS server not running")
      return client.getAuthStatus()
    }),

    /**
     * List OAuth accounts by provider
     */
    accounts: publicProcedure.query(async () => {
      const client = createCCSApiClient()
      if (!client) throw new Error("CCS server not running")
      return client.listOAuthAccounts()
    }),

    /**
     * Start OAuth flow for a provider
     */
    startAuth: publicProcedure
      .input(z.object({ provider: z.string(), nickname: z.string().optional() }))
      .mutation(async ({ input }) => {
        const client = createCCSApiClient()
        if (!client) throw new Error("CCS server not running")
        return client.startOAuthFlow(input.provider, input.nickname)
      }),
  }),
})
