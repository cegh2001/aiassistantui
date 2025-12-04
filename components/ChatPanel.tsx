"use client"

import { useState, forwardRef, useImperativeHandle, useRef, useEffect } from "react"
import { Pencil, RefreshCw, Check, X, Square } from "lucide-react"
import Message from "./Message"
import Composer from "./Composer"
import { useLanguage } from "../lib/i18n/LanguageContext"
import { cls, timeAgo } from "@/lib/utils/helpers"
import { Conversation, Message as MessageType } from "@/lib/types/chat"
import { EmptyState } from "./EmptyState"
import { ChatMode } from "@/lib/services/openai"

interface ThinkingMessageProps {
  onPause: () => void;
}

function ThinkingMessage({ onPause }: ThinkingMessageProps) {
  const { t } = useLanguage();
  return (
    <Message role="assistant" isNew={true}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"></div>
        </div>
        <span className="text-sm text-zinc-500">{t('aiIsThinking')}</span>
        {/* <button
          onClick={onPause}
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <Square className="h-3 w-3" /> {t('pause')}
        </button> */}
      </div>
    </Message>
  )
}

interface ChatPanelProps {
  conversation: Conversation | null;
  onSend?: (content: string) => void | Promise<void>;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onResendMessage?: (messageId: string) => void;
  isThinking: boolean;
  onPauseThinking: () => void;
  onCreateNewChat?: () => void;
  chatMode?: ChatMode;
  onModeChange?: (mode: ChatMode) => void;
  isLoadingConversation?: boolean;
  isTransitioning?: boolean;
}

interface ChatPanelRef {
  insertTemplate: (templateContent: string) => void;
}

const ChatPanel = forwardRef<ChatPanelRef, ChatPanelProps>(function ChatPanel(
  { conversation, onSend, onEditMessage, onResendMessage, isThinking, onPauseThinking, onCreateNewChat, chatMode = "fast", onModeChange, isLoadingConversation = false, isTransitioning = false },
  ref,
) {
  // ✅ TODOS LOS HOOKS AL PRINCIPIO (ANTES DE CUALQUIER RETURN)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<string>("")
  const [busy, setBusy] = useState<boolean>(false)
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set()) // Track mensajes nuevos
  const [lastMessageCount, setLastMessageCount] = useState<number>(0) // Track cantidad anterior
  const composerRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null) // Ref para auto-scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null) // Ref del contenedor de scroll
  const { t, language } = useLanguage(); // Obtenemos también el language

  // ✅ Variables derivadas (seguros de calcular siempre)
  const tags = ["Certified", "Personalized", "Experienced", "Helpful"]
  const messages = conversation ? (Array.isArray(conversation.messages) ? conversation.messages : []) : []
  const count = messages.length || (conversation?.messageCount || 0)

  // ✅ useEffect - detectar mensajes nuevos para animaciones y auto-scroll
  useEffect(() => {
    if (messages.length > lastMessageCount) {
      // Hay mensajes nuevos
      const newIds = new Set<string>()
      
      // Marcar como nuevos solo los mensajes que no estaban antes
      for (let i = lastMessageCount; i < messages.length; i++) {
        if (messages[i]?.id) {
          newIds.add(messages[i].id)
        }
      }
      
      setNewMessageIds(newIds)
      setLastMessageCount(messages.length)
      
      // Auto-scroll suave hacia abajo cuando llegan mensajes nuevos
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end' 
        })
      }, 100) // Pequeño delay para que el DOM se actualice
      
      // Remover la marca de "nuevo" después de la animación
      setTimeout(() => {
        setNewMessageIds(new Set())
      }, 600) // Un poco más que la duración de la animación (500ms)
    } else if (messages.length !== lastMessageCount) {
      // El número de mensajes cambió (puede ser refresh completo)
      setLastMessageCount(messages.length)
      setNewMessageIds(new Set()) // Limpiar marcas de nuevos
      
      // También hacer scroll en refresh completo, pero más suave
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end' 
        })
      }, 150)
    }
  }, [messages.length, lastMessageCount, messages])

  // Auto-scroll inicial cuando se carga una conversación
  useEffect(() => {
    if (conversation && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end' 
        })
      }, 200)
    }
  }, [conversation?.id]) // Solo cuando cambia la conversación

  useImperativeHandle(
    ref,
    () => ({
      insertTemplate: (templateContent: string) => {
        composerRef.current?.insertTemplate(templateContent)
      },
    }),
    [],
  )

  // ✅ DESPUÉS de los hooks, podemos hacer returns condicionales
  if (!conversation) {
    return (
      <div className={`flex h-full flex-col transition-all duration-150 ease-out ${isTransitioning ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}>
        <EmptyState onCreateNewChat={onCreateNewChat} />
      </div>
    )
  }

  function startEdit(m: MessageType) {
    setEditingId(m.id)
    setDraft(m.content)
  }
  function cancelEdit() {
    setEditingId(null)
    setDraft("")
  }
  function saveEdit() {
    if (!editingId) return
    onEditMessage?.(editingId, draft)
    cancelEdit()
  }
  function saveAndResend() {
    if (!editingId) return
    onEditMessage?.(editingId, draft)
    onResendMessage?.(editingId)
    cancelEdit()
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div 
        ref={scrollContainerRef}
        className={`flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-8 scroll-smooth transition-all duration-150 ease-out ${isTransitioning ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}
      >
        <div className="mb-2 text-3xl font-serif tracking-tight sm:text-4xl md:text-5xl">
          <span className="block leading-[1.05] font-sans text-2xl">{conversation.title}</span>
        </div>
        <div className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          {t('updated')} {conversation.updatedAt ? timeAgo(conversation.updatedAt, language) : (language === 'es' ? 'Hace poco' : 'Just now')} · {count} {t('messages')}
        </div>
        <div className="mb-6 flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-800">
        </div>

        {isLoadingConversation ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"></div>
              </div>
              <span className="text-sm text-zinc-500">{t('loadingConversation')}</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            {t('noMessagesYet')}
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <div key={m.id} className="space-y-2">
                {editingId === m.id ? (
                  <div className={cls("rounded-2xl border p-2", "border-zinc-200 dark:border-zinc-800")}>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="w-full resize-y rounded-xl bg-transparent p-2 text-sm outline-none"
                      rows={3}
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={saveEdit}
                        className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-3 py-1.5 text-xs text-white dark:bg-white dark:text-zinc-900"
                      >
                        <Check className="h-3.5 w-3.5" /> {t('save')}
                      </button>
                      <button
                        onClick={saveAndResend}
                        className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> {t('saveAndResend')}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs"
                      >
                        <X className="h-3.5 w-3.5" /> {t('cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <Message role={m.role} isNew={newMessageIds.has(m.id)}>
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    {m.role === "user" && (
                      <div className="mt-1 flex gap-2 text-[11px] text-zinc-500">
                        {/* <button className="inline-flex items-center gap-1 hover:underline" onClick={() => startEdit(m)}>
                          <Pencil className="h-3.5 w-3.5" /> {t('edit')}
                        </button>
                        <button
                          className="inline-flex items-center gap-1 hover:underline"
                          onClick={() => onResendMessage?.(m.id)}
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> {t('resend')}
                        </button> */}
                      </div>
                    )}
                  </Message>
                )}
              </div>
            ))}
            {isThinking && <ThinkingMessage onPause={onPauseThinking} />}
            {/* Elemento invisible para auto-scroll */}
            <div ref={messagesEndRef} className="h-1" />
          </>
        )}
      </div>

      {/* Composer sin transición para que siempre esté disponible */}
      <Composer
        ref={composerRef}
        onSend={async (text: string) => {
          if (!text.trim()) return
          setBusy(true)
          try {
            await onSend?.(text)
            // Auto-scroll después de enviar para asegurar que se vea la respuesta
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'end' 
              })
            }, 200)
          } finally {
            setBusy(false)
          }
        }}
        busy={busy || isThinking || isLoadingConversation}
        chatMode={chatMode}
        onModeChange={onModeChange}
      />
    </div>
  )
})

export type { ChatPanelRef }

export default ChatPanel
