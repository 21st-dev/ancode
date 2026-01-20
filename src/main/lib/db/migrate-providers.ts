import { eq } from "drizzle-orm"
import { getDatabase, aiProviders, claudeCodeCredentials } from "./index"
import { createId } from "./utils"

/**
 * Migrate existing OAuth credentials to the new providers system
 * Called on app startup after database migrations
 */
export function migrateProviders(): void {
  const db = getDatabase()

  // Check if we already have providers
  const existingProviders = db.select().from(aiProviders).all()

  if (existingProviders.length > 0) {
    console.log("[MigrateProviders] Providers already exist, skipping migration")
    return
  }

  // Check if user has OAuth credentials
  const oauthCred = db
    .select()
    .from(claudeCodeCredentials)
    .where(eq(claudeCodeCredentials.id, "default"))
    .get()

  if (oauthCred?.oauthToken) {
    // Create Anthropic OAuth provider as primary and builtin
    const id = createId()
    db.insert(aiProviders)
      .values({
        id,
        name: "Anthropic (OAuth)",
        type: "anthropic_oauth",
        role: "primary",
        isBuiltin: 1,
        apiKey: null, // OAuth uses credentials table
        baseUrl: null,
        createdAt: new Date(),
      })
      .run()

    console.log("[MigrateProviders] Created Anthropic OAuth provider as primary")
  } else {
    console.log("[MigrateProviders] No OAuth credentials found, skipping provider creation")
  }
}
