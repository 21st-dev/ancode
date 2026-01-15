import simpleGit, { CleanOptions } from "simple-git"

/**
 * Create a git stash snapshot for rollback support
 * Stashes all changes including untracked files with the UUID as the message
 * If there are no changes, no stash is created (this is fine)
 */
export async function createRollbackStash(cwd: string, sdkMessageUuid: string): Promise<void> {
  try {
    const git = simpleGit(cwd)
    // Check if there are any changes to stash
    const status = await git.status()
    if (status.files.length === 0) {
      // No changes to stash - this is fine, just skip
      return
    }
    // Stash all changes including untracked files, with UUID as name
    await git.stash(["push", "-u", "-m", sdkMessageUuid])
    // Apply (not pop) to restore working state while keeping stash saved
    // Use --index to preserve staged/unstaged state
    await git.stash(["apply", "--index"])
  } catch (e) {
    console.error("[claude] Failed to create rollback stash:", e)
  }
}

export async function applyRollbackStash(
  worktreePath: string,
  sdkMessageUuid: string,
) {
  try {
    const git = simpleGit(worktreePath)

    // Find stash index by UUID in stash list
    const stashList = await git.stashList()
    let stashIndex: number | null = null
    for (let i = 0; i < stashList.all.length; i++) {
      if (stashList.all[i].message.includes(sdkMessageUuid)) {
        stashIndex = i
        break
      }
    }

    if (stashIndex === null) {
      console.warn(
        `[claude] Rollback stash not found for sdkMessageUuid=${sdkMessageUuid}`,
      )
      return true // This is fine, just skip
    }

    // Reset working directory only after confirming stash exists.
    await git.reset(["--hard", "HEAD"])
    await git.clean(CleanOptions.FORCE + CleanOptions.RECURSIVE)

    await git.stash(["apply", "--index", `stash@{${stashIndex}}`])
    return true
  } catch (e) {
    console.error("[claude] Failed to apply rollback stash:", e)
    return false
  }
}
