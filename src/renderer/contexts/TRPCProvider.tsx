import { useState, useMemo } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ipcLink } from "trpc-electron/renderer"
import { trpc } from "../lib/trpc"
import superjson from "superjson"

interface TRPCProviderProps {
  children: React.ReactNode
}

// Global query client instance for use outside React components
let globalQueryClient: QueryClient | null = null

export function getQueryClient(): QueryClient | null {
  return globalQueryClient
}

export function TRPCProvider({ children }: TRPCProviderProps) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5000,
          refetchOnWindowFocus: false,
          networkMode: "always",
          retry: false,
        },
        mutations: {
          networkMode: "always",
          retry: false,
        },
      },
    })
    globalQueryClient = client
    return client
  })

  // Create TRPC client synchronously - no need to wait, electronTRPC is available immediately
  const { trpcClient, error } = useMemo(() => {
    try {
      const client = trpc.createClient({
        links: [ipcLink({ transformer: superjson })],
      })
      return { trpcClient: client, error: null }
    } catch (err) {
      console.error("[TRPCProvider] Failed to create client:", err)
      return { trpcClient: null, error: err as Error }
    }
  }, [])

  if (error || !trpcClient) {
    return (
      <div style={{ padding: "20px", color: "red" }}>
        <h2>TRPC Initialization Error</h2>
        <p>{error?.message || "Failed to create TRPC client"}</p>
        <p>Please check that the preload script is properly configured.</p>
      </div>
    )
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
