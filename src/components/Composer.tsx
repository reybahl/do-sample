import { useState, type FormEvent, type KeyboardEvent } from 'react'

type ComposerProps = {
  onSend: (body: string) => void
  disabled?: boolean
}

export function Composer({ onSend, disabled }: ComposerProps) {
  const [value, setValue] = useState('')

  function submit() {
    const body = value.trim()
    if (!body || disabled) return
    onSend(body)
    setValue('')
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    submit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <textarea
        className="composer-input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message…"
        rows={1}
        disabled={disabled}
        aria-label="Message"
      />
      <button
        type="submit"
        className="btn btn-primary"
        disabled={disabled || !value.trim()}
      >
        Send
      </button>
    </form>
  )
}
