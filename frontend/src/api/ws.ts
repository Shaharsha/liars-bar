type EventCallback = (data: any) => void

class WebSocketClient {
  private ws: WebSocket | null = null
  private listeners: Map<string, Set<EventCallback>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null

  connect(tableId: string, sessionId: string) {
    this.disconnect()
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.host
    this.ws = new WebSocket(`${protocol}://${host}/ws/${tableId}?session_id=${sessionId}`)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = (event) => {
      try {
        const { event: eventName, data } = JSON.parse(event.data)
        this.listeners.get(eventName)?.forEach((cb) => cb(data))
      } catch (e) {
        console.error('WS parse error:', e)
      }
    }

    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectAttempts++
          this.connect(tableId, sessionId)
        }, 1000 * Math.pow(2, this.reconnectAttempts))
      }
    }

    this.ws.onerror = () => {}
  }

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  send(event: string, data: Record<string, any> = {}) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }))
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    this.ws?.close()
    this.ws = null
    this.reconnectAttempts = 0
  }
}

export const wsClient = new WebSocketClient()
