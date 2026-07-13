/// <reference types="@cloudflare/workers-types" />

interface __BaseEnv_Env {
  HYPERDRIVE: Hyperdrive
  CHAT_ROOM: DurableObjectNamespace<import('./worker/chat-room').ChatRoom>
  DATABASE_URL?: string
}

declare namespace Cloudflare {
  interface GlobalProps {
    mainModule: typeof import('./worker/index')
    durableNamespaces: 'ChatRoom'
  }
  interface Env extends __BaseEnv_Env {}
}

interface Env extends __BaseEnv_Env {}
