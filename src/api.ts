import type { Conversation, Message } from './types'

type RoomDto = {
  id: string
  name: string
  createdAt: string
  preview: string
  existing?: boolean
}

type MessageDto = {
  id: string
  roomId: string
  author: string
  body: string
  createdAt: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(errorBody?.error ?? `Request failed (${response.status})`)
  }

  return response.json() as Promise<T>
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toConversation(room: RoomDto): Conversation {
  return {
    id: room.id,
    name: room.name,
    preview: room.preview,
  }
}

export function toMessage(message: MessageDto, selfAuthor = 'you'): Message {
  return {
    id: message.id,
    author: message.author,
    body: message.body,
    at: formatTime(message.createdAt),
    createdAt: message.createdAt,
    self: message.author === selfAuthor,
  }
}

export async function listRooms(): Promise<Conversation[]> {
  const rooms = await request<RoomDto[]>('/api/rooms')
  return rooms.map(toConversation)
}

export async function createRoom(name: string): Promise<Conversation> {
  const room = await request<RoomDto>('/api/rooms', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  return toConversation(room)
}

export async function listMessages(roomId: string): Promise<Message[]> {
  const rows = await request<MessageDto[]>(`/api/rooms/${roomId}/messages`)
  return rows.map((row) => toMessage(row))
}

export async function sendMessage(
  roomId: string,
  body: string,
  author = 'you',
): Promise<Message> {
  const row = await request<MessageDto>(`/api/rooms/${roomId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body, author }),
  })
  return toMessage(row, author)
}

export function roomWebSocketUrl(roomId: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws/rooms/${roomId}`
}
