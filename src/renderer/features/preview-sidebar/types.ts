export interface DetectedUrl {
  url: string
  port: number
  host: string
  timestamp: number
}

export interface PreviewTerminalState {
  isRunning: boolean
  output: string[]
  detectedUrls: DetectedUrl[]
  selectedUrl: string | null
  exitCode: number | null
}
