import { useState, useEffect } from "react"
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

/**
 * Wait for electronTRPC to be available (preload script may not have finished)
 */
function waitForElectronTRPC(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window is not available"))
      return
    }

    // Debug: log what's available on window
    console.log("[TRPCProvider] Checking for preload globals...")
    console.log("[TRPCProvider] window.electronTRPC:", (window as any).electronTRPC)
    console.log("[TRPCProvider] typeof window.electronTRPC:", typeof (window as any).electronTRPC)
    console.log("[TRPCProvider] window.desktopApi:", (window as any).desktopApi)
    console.log("[TRPCProvider] window.desktopApi?.platform:", (window as any).desktopApi?.platform)
    console.log("[TRPCProvider] navigator.userAgent:", navigator.userAgent)
    console.log("[TRPCProvider] Is Electron:", navigator.userAgent.includes("Electron"))

    // Check if already available
    if ((window as any).electronTRPC) {
      console.log("[TRPCProvider] electronTRPC found immediately!")
      resolve()
      return
    }

    // Wait for it to become available (with timeout)
    const maxWait = 5000 // 5 seconds
    const startTime = Date.now()
    const checkInterval = setInterval(() => {
      if ((window as any).electronTRPC) {
        console.log("[TRPCProvider] electronTRPC found after waiting!")
        clearInterval(checkInterval)
        resolve()
      } else if (Date.now() - startTime > maxWait) {
        clearInterval(checkInterval)
        console.error("[TRPCProvider] Timeout! Final state:")
        console.error("[TRPCProvider] window.electronTRPC:", (window as any).electronTRPC)
        console.error("[TRPCProvider] window.desktopApi:", (window as any).desktopApi)
        reject(
          new Error(
            "Could not find `electronTRPC` global after waiting. Check that `exposeElectronTRPC` has been called in your preload file."
          )
        )
      }
    }, 10)
  })
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

  const [trpcClient, setTrpcClient] = useState<ReturnType<typeof trpc.createClient> | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    waitForElectronTRPC()
      .then(() => {
        const client = trpc.createClient({
          links: [ipcLink({ transformer: superjson })],
        })
        setTrpcClient(client)
      })
      .catch((err) => {
        setError(err)
      })
  }, [])

  if (error) {
    return (
      <div style={{ padding: "20px", color: "red" }}>
        <h2>TRPC Initialization Error</h2>
        <p>{error.message}</p>
        <p>Please check that the preload script is properly configured.</p>
      </div>
    )
  }

  if (!trpcClient) {
    return (
      <div style={{ padding: "20px" }}>
        <p>Initializing TRPC client...</p>
      </div>
    )
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
