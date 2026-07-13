import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Conversation } from '../types'

type SidebarProps = {
  conversations: Conversation[]
  activeId: string
  onSelect: (id: string) => void
  onCreate: (name: string) => void
}

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
}: SidebarProps) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (creating) inputRef.current?.focus()
  }, [creating])

  function openCreate() {
    setCreating(true)
    setName('')
  }

  function cancelCreate() {
    setCreating(false)
    setName('')
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate(trimmed)
    setCreating(false)
    setName('')
  }

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <span className="sidebar-title">Rooms</span>
        <button
          type="button"
          className="btn btn-ghost"
          title="New room"
          onClick={openCreate}
        >
          +
        </button>
      </header>

      {creating ? (
        <form className="room-create" onSubmit={handleSubmit}>
          <span className="room-create-prefix">#</span>
          <input
            ref={inputRef}
            className="room-create-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') cancelCreate()
            }}
            placeholder="room-name"
            aria-label="Room name"
            autoComplete="off"
          />
          <button
            type="submit"
            className="btn btn-primary room-create-submit"
            disabled={!name.trim()}
          >
            Add
          </button>
        </form>
      ) : null}

      {conversations.length === 0 && !creating ? (
        <div className="room-list-empty">
          <p>No rooms yet.</p>
          <button type="button" className="btn" onClick={openCreate}>
            New room
          </button>
        </div>
      ) : (
        <ul className="room-list">
          {conversations.map((room) => {
            const active = room.id === activeId
            return (
              <li key={room.id}>
                <button
                  type="button"
                  className={active ? 'room-item active' : 'room-item'}
                  onClick={() => onSelect(room.id)}
                >
                  <span className="room-name">#{room.name}</span>
                  <span className="room-preview">{room.preview}</span>
                  {room.unread ? (
                    <span className="room-badge">{room.unread}</span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
