"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import Sidebar from "./Sidebar"
import Header from "./Header"
import ChatPanel from "./ChatPanel"
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
  const { 
    sendMessage: sendToOpenAI, 
    isLimitReached, 
    limitInfo,
    remainingResponses 
  } = useChat({
    onSuccess: (response, limitInfo) => {
      console.log('Respuesta de OpenAI recibida:', response)
      // Las advertencias de límite se manejan en onLimitWarning para evitar duplicados
    },
    onError: (error, isLimitError, limitInfo) => {
      console.error('Error en chat:', error)
      // Mostrar toast específico para límite alcanzado
      if (isLimitError) {
        toast.error(error, {
          duration: 10000,
          icon: '🚫',
          description: 'Esta es una versión de demostración con uso limitado.'
        })
      }
    },
    onLimitWarning: (warning, remaining) => {
      // Solo mostrar advertencia aquí para evitar duplicados
      toast.warning(warning, {
        duration: 5000,
        icon: remaining === 1 ? '⚠️' : '⏳'
      })
    }
  })

  // Hook para manejar conversaciones (OPTIMIZADO)
  const {
    conversations,
    selectedConversation,
    isLoading: conversationsLoading,
    isLoadingMore,
    hasMore,
    createConversation,
    selectConversation,
    refreshSelectedConversation,
    toggleConversationPin,
    addMessage,
    getFilteredConversations,
    loadMoreConversations,
    updateSelectedConversationOptimistically
  } = useConversations({
    autoLoad: true // Carga automática pero con caché inteligente
  })

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
  const [isLoadingConversation, setIsLoadingConversation] = useState<boolean>(false)
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false)

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

  // Obtener conversaciones filtradas usando el hook (OPTIMIZADO - usa caché local)
  const pinned = useMemo(() => {
    return getFilteredConversations({ pinned: true })
  }, [getFilteredConversations])

  const recent = useMemo(() => {
    return getFilteredConversations({ pinned: false, limit: 10 })
  }, [getFilteredConversations])

  async function handleSelectConversation(id: string) {
    try {
      setIsLoadingConversation(true)
      setIsTransitioning(true)
      
      // Carga optimizada sin delays artificiales
      const conversation = await selectConversation(id)
      
      // Delay mínimo solo para la transición visual suave
      setTimeout(() => {
        setIsTransitioning(false)
      }, 25) // Reducido a 25ms para máxima velocidad
      
    } catch (error) {
      console.error('Error seleccionando conversación:', error)
      toast.error('Error al cargar la conversación')
      setIsTransitioning(false)
    } finally {
      setIsLoadingConversation(false)
    }
  }

  async function togglePin(id: string) {
    try {
      await toggleConversationPin(id)
    } catch (error) {
      console.error('Error alternando pin:', error)
    }
  }

  async function createNewChat() {
    try {
      setIsLoadingConversation(true)
      setIsTransitioning(true)
      
      // Generar un nombre más descriptivo basado en la hora y el modo
      const now = new Date()
      const timeStr = now.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
      const modeLabel = mode === 'agent' ? 'Agente' : 'Chat'
      const title = `${modeLabel} ${timeStr}`
      
      const id = await createConversation(title)
      await handleSelectConversation(id)
      setSidebarOpen(false)
    } catch (error) {
      console.error('Error creando chat:', error)
      toast.error('Error al crear nueva conversación')
      setIsLoadingConversation(false)
      setIsTransitioning(false)
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
      // 1. Crear mensaje del usuario SOLO para UI local (temporal)
      const userMessageLocal = {
        id: `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        role: "user" as const,
        content: content,
        createdAt: new Date().toISOString()
      }

      // 2. Actualizar UI local inmediatamente (optimistic UI)
      if (selectedConversation) {
        updateSelectedConversationOptimistically((prev: any) => {
          if (!prev || prev.id !== convId) return prev
          
          const updatedMessages = [...(prev.messages || []), userMessageLocal]
          return {
            ...prev,
            messages: updatedMessages,
            messageCount: updatedMessages.length,
            updatedAt: userMessageLocal.createdAt,
            preview: content.slice(0, 80)
          }
        })
      }

      // 3. Activar estado de thinking
      setIsThinking(true)
      setThinkingConvId(convId)

      // 4. Enviar SOLO a OpenAI (NO agregamos el mensaje por separado)
      // El backend se encarga de agregar tanto user message como response
      const response = await sendToOpenAI(content, { 
        mode: mode,
        conversationId: convId
      })

      // Si se alcanzó el límite, mostrar mensaje en el chat
      if (!response && isLimitReached) {
        const limitMessage = {
          id: `limit_${Date.now()}`,
          role: "assistant" as const,
          content: `🚫 **Límite de demostración alcanzado**\n\nHas utilizado las ${limitInfo?.maxResponses || 4} respuestas disponibles en esta demostración.\n\n¡Gracias por probar AI Assistant UI! Si te interesa el proyecto completo, puedes contactarme.`,
          createdAt: new Date().toISOString()
        }
        
        updateSelectedConversationOptimistically((prev: any) => {
          if (!prev || prev.id !== convId) return prev
          const updatedMessages = [...(prev.messages || []), limitMessage]
          return {
            ...prev,
            messages: updatedMessages,
            messageCount: updatedMessages.length
          }
        })
        
        setIsThinking(false)
        setThinkingConvId(null)
        return
      }
      
      // 5. Desactivar thinking y refrescar SILENCIOSAMENTE para obtener los mensajes reales
      setIsThinking(false)
      setThinkingConvId(null)
      
      if (response) {
        // Pequeño delay para asegurar que la API de OpenAI procesó los mensajes
        // La API de Conversations puede tardar un momento en persistir los items
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Refrescar la conversación para obtener la respuesta real de la IA
        try {
          await refreshSelectedConversation(convId)
          console.log('✅ Conversación actualizada con respuesta de IA')
        } catch (error) {
          console.error('Error refrescando conversación:', error)
          // Si falla el refresh, mantener el estado optimista
        }
      } else {
        // Si no hay respuesta, igualmente intentar refrescar por si hay datos parciales
        console.warn('⚠️ No se recibió respuesta de OpenAI, intentando refresh...')
        try {
          await refreshSelectedConversation(convId)
        } catch (error) {
          console.error('Error en refresh de fallback:', error)
        }
      }
    } catch (error: any) {
      setIsThinking(false)
      setThinkingConvId(null)
      console.error('Error enviando mensaje:', error)
      
      // Mostrar notificación de error
      toast.error(`Error al enviar mensaje: ${error.message || 'Error desconocido'}`)
      
      // Agregar mensaje de error localmente
      const errorMsg = {
        id: Math.random().toString(36).slice(2),
        role: "assistant" as const,
        content: `Error: ${error.message || 'No se pudo procesar el mensaje'}`,
        createdAt: new Date().toISOString()
      }

      // Actualizar UI local con el error
      if (selectedConversation) {
        updateSelectedConversationOptimistically((prev: any) => {
          if (!prev || prev.id !== convId) return prev
          
          const updatedMessages = [...(prev.messages || []), errorMsg]
          return {
            ...prev,
            messages: updatedMessages,
            messageCount: updatedMessages.length,
            updatedAt: errorMsg.createdAt
          }
        })
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

  const chatPanelRef = useRef<any>(null)

  return (
    <div className="h-screen w-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="flex h-full w-full">
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
          onSelect={(id: string) => handleSelectConversation(id)}
          togglePin={togglePin}
          query={query}
          setQuery={setQuery}
          searchRef={searchRef}
          createNewChat={createNewChat}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMoreConversations}
          isLoadingConversations={conversationsLoading}
        />

        <main className="relative flex min-w-0 flex-1 flex-col">
          <Header 
            createNewChat={createNewChat} 
            sidebarCollapsed={sidebarCollapsed} 
            setSidebarOpen={setSidebarOpen}
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
            isThinking={isThinking && thinkingConvId === selectedConversation?.id}
            onPauseThinking={pauseThinking}
            onCreateNewChat={createNewChat}
            chatMode={mode}
            onModeChange={setMode}
            isLoadingConversation={isLoadingConversation}
            isTransitioning={isTransitioning}
            isLimitReached={isLimitReached}
            remainingResponses={remainingResponses}
          />
        </main>
      </div>
    </div>
  )
}
