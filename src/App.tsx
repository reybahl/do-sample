import { useMemo, useState } from 'react'
import { Composer } from './components/Composer'
import { MessageList } from './components/MessageList'
import { Sidebar } from './components/Sidebar'
import type { Conversation, Message } from './types'
import './App.css'

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState('')
  const [messages, setMessages] = useState<Record<string, Message[]>>({})

  const activeRoom = useMemo(
    () => conversations.find((room) => room.id === activeId),
    [conversations, activeId],
  )

  const roomMessages = messages[activeId] ?? []

  function handleCreateRoom(name: string) {
    const trimmed = name.trim().toLowerCase().replace(/\s+/g, '-')
    if (!trimmed) return

    const exists = conversations.some((room) => room.name === trimmed)
    if (exists) {
      const existing = conversations.find((room) => room.name === trimmed)
      if (existing) setActiveId(existing.id)
      return
    }

    const id = crypto.randomUUID()
    const room: Conversation = {
      id,
      name: trimmed,
      preview: 'No messages yet',
    }

    setConversations((prev) => [room, ...prev])
    setMessages((prev) => ({ ...prev, [id]: [] }))
    setActiveId(id)
  }

  function handleSend(body: string) {
    if (!activeId) return

    const next: Message = {
      id: crypto.randomUUID(),
      author: 'you',
      body,
      at: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      self: true,
    }

    setMessages((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), next],
    }))

    setConversations((prev) =>
      prev.map((room) =>
        room.id === activeId ? { ...room, preview: body } : room,
      ),
    )
  }

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onCreate={handleCreateRoom}
      />

      <main className="chat">
        <header className="chat-header">
          <h1 className="chat-title">
            {activeRoom ? `#${activeRoom.name}` : 'Select a room'}
          </h1>
          <span className="chat-status">local only</span>
        </header>

        {activeRoom ? (
          <>
            <MessageList messages={roomMessages} />
            <Composer onSend={handleSend} />
          </>
        ) : (
          <div className="chat-empty">
            <p>Create a room to start chatting.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
