'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/cn'
import { useTranslation } from '@/lib/i18n'
import type { ChatMessage } from '@/lib/multiplayer'

interface ChatPanelProps {
  messages: ChatMessage[]
  onSend: (message: string) => void
  currentUserId: string
  collapsed?: boolean
}

export default function ChatPanel({ messages, onSend, currentUserId, collapsed }: ChatPanelProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    onSend(trimmed)
    setInput('')
  }

  if (collapsed) return null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-geo-outline/30 shrink-0">
        <h3 className="font-headline font-bold text-geo-on-surface text-sm uppercase">
          {t('mp.chat')}
        </h3>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-hide"
        role="log"
        aria-label={t('mp.chat')}
        aria-live="polite"
      >
        {messages.length === 0 && (
          <p className="text-geo-on-surface-dim text-sm text-center py-4 italic">
            No messages yet
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'text-sm',
              msg.user_id === currentUserId ? 'text-geo-primary' : 'text-geo-on-surface',
            )}
          >
            <span className="font-bold">{msg.avatar} {msg.nickname}: </span>
            <span className="text-geo-on-surface-dim">{msg.message}</span>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-3 py-2 border-t border-geo-outline/30 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('mp.typeMessage')}
            maxLength={200}
            className="flex-1 px-3 py-2 bg-geo-surface border border-geo-outline rounded-lg text-geo-on-surface text-sm placeholder:text-geo-on-surface-dim/50 focus:border-geo-primary focus:outline-none"
            aria-label={t('mp.typeMessage')}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="btn-primary px-3 py-1.5 text-xs shrink-0"
          >
            {t('mp.sendMessage')}
          </button>
        </div>
      </form>
    </div>
  )
}
