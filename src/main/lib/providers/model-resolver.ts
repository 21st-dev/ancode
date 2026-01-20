// #P - Universal model resolver
// Resolves which provider to use for a given model
import { eq } from "drizzle-orm"
import { getDatabase, models, aiProviders } from "../db"
import type { Model, AiProvider } from "../db/schema"
import { resolveCredential, type ResolvedCredential } from "./credential-resolver"

// ============ TYPES ============

export interface ModelResolution {
  model: Model
  provider: AiProvider
  credential: ResolvedCredential
  providerIndex: number // Index in the provider_ids array
}

export interface ModelResolutionContext {
  agentType?: string
  chatId?: string
  subChatId?: string
}

// ============ MODEL RESOLUTION ============

/**
 * Resolve a model to its provider and credential
 * Respects provider status (A/D/X) and preferred provider if specified
 */
export async function resolveModel(
  modelId: string,
  preferredProviderId?: string,
  context?: ModelResolutionContext
): Promise<ModelResolution | null> {
  const db = getDatabase()

  // 1. Find the model
  const model = db
    .select()
    .from(models)
    .where(eq(models.modelId, modelId))
    .get()

  if (!model) {
    console.log(`[ModelResolver] Model not found: ${modelId}`)
    return null
  }

  // 2. Parse provider availability
  const providerIds = model.providerIds.split(",").map((s) => s.trim())
  const statuses = model.providerStatus.split(",").map((s) => s.trim())

  // 3. Build list of active providers for this model
  const activeProviders: { providerId: string; index: number }[] = []
  for (let i = 0; i < providerIds.length; i++) {
    if (statuses[i] === "A") {
      activeProviders.push({ providerId: providerIds[i], index: i })
    }
  }

  if (activeProviders.length === 0) {
    console.log(`[ModelResolver] No active providers for model: ${modelId}`)
    return null
  }

  // 4. Prefer specified provider if available
  let selectedEntry = activeProviders[0]
  if (preferredProviderId) {
    const preferred = activeProviders.find((p) => p.providerId === preferredProviderId)
    if (preferred) {
      selectedEntry = preferred
    }
  }

  // 5. Get provider details
  const provider = db
    .select()
    .from(aiProviders)
    .where(eq(aiProviders.id, selectedEntry.providerId))
    .get()

  if (!provider) {
    console.log(`[ModelResolver] Provider not found: ${selectedEntry.providerId}`)
    return null
  }

  // 6. Resolve credential for this provider
  const credential = await resolveCredential(selectedEntry.providerId, context)
  if (!credential) {
    console.log(`[ModelResolver] No credential for provider: ${selectedEntry.providerId}`)
    return null
  }

  return {
    model,
    provider,
    credential,
    providerIndex: selectedEntry.index,
  }
}

/**
 * Get all models available for a specific provider
 */
export function getModelsForProvider(providerId: string): Model[] {
  const db = getDatabase()
  const allModels = db.select().from(models).all()

  return allModels.filter((m) => {
    const providerIds = m.providerIds.split(",").map((s) => s.trim())
    const statuses = m.providerStatus.split(",").map((s) => s.trim())
    const idx = providerIds.indexOf(providerId)
    return idx !== -1 && statuses[idx] === "A"
  })
}

/**
 * Get all active providers for a specific model
 */
export function getProvidersForModel(modelId: string): AiProvider[] {
  const db = getDatabase()

  const model = db
    .select()
    .from(models)
    .where(eq(models.modelId, modelId))
    .get()

  if (!model) return []

  const providerIds = model.providerIds.split(",").map((s) => s.trim())
  const statuses = model.providerStatus.split(",").map((s) => s.trim())

  const activeProviderIds: string[] = []
  for (let i = 0; i < providerIds.length; i++) {
    if (statuses[i] === "A") {
      activeProviderIds.push(providerIds[i])
    }
  }

  if (activeProviderIds.length === 0) return []

  return db
    .select()
    .from(aiProviders)
    .all()
    .filter((p) => activeProviderIds.includes(p.id))
}

// ============ MODEL STATUS UPDATES ============

/**
 * Update the status of a model for a specific provider
 */
export function updateModelProviderStatus(
  modelId: string,
  providerId: string,
  status: "A" | "D" | "X"
): boolean {
  const db = getDatabase()

  const model = db
    .select()
    .from(models)
    .where(eq(models.modelId, modelId))
    .get()

  if (!model) return false

  const providerIds = model.providerIds.split(",").map((s) => s.trim())
  const statuses = model.providerStatus.split(",").map((s) => s.trim())
  const idx = providerIds.indexOf(providerId)

  if (idx === -1) return false

  statuses[idx] = status

  db.update(models)
    .set({
      providerStatus: statuses.join(","),
      updatedAt: new Date(),
    })
    .where(eq(models.modelId, modelId))
    .run()

  return true
}

/**
 * Add a provider to a model
 */
export function addProviderToModel(
  modelId: string,
  providerId: string,
  status: "A" | "D" | "X" = "A"
): boolean {
  const db = getDatabase()

  const model = db
    .select()
    .from(models)
    .where(eq(models.modelId, modelId))
    .get()

  if (!model) return false

  const providerIds = model.providerIds.split(",").map((s) => s.trim())
  const statuses = model.providerStatus.split(",").map((s) => s.trim())

  // Check if already exists
  if (providerIds.includes(providerId)) {
    return updateModelProviderStatus(modelId, providerId, status)
  }

  providerIds.push(providerId)
  statuses.push(status)

  db.update(models)
    .set({
      providerIds: providerIds.join(","),
      providerStatus: statuses.join(","),
      updatedAt: new Date(),
    })
    .where(eq(models.modelId, modelId))
    .run()

  return true
}

/**
 * Remove a provider from a model
 */
export function removeProviderFromModel(modelId: string, providerId: string): boolean {
  const db = getDatabase()

  const model = db
    .select()
    .from(models)
    .where(eq(models.modelId, modelId))
    .get()

  if (!model) return false

  const providerIds = model.providerIds.split(",").map((s) => s.trim())
  const statuses = model.providerStatus.split(",").map((s) => s.trim())
  const idx = providerIds.indexOf(providerId)

  if (idx === -1) return false

  // Don't remove if it's the only provider
  if (providerIds.length === 1) {
    console.warn(`[ModelResolver] Cannot remove last provider from model: ${modelId}`)
    return false
  }

  providerIds.splice(idx, 1)
  statuses.splice(idx, 1)

  db.update(models)
    .set({
      providerIds: providerIds.join(","),
      providerStatus: statuses.join(","),
      updatedAt: new Date(),
    })
    .where(eq(models.modelId, modelId))
    .run()

  return true
}
