import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  type BYOMConfig,
  clearBYOMConfig,
  getBYOMConfig,
  saveBYOMConfig,
  testBYOMConnection,
} from "@/lib/llm-client"
import { cn } from "@/lib/utils"

type ConnectionStatus =
  | "idle"
  | "testing"
  | "connected"
  | "error"
  | "server-default"

export function ProviderSettings() {
  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState("")
  const [status, setStatus] = useState<ConnectionStatus>("server-default")
  const [errorMessage, setErrorMessage] = useState("")
  const [isTesting, setIsTesting] = useState(false)

  // Load existing config on mount
  useEffect(() => {
    const config = getBYOMConfig()
    if (config) {
      setBaseUrl(config.baseUrl)
      setApiKey(config.apiKey)
      setModel(config.model)
      setStatus("connected")
    } else {
      setStatus("server-default")
    }
  }, [])

  const handleSave = useCallback(() => {
    if (!baseUrl.trim() || !apiKey.trim()) return
    const config: BYOMConfig = {
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim() || "gpt-4o-mini",
    }
    saveBYOMConfig(config)
    setStatus("connected")
    setErrorMessage("")
  }, [baseUrl, apiKey, model])

  const handleTestConnection = useCallback(async () => {
    if (!baseUrl.trim() || !apiKey.trim()) return

    setIsTesting(true)
    setStatus("testing")
    setErrorMessage("")

    const config: BYOMConfig = {
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim() || "gpt-4o-mini",
    }

    try {
      await testBYOMConnection(config)
      saveBYOMConfig(config)
      setStatus("connected")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setStatus("error")
      setErrorMessage(msg)
    } finally {
      setIsTesting(false)
    }
  }, [baseUrl, apiKey, model])

  const handleClear = useCallback(() => {
    clearBYOMConfig()
    setBaseUrl("")
    setApiKey("")
    setModel("")
    setStatus("server-default")
    setErrorMessage("")
  }, [])

  const statusLabel = {
    idle: "",
    testing: "Testing connection...",
    connected: "Connected to your provider",
    error: "Connection error",
    "server-default": "Using server default",
  }[status]

  const statusColor = {
    idle: "text-muted-foreground",
    testing: "text-muted-foreground",
    connected: "text-primary",
    error: "text-destructive",
    "server-default": "text-muted-foreground",
  }[status]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">LLM Provider (BYOM)</h3>
        <p className="text-sm text-muted-foreground">
          Bring your own model. Connect your OpenAI-compatible API to chat
          directly without server limits. Your key is stored only in this
          browser.
        </p>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            status === "connected" && "bg-primary",
            status === "error" && "bg-destructive",
            status === "testing" && "bg-muted-foreground animate-pulse",
            (status === "server-default" || status === "idle") &&
              "bg-muted-foreground",
          )}
        />
        <span className={cn("text-sm", statusColor)}>{statusLabel}</span>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="byom-url">API Base URL</Label>
          <Input
            id="byom-url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            autoComplete="url"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="byom-key">API Key</Label>
          <Input
            id="byom-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="byom-model">Model Name (optional)</Label>
          <Input
            id="byom-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-4o-mini"
          />
        </div>
      </div>

      {/* Error details */}
      {errorMessage && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleTestConnection}
          disabled={!baseUrl.trim() || !apiKey.trim() || isTesting}
        >
          {isTesting ? "Testing..." : "Test Connection"}
        </Button>
        <Button
          variant="outline"
          onClick={handleSave}
          disabled={!baseUrl.trim() || !apiKey.trim()}
        >
          Save
        </Button>
        <Button
          variant="outline"
          onClick={handleClear}
          disabled={status === "server-default"}
          className="text-destructive hover:text-destructive"
        >
          Clear Credentials
        </Button>
      </div>
    </div>
  )
}
