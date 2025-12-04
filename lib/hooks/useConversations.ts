import { useState, useEffect, useCallback, useRef } from 'react'
import ConversationClientService from '@/lib/services/conversations-client'
import type { Conversation, Message } from '@/lib/types/chat'

export interface UseConversationsOptions {
  autoLoad?: boolean
}

export interface UseConversationsReturn {
  conversations: Conversation[]
  selectedConversation: Conversation | null
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  error: string | null
  
  // Operaciones de conversación
  createConversation: (title?: string) => Promise<string>
  selectConversation: (id: string) => Promise<Conversation | null>
  refreshSelectedConversation: (id: string) => Promise<Conversation | null>
  deleteConversation: (id: string) => Promise<void>
  updateConversationTitle: (id: string, title: string) => Promise<void>
  updateConversationFolder: (id: string, folder: string) => Promise<void>
  toggleConversationPin: (id: string) => Promise<void>
  
  // Operaciones de mensajes
  addMessage: (conversationId: string, message: Message) => Promise<void>
  
  // Utilidades
  refreshConversations: (forceRefresh?: boolean) => Promise<void>
  loadMoreConversations: () => Promise<void>
  getFilteredConversations: (filter: {
    pinned?: boolean
    folder?: string
    search?: string
    limit?: number
  }) => Conversation[]
  updateSelectedConversationOptimistically: (updater: (prev: Conversation | null) => Conversation | null) => void
}

export function useConversations(options: UseConversationsOptions = {}): UseConversationsReturn {
  const { autoLoad = true } = options
  
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Caché en memoria para conversaciones recién cargadas (optimización de velocidad)
  const [conversationCache, setConversationCache] = useState<Map<string, { conversation: Conversation, timestamp: number }>>(new Map())

  // Referencias para evitar bucles infinitos
  const lastLoadTimeRef = useRef<number>(0)
  const hasLoadedOnceRef = useRef<boolean>(false)
  const isLoadingRef = useRef<boolean>(false)

  const conversationService = ConversationClientService.getInstance()

  // Caché de 30 segundos para evitar cargas innecesarias
  const CACHE_DURATION = 30 * 1000 // 30 segundos
  const CONVERSATION_CACHE_DURATION = 60 * 1000 // 1 minuto para conversaciones individuales

  // Cargar conversaciones con caché (SIN dependencias de state para evitar bucles)
  const loadConversations = useCallback(async (forceRefresh = false) => {
    const now = Date.now()
    
    // Evitar llamadas concurrentes
    if (isLoadingRef.current) {
      console.log('⏳ Ya hay una carga en progreso, ignorando...')
      return
    }
    
    // Si ya cargamos una vez y no es forzado, usar caché por tiempo
    if (!forceRefresh && hasLoadedOnceRef.current && (now - lastLoadTimeRef.current) < CACHE_DURATION) {
      console.log('📦 Usando caché de conversaciones')
      return
    }

    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)
    
    try {
      const loadedConversations = await conversationService.listConversations()
      setConversations(loadedConversations)
      lastLoadTimeRef.current = now
      hasLoadedOnceRef.current = true
      
      // Si obtenemos exactamente 10 conversaciones (el límite inicial), hay posibilidad de más
      setHasMore(loadedConversations.length === 10)
      
      console.log(`✅ Cargadas ${loadedConversations.length} conversaciones`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando conversaciones'
      setError(errorMessage)
      console.error('Error cargando conversaciones:', err)
      // Marcar como cargado aunque falle para no reintentar infinitamente
      hasLoadedOnceRef.current = true
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [conversationService]) // Solo depende del servicio (estable)

  // Crear nueva conversación
  const createConversation = useCallback(async (title?: string): Promise<string> => {
    try {
      const id = await conversationService.createConversation(title)
      await loadConversations(true) // Forzar recarga después de crear
      return id
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creando conversación'
      setError(errorMessage)
      throw err
    }
  }, [conversationService, loadConversations])

  // Seleccionar conversación con caché inteligente
  const selectConversation = useCallback(async (id: string): Promise<Conversation | null> => {
    try {
      // Optimización 1: Verificar si ya tenemos la conversación cargada y es la misma
      if (selectedConversation?.id === id && selectedConversation.messages) {
        console.log('📦 Usando conversación ya seleccionada')
        return selectedConversation
      }

      // Optimización 2: Verificar caché en memoria (SOLO si no es un refresh por mensaje nuevo)
      const cached = conversationCache.get(id)
      if (cached) {
        const age = Date.now() - cached.timestamp
        if (age < CONVERSATION_CACHE_DURATION) {
          console.log('📦 Usando conversación desde caché en memoria')
          setSelectedConversation(cached.conversation)
          return cached.conversation
        } else {
          // Limpiar caché expirado
          setConversationCache(prev => {
            const newCache = new Map(prev)
            newCache.delete(id)
            return newCache
          })
        }
      }

      console.log('🔄 Cargando conversación desde servidor...')
      const conversation = await conversationService.getConversation(id)
      
      if (conversation) {
        // Guardar en caché para uso futuro
        setConversationCache(prev => {
          const newCache = new Map(prev)
          newCache.set(id, { conversation, timestamp: Date.now() })
          return newCache
        })
        
        setSelectedConversation(conversation)
      }
      
      return conversation
    } catch (err) {
      console.error('Error seleccionando conversación:', err)
      setError('Error cargando conversación')
      return null
    }
  }, [conversationService, selectedConversation, conversationCache, CONVERSATION_CACHE_DURATION])

  // Nueva función para refrescar conversación (sin caché, para después de enviar mensajes)
  const refreshSelectedConversation = useCallback(async (id: string): Promise<Conversation | null> => {
    try {
      console.log('🔄 Refrescando conversación desde servidor...')
      
      // Limpiar caché para esta conversación
      setConversationCache(prev => {
        const newCache = new Map(prev)
        newCache.delete(id)
        return newCache
      })
      
      const conversation = await conversationService.getConversation(id)
      
      if (conversation) {
        // Actualizar caché con la nueva versión
        setConversationCache(prev => {
          const newCache = new Map(prev)
          newCache.set(id, { conversation, timestamp: Date.now() })
          return newCache
        })
        
        setSelectedConversation(conversation)
      }
      
      return conversation
    } catch (err) {
      console.error('Error refrescando conversación:', err)
      setError('Error refrescando conversación')
      return null
    }
  }, [conversationService])

  // Eliminar conversación
  const deleteConversation = useCallback(async (id: string) => {
    try {
      await conversationService.deleteConversation(id)
      
      // Si la conversación eliminada era la seleccionada, limpiar selección
      if (selectedConversation?.id === id) {
        setSelectedConversation(null)
      }
      
      await loadConversations()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error eliminando conversación'
      setError(errorMessage)
      throw err
    }
  }, [conversationService, loadConversations, selectedConversation])

  // Actualizar título de conversación
  const updateConversationTitle = useCallback(async (id: string, title: string) => {
    try {
      await conversationService.updateTitle(id, title)
      
      // Actualizar conversación seleccionada si es la misma
      if (selectedConversation?.id === id) {
        setSelectedConversation(prev => prev ? { 
          ...prev, 
          title,
          metadata: { ...prev.metadata, title }
        } : null)
      }
      
      await loadConversations()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error actualizando título'
      setError(errorMessage)
      throw err
    }
  }, [conversationService, loadConversations, selectedConversation])

  // Actualizar carpeta de conversación
  const updateConversationFolder = useCallback(async (id: string, folder: string) => {
    try {
      await conversationService.updateFolder(id, folder)
      
      // Actualizar conversación seleccionada si es la misma
      if (selectedConversation?.id === id) {
        setSelectedConversation(prev => prev ? { 
          ...prev, 
          folder,
          metadata: { ...prev.metadata, folder }
        } : null)
      }
      
      await loadConversations()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error actualizando carpeta'
      setError(errorMessage)
      throw err
    }
  }, [conversationService, loadConversations, selectedConversation])

  // Alternar pin de conversación
  const toggleConversationPin = useCallback(async (id: string) => {
    try {
      await conversationService.togglePin(id)
      
      // Actualizar conversación seleccionada si es la misma
      if (selectedConversation?.id === id) {
        setSelectedConversation(prev => prev ? { 
          ...prev, 
          pinned: !prev.pinned,
          metadata: { ...prev.metadata, pinned: (!prev.pinned).toString() }
        } : null)
      }
      
      await loadConversations()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error alternando pin'
      setError(errorMessage)
      throw err
    }
  }, [conversationService, loadConversations, selectedConversation])

  // Agregar mensaje
  const addMessage = useCallback(async (conversationId: string, message: Message) => {
    try {
      await conversationService.addMessage(conversationId, message)
      
      // Actualizar conversación seleccionada si es la misma, SIN refrescar desde servidor
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(prev => {
          if (!prev) return null
          
          const updatedMessages = [...(prev.messages || []), message]
          return {
            ...prev,
            messages: updatedMessages,
            messageCount: updatedMessages.length,
            updatedAt: message.createdAt,
            preview: message.content.slice(0, 80)
          }
        })
      }
      
      // Solo refrescar la lista de conversaciones, no la conversación actual
      await loadConversations()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error agregando mensaje'
      setError(errorMessage)
      throw err
    }
  }, [conversationService, selectedConversation, loadConversations])

  // Cargar más conversaciones
  const loadMoreConversations = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    
    setIsLoadingMore(true)
    setError(null)
    
    try {
      const moreConversations = await conversationService.loadMoreConversations(conversations.length, 5)
      
      if (moreConversations.length === 0) {
        setHasMore(false)
      } else {
        setConversations(prev => [...prev, ...moreConversations])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando más conversaciones'
      setError(errorMessage)
      console.error('Error cargando más conversaciones:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [conversationService, conversations.length, isLoadingMore, hasMore])

  // Refrescar conversaciones con caché inteligente
  const refreshConversations = useCallback(async (forceRefresh = false) => {
    await loadConversations(forceRefresh)
  }, [loadConversations])

  // Actualización optimista de mensajes (solo en UI local)
  const updateSelectedConversationOptimistically = useCallback((updater: (prev: Conversation | null) => Conversation | null) => {
    setSelectedConversation(updater)
  }, [])

  // Obtener conversaciones filtradas (usa caché local)
  const getFilteredConversations = useCallback((filter: {
    pinned?: boolean
    folder?: string
    search?: string
    limit?: number
  }) => {
    let filtered = [...conversations]

    // Filtrar por pin
    if (filter.pinned !== undefined) {
      filtered = filtered.filter(c => c.pinned === filter.pinned)
    }

    // Filtrar por carpeta
    if (filter.folder) {
      filtered = filtered.filter(c => (c.folder || 'General') === filter.folder)
    }

    // Filtrar por búsqueda
    if (filter.search) {
      const search = filter.search.toLowerCase()
      filtered = filtered.filter(c => 
        (c.title || '').toLowerCase().includes(search) ||
        (c.preview || '').toLowerCase().includes(search)
      )
    }

    // Ordenar por fecha de actualización
    filtered.sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : a.created_at * 1000
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : b.created_at * 1000
      return bTime - aTime
    })

    // Limitar resultados
    if (filter.limit) {
      filtered = filtered.slice(0, filter.limit)
    }

    return filtered
  }, [conversations])

  // Cargar conversaciones al inicializar
  useEffect(() => {
    if (autoLoad) {
      loadConversations()
    }
  }, [autoLoad, loadConversations])

  return {
    conversations,
    selectedConversation,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    
    createConversation,
    selectConversation,
    refreshSelectedConversation,
    deleteConversation,
    updateConversationTitle,
    updateConversationFolder,
    toggleConversationPin,
    
    addMessage,
    
    refreshConversations,
    loadMoreConversations,
    getFilteredConversations,
    updateSelectedConversationOptimistically
  }
}
