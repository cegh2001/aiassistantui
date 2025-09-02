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
import { 
  INITIAL_CONVERSATIONS, 
  INITIAL_TEMPLATES, 
  INITIAL_FOLDERS, 
  type Conversation, 
  type Template, 
  type Folder 
} from "@/lib/data/mockData"

interface CollapsedState {
  pinned: boolean
  recent: boolean
  folders: boolean
  templates: boolean
}

export default function AIAssistantUI() {
  const { t } = useLanguage()
  
  // Hook para el chat con OpenAI
  const { sendConversation, isLoading: isAiThinking, error: chatError } = useChat({
    onSuccess: (response) => {
      console.log('Respuesta de OpenAI recibida:', response)
    },
    onError: (error) => {
      console.error('Error en chat:', error)
    }
  })
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)
  const [collapsed, setCollapsed] = useState<CollapsedState>(() => {
    try {
      const raw = localStorage.getItem("sidebar-collapsed")
      return raw ? JSON.parse(raw) : { pinned: true, recent: false, folders: true, templates: true }
    } catch {
      return { pinned: true, recent: false, folders: true, templates: true }
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

  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<Template[]>(INITIAL_TEMPLATES)
  const [folders, setFolders] = useState<Folder[]>(INITIAL_FOLDERS)

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
  }, [sidebarOpen, conversations])

  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      createNewChat()
    }
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations
    const q = query.toLowerCase()
    return conversations.filter((c) => c.title.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q))
  }, [conversations, query])

  const pinned = filtered.filter((c) => c.pinned).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))

  const recent = filtered
    .filter((c) => !c.pinned)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 10)

  const folderCounts = React.useMemo(() => {
    const map = Object.fromEntries(folders.map((f) => [f.name, 0]))
    for (const c of conversations) if (map[c.folder] != null) map[c.folder] += 1
    return map
  }, [conversations, folders])

  function togglePin(id: string) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)))
  }

  function createNewChat() {
    const id = Math.random().toString(36).slice(2)
    const item: Conversation = {
      id,
      title: t('newChat') || "New Chat",
      updatedAt: new Date().toISOString(),
      messageCount: 0,
      preview: t('sayHelloToStart') || "Say hello to start...",
      pinned: false,
      folder: "Work Projects",
      messages: [], // Ensure messages array is empty for new chats
    }
    setConversations((prev) => [item, ...prev])
    setSelectedId(id)
    setSidebarOpen(false)
  }

  function createFolder() {
    const name = prompt("Folder name")
    if (!name) return
    if (folders.some((f) => f.name.toLowerCase() === name.toLowerCase())) return alert("Folder already exists.")
    setFolders((prev) => [...prev, { id: Math.random().toString(36).slice(2), name }])
  }

  function sendMessage(convId: string, content: string) {
    if (!content.trim()) return
    const now = new Date().toISOString()
    const userMsg = { id: Math.random().toString(36).slice(2), role: "user" as const, content, createdAt: now }

    // Actualizar inmediatamente la conversación con el mensaje del usuario
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c
        const msgs = [...(c.messages || []), userMsg]
        return {
          ...c,
          messages: msgs,
          updatedAt: now,
          messageCount: msgs.length,
          preview: content.slice(0, 80),
        }
      }),
    )

    setIsThinking(true)
    setThinkingConvId(convId)

    // Obtener la conversación actual para enviar a OpenAI
    const currentConv = conversations.find(c => c.id === convId)
    const messagesForAI = [
      ...(currentConv?.messages || []),
      userMsg
    ].map(msg => ({
      role: msg.role,
      content: msg.content,
      id: msg.id,
      createdAt: msg.createdAt
    }))

    // Enviar a OpenAI
    sendConversation(messagesForAI, { 
      model: 'gpt-5',
      reasoningEffort: 'medium',
      verbosity: 'medium'
    }).then((response) => {
      setIsThinking(false)
      setThinkingConvId(null)
      
      if (response) {
        // Agregar la respuesta de la IA
        const assistantMsg = {
          id: response.id || Math.random().toString(36).slice(2),
          role: "assistant" as const,
          content: response.content,
          createdAt: new Date().toISOString(),
        }

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c
            const msgs = [...(c.messages || []), assistantMsg]
            return {
              ...c,
              messages: msgs,
              updatedAt: new Date().toISOString(),
              messageCount: msgs.length,
              preview: assistantMsg.content.slice(0, 80),
            }
          }),
        )
      } else {
        // Si hay error, mostrar mensaje de error
        const errorMsg = {
          id: Math.random().toString(36).slice(2),
          role: "assistant" as const,
          content: chatError || "Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.",
          createdAt: new Date().toISOString(),
        }

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c
            const msgs = [...(c.messages || []), errorMsg]
            return {
              ...c,
              messages: msgs,
              updatedAt: new Date().toISOString(),
              messageCount: msgs.length,
              preview: errorMsg.content.slice(0, 80),
            }
          }),
        )
      }
    }).catch((error) => {
      console.error('Error enviando mensaje:', error)
      setIsThinking(false)
      setThinkingConvId(null)
      
      // Mostrar mensaje de error
      const errorMsg = {
        id: Math.random().toString(36).slice(2),
        role: "assistant" as const,
        content: "Lo siento, hubo un error al conectar con el servicio de IA. Por favor, verifica tu configuración y intenta de nuevo.",
        createdAt: new Date().toISOString(),
      }

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c
          const msgs = [...(c.messages || []), errorMsg]
          return {
            ...c,
            messages: msgs,
            updatedAt: new Date().toISOString(),
            messageCount: msgs.length,
            preview: errorMsg.content.slice(0, 80),
          }
        }),
      )
    })
  }

  function editMessage(convId: string, messageId: string, newContent: string) {
    const now = new Date().toISOString()
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c
        const msgs = (c.messages || []).map((m) =>
          m.id === messageId ? { ...m, content: newContent, editedAt: now } : m,
        )
        return {
          ...c,
          messages: msgs,
          preview: msgs[msgs.length - 1]?.content?.slice(0, 80) || c.preview,
        }
      }),
    )
  }

  function resendMessage(convId: string, messageId: string) {
    const conv = conversations.find((c) => c.id === convId)
    const msg = conv?.messages?.find((m) => m.id === messageId)
    if (!msg) return
    sendMessage(convId, msg.content)
  }

  function pauseThinking() {
    setIsThinking(false)
    setThinkingConvId(null)
  }

  function handleUseTemplate(template: Template) {
    // This will be passed down to the ChatPanel component
    // The ChatPanel will handle inserting the template content to the Composer
    if (chatPanelRef.current) {
      chatPanelRef.current.insertTemplate(template.content)
    }
  }

  const composerRef = useRef<any>(null)
  const chatPanelRef = useRef<any>(null)

  const selected = conversations.find((c) => c.id === selectedId) || null

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
          folders={folders}
          folderCounts={folderCounts}
          selectedId={selectedId}
          onSelect={(id: string) => setSelectedId(id)}
          togglePin={togglePin}
          query={query}
          setQuery={setQuery}
          searchRef={searchRef}
          createFolder={createFolder}
          createNewChat={createNewChat}
          templates={templates}
          setTemplates={setTemplates}
          onUseTemplate={handleUseTemplate}
        />

        <main className="relative flex min-w-0 flex-1 flex-col">
          <Header 
            createNewChat={createNewChat} 
            sidebarCollapsed={sidebarCollapsed} 
            setSidebarOpen={setSidebarOpen} 
          />
          <ChatPanel
            ref={chatPanelRef}
            conversation={selected}
            onSend={(content: string) => {
              if (selected) {
                sendMessage(selected.id, content)
              }
            }}
            onEditMessage={(messageId: string, newContent: string) => {
              if (selected) {
                editMessage(selected.id, messageId, newContent)
              }
            }}
            onResendMessage={(messageId: string) => {
              if (selected) {
                resendMessage(selected.id, messageId)
              }
            }}
            isThinking={(isThinking || isAiThinking) && thinkingConvId === selected?.id}
            onPauseThinking={pauseThinking}
          />
        </main>
      </div>
    </div>
  )
}
