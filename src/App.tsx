import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createRoom,
  listMessages,
  listRooms,
  roomWebSocketUrl,
  sendMessage,
  toMessage,
} from './api'
import { Composer } from './components/Composer'
import { MessageList } from './components/MessageList'
import { Sidebar } from './components/Sidebar'
import type { Conversation, Message } from './types'
import './App.css'

type WsServerEvent =
  | { type: 'ready' }
  | {
      type: 'message'
      message: {
        id: string
        roomId: string
        author: string
        body: string
        createdAt: string
      }
    }
  | { type: 'error'; error: string }

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState(false)

  const activeRoom = useMemo(
    () => conversations.find((room) => room.id === activeId),
    [conversations, activeId],
  )

  const loadRooms = useCallback(async () => {
    setLoadingRooms(true)
    setError(null)
    try {
      const rooms = await listRooms()
      setConversations(rooms)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rooms')
    } finally {
      setLoadingRooms(false)
    }
  }, [])

  useEffect(() => {
    void loadRooms()
  }, [loadRooms])

  // Load history from Postgres when room changes
  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }

    let cancelled = false

    async function load() {
      setLoadingMessages(true)
      setError(null)
      try {
        const rows = await listMessages(activeId)
        if (!cancelled) setMessages(rows)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load messages')
          setMessages([])
        }
      } finally {
        if (!cancelled) setLoadingMessages(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [activeId])

  // Live fanout via room Durable Object WebSocket
  useEffect(() => {
    if (!activeId) {
      setLive(false)
      return
    }

    let closed = false
    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined

    function connect() {
      socket = new WebSocket(roomWebSocketUrl(activeId))

      socket.onopen = () => {
        if (!closed) setLive(true)
      }

      socket.onmessage = (event) => {
        let data: WsServerEvent
        try {
          data = JSON.parse(String(event.data)) as WsServerEvent
        } catch {
          return
        }

        if (data.type === 'message') {
          const incoming = data.message
          const next = toMessage(incoming)
          setMessages((prev) => {
            if (prev.some((m) => m.id === next.id)) return prev
            return [...prev, next]
          })
          setConversations((prev) =>
            prev.map((room) =>
              room.id === activeId
                ? { ...room, preview: incoming.body }
                : room,
            ),
          )
        }
      }

      socket.onclose = () => {
        if (closed) return
        setLive(false)
        reconnectTimer = setTimeout(connect, 1500)
      }

      socket.onerror = () => {
        socket?.close()
      }
    }

    connect()

    return () => {
      closed = true
      setLive(false)
      if (reconnectTimer) clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [activeId])

  async function handleCreateRoom(name: string) {
    setBusy(true)
    setError(null)
    try {
      const room = await createRoom(name)
      setConversations((prev) => {
        const without = prev.filter((item) => item.id !== room.id)
        return [room, ...without]
      })
      setActiveId(room.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room')
    } finally {
      setBusy(false)
    }
  }

  async function handleSend(body: string) {
    if (!activeId) return

    setBusy(true)
    setError(null)
    try {
      // Persist via Worker → Postgres; DO broadcasts to other tabs/clients
      const message = await sendMessage(activeId, body)
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev
        return [...prev, message]
      })
      setConversations((prev) =>
        prev.map((room) =>
          room.id === activeId ? { ...room, preview: body } : room,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onCreate={(name) => {
          void handleCreateRoom(name)
        }}
        disabled={busy || loadingRooms}
      />

      <main className="chat">
        <header className="chat-header">
          <h1 className="chat-title">
            {activeRoom ? `#${activeRoom.name}` : 'Select a room'}
          </h1>
          <span className="chat-status">
            {loadingRooms
              ? 'loading…'
              : activeRoom
                ? live
                  ? 'live · postgres · hmr ok'
                  : 'connecting…'
                : 'postgres + DO · hmr'}
          </span>
        </header>

        {error ? (
          <div className="chat-banner" role="alert">
            <span>{error}</span>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                void loadRooms()
                if (activeId) {
                  void listMessages(activeId).then(setMessages).catch(() => {})
                }
              }}
            >
              Retry
            </button>
          </div>
        ) : null}

        {activeRoom ? (
          <>
            {loadingMessages ? (
              <div className="chat-empty">
                <p>Loading messages…</p>
              </div>
            ) : (
              <MessageList messages={messages} />
            )}
            <Composer onSend={(body) => void handleSend(body)} disabled={busy} />
          </>
        ) : (
          <div className="chat-empty">
            <p>
              {loadingRooms
                ? 'Loading rooms…'
                : 'Create a room to start chatting.'}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
