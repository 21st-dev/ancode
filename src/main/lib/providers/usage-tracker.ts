// #NP - Usage tracking for API requests
import { eq, and, gte, desc } from "drizzle-orm"
import { getDatabase, usageLogs, providerCredentials } from "../db"
import { createId } from "../db/utils"
import type { Model, AiProvider, ProviderCredential, UsageLog } from "../db/schema"

// ============ TYPES ============

export interface UsageMetrics {
  requestTokens: number
  responseTokens: number
  requestTimeMs: number
  chatId?: string
  subChatId?: string
  agentType?: string
}

export interface DebugPayloads {
  request?: unknown
  response?: unknown
}

export interface UsageSummary {
  totalRequests: number
  totalTokens: number
  totalCost: number
  averageLatencyMs: number
}

// ============ USAGE TRACKING ============

/**
 * Track API usage for a request
 */
export async function trackUsage(
  credential: ProviderCredential,
  provider: AiProvider,
  model: Model,
  metrics: UsageMetrics,
  debugMode: boolean = false,
  debugPayloads?: DebugPayloads
): Promise<void> {
  const db = getDatabase()

  // Calculate estimated cost
  const totalTokens = metrics.requestTokens + metrics.responseTokens
  const estimatedCost =
    model.pricingInputPerMtok && model.pricingOutputPerMtok
      ? (metrics.requestTokens * model.pricingInputPerMtok) / 1_000_000 +
        (metrics.responseTokens * model.pricingOutputPerMtok) / 1_000_000
      : null

  // Insert usage log
  db.insert(usageLogs)
    .values({
      id: createId(),
      credentialId: credential.id,
      providerId: provider.id,
      modelId: model.modelId,
      requestTokens: metrics.requestTokens,
      responseTokens: metrics.responseTokens,
      totalTokens,
      requestTimeMs: metrics.requestTimeMs,
      estimatedCost,
      chatId: metrics.chatId,
      subChatId: metrics.subChatId,
      agentType: metrics.agentType,
      // #P - Debug payloads only when explicitly enabled
      requestPayload: debugMode && debugPayloads?.request
        ? JSON.stringify(debugPayloads.request)
        : null,
      responsePayload: debugMode && debugPayloads?.response
        ? JSON.stringify(debugPayloads.response)
        : null,
      createdAt: new Date(),
    })
    .run()

  // Update credential usage counter
  db.update(providerCredentials)
    .set({
      currentUsage: credential.currentUsage + totalTokens,
      updatedAt: new Date(),
    })
    .where(eq(providerCredentials.id, credential.id))
    .run()
}

// ============ USAGE QUERIES ============

/**
 * Get usage logs for a credential
 */
export function getCredentialUsage(
  credentialId: string,
  limit: number = 100
): UsageLog[] {
  const db = getDatabase()
  return db
    .select()
    .from(usageLogs)
    .where(eq(usageLogs.credentialId, credentialId))
    .orderBy(desc(usageLogs.createdAt))
    .limit(limit)
    .all()
}

/**
 * Get usage logs for a provider
 */
export function getProviderUsage(
  providerId: string,
  limit: number = 100
): UsageLog[] {
  const db = getDatabase()
  return db
    .select()
    .from(usageLogs)
    .where(eq(usageLogs.providerId, providerId))
    .orderBy(desc(usageLogs.createdAt))
    .limit(limit)
    .all()
}

/**
 * Get usage logs for a model
 */
export function getModelUsage(modelId: string, limit: number = 100): UsageLog[] {
  const db = getDatabase()
  return db
    .select()
    .from(usageLogs)
    .where(eq(usageLogs.modelId, modelId))
    .orderBy(desc(usageLogs.createdAt))
    .limit(limit)
    .all()
}

/**
 * Get usage summary for a credential
 */
export function getCredentialUsageSummary(
  credentialId: string,
  sinceTimestamp?: number
): UsageSummary {
  const db = getDatabase()

  let query = db
    .select()
    .from(usageLogs)
    .where(eq(usageLogs.credentialId, credentialId))

  if (sinceTimestamp) {
    query = db
      .select()
      .from(usageLogs)
      .where(
        and(
          eq(usageLogs.credentialId, credentialId),
          gte(usageLogs.createdAt, new Date(sinceTimestamp))
        )
      )
  }

  const logs = query.all()

  if (logs.length === 0) {
    return {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      averageLatencyMs: 0,
    }
  }

  const totalTokens = logs.reduce((sum, log) => sum + (log.totalTokens || 0), 0)
  const totalCost = logs.reduce((sum, log) => sum + (log.estimatedCost || 0), 0)
  const totalLatency = logs.reduce((sum, log) => sum + (log.requestTimeMs || 0), 0)

  return {
    totalRequests: logs.length,
    totalTokens,
    totalCost,
    averageLatencyMs: Math.round(totalLatency / logs.length),
  }
}

/**
 * Get usage summary for a provider
 */
export function getProviderUsageSummary(
  providerId: string,
  sinceTimestamp?: number
): UsageSummary {
  const db = getDatabase()

  let query = db
    .select()
    .from(usageLogs)
    .where(eq(usageLogs.providerId, providerId))

  if (sinceTimestamp) {
    query = db
      .select()
      .from(usageLogs)
      .where(
        and(
          eq(usageLogs.providerId, providerId),
          gte(usageLogs.createdAt, new Date(sinceTimestamp))
        )
      )
  }

  const logs = query.all()

  if (logs.length === 0) {
    return {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      averageLatencyMs: 0,
    }
  }

  const totalTokens = logs.reduce((sum, log) => sum + (log.totalTokens || 0), 0)
  const totalCost = logs.reduce((sum, log) => sum + (log.estimatedCost || 0), 0)
  const totalLatency = logs.reduce((sum, log) => sum + (log.requestTimeMs || 0), 0)

  return {
    totalRequests: logs.length,
    totalTokens,
    totalCost,
    averageLatencyMs: Math.round(totalLatency / logs.length),
  }
}

// ============ CLEANUP ============

/**
 * Delete old usage logs (for privacy/storage)
 */
export function cleanupOldUsageLogs(olderThanDays: number = 30): number {
  const db = getDatabase()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - olderThanDays)

  const result = db
    .delete(usageLogs)
    .where(gte(usageLogs.createdAt, cutoff))
    .run()

  return result.changes
}
