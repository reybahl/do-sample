import type { Message } from '../types'

type MessageListProps = {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="message-list empty">
        <p>No messages yet.</p>
      </div>
    )
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <article
          key={message.id}
          className={message.self ? 'message self' : 'message'}
        >
          <header className="message-meta">
            <span className="message-author">{message.author}</span>
            <time className="message-time">{message.at}</time>
          </header>
          <p className="message-body">{message.body}</p>
        </article>
      ))}
    </div>
  )
}
