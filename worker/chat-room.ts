import { DurableObject } from 'cloudflare:workers'
import type { Env, MessageDto } from './types'

/**
 * Per-room Durable Object: owns WebSockets and fans out live events.
 * Persistence lives in Postgres (Worker + Drizzle), not here.
 */
export class ChatRoom extends DurableObject<Env> {
  /** Called by the Worker after a message is written to Postgres. */
  async broadcast(message: MessageDto): Promise<void> {
    const data = JSON.stringify({ type: 'message', message })
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(data)
      } catch {
        // socket may already be closing
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    const upgrade = request.headers.get('Upgrade')
    if (upgrade?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    this.ctx.acceptWebSocket(server)
    server.send(JSON.stringify({ type: 'ready' }))

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    // Chat sends go through HTTP → Postgres; WS is receive-only for now.
    if (typeof raw !== 'string') return
    ws.send(
      JSON.stringify({
        type: 'error',
        error: 'Send messages via POST /api/rooms/:id/messages',
      }),
    )
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
  ): Promise<void> {
    ws.close(code, reason)
  }
}
