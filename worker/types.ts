export type MessageDto = {
  id: string
  roomId: string
  author: string
  body: string
  createdAt: string
}

export type Env = {
  CHAT_ROOM: DurableObjectNamespace<import('./chat-room').ChatRoom>
  /**
   * Production: real Hyperdrive binding.
   * Local: wrangler `localConnectionString` (see wrangler.jsonc).
   */
  HYPERDRIVE: Hyperdrive
  /** Optional fallback for local tooling / migrations */
  DATABASE_URL?: string
}
