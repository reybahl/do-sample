import { Hono } from 'hono'
import { desc, eq } from 'drizzle-orm'
import { createDb } from './db/client.ts'
import { messages, rooms } from './db/schema.ts'
import type { Env, MessageDto } from './types.ts'

export { ChatRoom } from './chat-room.ts'

const app = new Hono<{ Bindings: Env }>()

function dbFromEnv(env: Env) {
  const connectionString =
    env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'No database connection string (HYPERDRIVE or DATABASE_URL)',
    )
  }
  return createDb(connectionString)
}

function roomStub(env: Env, roomId: string) {
  return env.CHAT_ROOM.getByName(roomId)
}

function toMessageDto(row: {
  id: string
  roomId: string
  author: string
  body: string
  createdAt: Date
}): MessageDto {
  return {
    id: row.id,
    roomId: row.roomId,
    author: row.author,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  }
}

app.get('/api/health', (c) =>
  c.json({ ok: true, runtime: 'cloudflare-workers', storage: 'postgres' }),
)

app.get('/api/rooms', async (c) => {
  const db = dbFromEnv(c.env)

  const roomRows = await db.select().from(rooms).orderBy(desc(rooms.createdAt))

  const latestByRoom = await db
    .selectDistinctOn([messages.roomId], {
      roomId: messages.roomId,
      body: messages.body,
    })
    .from(messages)
    .orderBy(messages.roomId, desc(messages.createdAt))

  const previewByRoom = new Map(
    latestByRoom.map((row) => [row.roomId, row.body]),
  )

  return c.json(
    roomRows.map((room) => ({
      id: room.id,
      name: room.name,
      createdAt: room.createdAt.toISOString(),
      preview: previewByRoom.get(room.id) ?? 'No messages yet',
    })),
  )
})

app.post('/api/rooms', async (c) => {
  const db = dbFromEnv(c.env)
  const body = await c.req.json().catch(() => null)
  const rawName = typeof body?.name === 'string' ? body.name : ''
  const name = rawName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')

  if (!name) {
    return c.json({ error: 'Room name is required' }, 400)
  }

  const existing = await db
    .select()
    .from(rooms)
    .where(eq(rooms.name, name))
    .limit(1)

  if (existing[0]) {
    const [latest] = await db
      .select({ body: messages.body })
      .from(messages)
      .where(eq(messages.roomId, existing[0].id))
      .orderBy(desc(messages.createdAt))
      .limit(1)

    return c.json(
      {
        id: existing[0].id,
        name: existing[0].name,
        createdAt: existing[0].createdAt.toISOString(),
        preview: latest?.body ?? 'No messages yet',
        existing: true,
      },
      200,
    )
  }

  const [created] = await db.insert(rooms).values({ name }).returning()

  return c.json(
    {
      id: created.id,
      name: created.name,
      createdAt: created.createdAt.toISOString(),
      preview: 'No messages yet',
      existing: false,
    },
    201,
  )
})

app.get('/api/rooms/:roomId/messages', async (c) => {
  const db = dbFromEnv(c.env)
  const roomId = c.req.param('roomId')

  const room = await db
    .select()
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1)

  if (!room[0]) {
    return c.json({ error: 'Room not found' }, 404)
  }

  const rows = await db
    .select({
      id: messages.id,
      roomId: messages.roomId,
      author: messages.author,
      body: messages.body,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.roomId, roomId))
    .orderBy(messages.createdAt)

  return c.json(rows.map(toMessageDto))
})

app.post('/api/rooms/:roomId/messages', async (c) => {
  const db = dbFromEnv(c.env)
  const roomId = c.req.param('roomId')
  const body = await c.req.json().catch(() => null)

  const author =
    typeof body?.author === 'string' && body.author.trim()
      ? body.author.trim().slice(0, 64)
      : 'you'
  const text = typeof body?.body === 'string' ? body.body.trim() : ''

  if (!text) {
    return c.json({ error: 'Message body is required' }, 400)
  }

  const room = await db
    .select()
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1)

  if (!room[0]) {
    return c.json({ error: 'Room not found' }, 404)
  }

  const [created] = await db
    .insert(messages)
    .values({
      roomId,
      author,
      body: text,
    })
    .returning()

  const dto = toMessageDto(created)

  // Fan out to anyone connected to this room's DO
  try {
    await roomStub(c.env, roomId).broadcast(dto)
  } catch {
    // Live push is best-effort; Postgres already has the message
  }

  return c.json(dto, 201)
})

app.get('/ws/rooms/:roomId', async (c) => {
  const db = dbFromEnv(c.env)
  const roomId = c.req.param('roomId')
  const upgrade = c.req.header('Upgrade')

  if (upgrade?.toLowerCase() !== 'websocket') {
    return c.text('Expected WebSocket', 426)
  }

  const room = await db
    .select()
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1)

  if (!room[0]) {
    return c.json({ error: 'Room not found' }, 404)
  }

  return roomStub(c.env, roomId).fetch(c.req.raw)
})

export default app
