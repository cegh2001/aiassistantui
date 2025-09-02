"use client"

import React, { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react"
import { Calendar, LayoutGrid, MoreHorizontal } from "lucide-react"
import Sidebar from "./Sidebar"
import Header from "./Header"
import ChatPanel from "./ChatPanel"
import GhostIconButton from "./GhostIconButton"
import ThemeToggle from "./ThemeToggle"
import { useLanguage } from "../lib/i18n/LanguageContext"
import { useChat } from "@/lib/hooks/useChat"
import { useChatMode } from "@/lib/hooks/useChatMode"
import { useConversations } from "@/lib/hooks/useConversations"

interface CollapsedState {
  pinned: boolean
  recent: boolean
}

export default function AIAssistantUI() {
  const { t } = useLanguage()
  
  // Hooks para el chat con OpenAI
  const { mode, setMode } = useChatMode()
  const { sendMessage: sendToOpenAI, isLoading: isAiThinking, error: chatError } = useChat({
    onSuccess: (response) => {
      console.log('Respuesta de OpenAI recibida:', response)
    },
    onError: (error) => {
      console.error('Error en chat:', error)
    }
  })

  // Hook para manejar conversaciones
  const {
    conversations,
    selectedConversation,
    isLoading: conversationsLoading,
    error: conversationsError,
    createConversation,
    selectConversation,
    deleteConversation,
    updateConversationTitle,
    toggleConversationPin,
    addMessage,
    getFilteredConversations
  } = useConversations()

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)
  const [collapsed, setCollapsed] = useState<CollapsedState>(() => {
    try {
      const raw = localStorage.getItem("sidebar-collapsed")
      return raw ? JSON.parse(raw) : { pinned: true, recent: false }
    } catch {
      return { pinned: true, recent: false }
    }
  })
  
  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed))
    } catch {}
  }, [collapsed])

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("sidebar-collapsed-state")
      return saved ? JSON.parse(saved) : false
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed-state", JSON.stringify(sidebarCollapsed))
    } catch {}
  }, [sidebarCollapsed])


  const [query, setQuery] = useState<string>("")
  const searchRef = useRef<HTMLInputElement | null>(null)

  const [isThinking, setIsThinking] = useState<boolean>(false)
  const [thinkingConvId, setThinkingConvId] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault()
        createNewChat()
      }
      if (!e.metaKey && !e.ctrlKey && e.key === "/") {
        const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase()
        if (tag !== "input" && tag !== "textarea") {
          e.preventDefault()
          searchRef.current?.focus()
        }
      }
      if (e.key === "Escape" && sidebarOpen) setSidebarOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [sidebarOpen])

  // Obtener conversaciones filtradas usando el hook
  const filtered = useMemo(() => {
    return getFilteredConversations({ search: query })
  }, [getFilteredConversations, query])

  const pinned = getFilteredConversations({ pinned: true })
  const recent = getFilteredConversations({ pinned: false, limit: 10 })

  async function togglePin(id: string) {
    try {
      await toggleConversationPin(id)
    } catch (error) {
      console.error('Error alternando pin:', error)
    }
  }

  async function createNewChat() {
    try {
      // Generar un nombre más descriptivo basado en la hora y el modo
      const now = new Date()
      const timeStr = now.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
      const modeLabel = mode === 'agent' ? 'Agente' : 'Chat'
      const title = `${modeLabel} ${timeStr}`
      
      const id = await createConversation(title)
      selectConversation(id)
      setSidebarOpen(false)
    } catch (error) {
      console.error('Error creando chat:', error)
    }
  }

  async function sendMessage(convId: string, content: string) {
    if (!content.trim()) return
    
    // Prevenir envíos duplicados si ya está procesando
    if (isThinking && thinkingConvId === convId) {
      console.log('⚠️ Ya hay un mensaje en proceso para esta conversación')
      return
    }

    try {
      setIsThinking(true)
      setThinkingConvId(convId)

      // Enviar a OpenAI con el modo seleccionado y el conversationId
      // El backend se encarga de agregar tanto el mensaje del usuario como la respuesta
      const response = await sendToOpenAI(content, { 
        mode: mode,
        conversationId: convId
      })
      
      setIsThinking(false)
      setThinkingConvId(null)
      
      if (response) {
        // Refrescar la conversación para mostrar los nuevos mensajes
        await selectConversation(convId)
      }
    } catch (error: any) {
      setIsThinking(false)
      setThinkingConvId(null)
      console.error('Error enviando mensaje:', error)
      
      // Agregar mensaje de error
      const errorMsg = {
        id: Math.random().toString(36).slice(2),
        role: "assistant" as const,
        content: `Error: ${error.message || 'No se pudo procesar el mensaje'}`,
        createdAt: new Date().toISOString()
      }

      try {
        await addMessage(convId, errorMsg)
        // NO refrescar la conversación aquí tampoco
        // await selectConversation(convId)
      } catch (addError) {
        console.error('Error agregando mensaje de error:', addError)
      }
    }
  }

  async function editMessage(convId: string, messageId: string, newContent: string) {
    try {
      // TODO: Implementar edición de mensajes con la API de OpenAI
      console.warn('La edición de mensajes no está implementada todavía')
    } catch (error) {
      console.error('Error editando mensaje:', error)
    }
  }

  async function resendMessage(convId: string, messageId: string) {
    const conv = conversations.find((c) => c.id === convId)
    const msg = conv?.messages?.find((m) => m.id === messageId)
    if (!msg) return
    await sendMessage(convId, msg.content)
  }

  function pauseThinking() {
    setIsThinking(false)
    setThinkingConvId(null)
  }

  const composerRef = useRef<any>(null)
  const chatPanelRef = useRef<any>(null)

  return (
    <div className="h-screen w-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="md:hidden sticky top-0 z-40 flex items-center gap-2 border-b border-zinc-200/60 bg-white/80 px-3 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="ml-1 flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-flex h-4 w-4 items-center justify-center">✱</span> AI Assistant
        </div>
        <div className="ml-auto flex items-center gap-2">
          <GhostIconButton label="Schedule">
            <Calendar className="h-4 w-4" />
          </GhostIconButton>
          <GhostIconButton label="Apps">
            <LayoutGrid className="h-4 w-4" />
          </GhostIconButton>
          <GhostIconButton label="More">
            <MoreHorizontal className="h-4 w-4" />
          </GhostIconButton>
          <ThemeToggle />
        </div>
      </div>

      <div className="flex h-[calc(100vh-0px)] w-full">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          conversations={conversations}
          pinned={pinned}
          recent={recent}
          selectedId={selectedConversation?.id || null}
          onSelect={(id: string) => selectConversation(id)}
          togglePin={togglePin}
          query={query}
          setQuery={setQuery}
          searchRef={searchRef}
          createNewChat={createNewChat}
        />

        <main className="relative flex min-w-0 flex-1 flex-col">
          <Header 
            createNewChat={createNewChat} 
            sidebarCollapsed={sidebarCollapsed} 
            setSidebarOpen={setSidebarOpen}
            chatMode={mode}
            onModeChange={setMode}
          />
          <ChatPanel
            ref={chatPanelRef}
            conversation={selectedConversation}
            onSend={(content: string) => {
              if (selectedConversation) {
                sendMessage(selectedConversation.id, content)
              }
            }}
            onEditMessage={(messageId: string, newContent: string) => {
              if (selectedConversation) {
                editMessage(selectedConversation.id, messageId, newContent)
              }
            }}
            onResendMessage={(messageId: string) => {
              if (selectedConversation) {
                resendMessage(selectedConversation.id, messageId)
              }
            }}
            isThinking={(isThinking || isAiThinking) && thinkingConvId === selectedConversation?.id}
            onPauseThinking={pauseThinking}
          />
        </main>
      </div>
    </div>
  )
}
