import { createTRPCReact, type CreateTRPCReact } from "@trpc/react-query"
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client"
import { ipcLink } from "trpc-electron/renderer"
import type { AppRouter } from "../../main/lib/trpc/routers"
import superjson from "superjson"

/**
 * Check if running in Electron environment
 */
const isElectron = () => {
  return !!(window && (window as any).electronTRPC)
}

/**
 * React hooks for tRPC
 * Type annotation added to avoid TS2742 declaration emit issue
 */
export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>()

/**
 * Vanilla client for use outside React components (stores, utilities)
 * Supports both Electron (IPC) and web (HTTP) environments
 */
export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    // Use IPC link in Electron, HTTP link in web dev
    isElectron()
      ? ipcLink({ transformer: superjson })
      : httpBatchLink({
          url: "/trpc",
          transformer: superjson,
        }),
  ],
})
