export type Message = {
  id: string
  author: string
  body: string
  at: string
  self?: boolean
}

export type Conversation = {
  id: string
  name: string
  preview: string
  unread?: number
}
