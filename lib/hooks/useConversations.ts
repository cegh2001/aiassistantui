import { useState, useEffect, useCallback } from 'react'
import ConversationService from '@/lib/services/conversations'
import type { Conversation, Message } from '@/lib/types/chat'

export interface UseConversationsOptions {
  autoLoad?: boolean
}

export interface UseConversationsReturn {
  conversations: Conversation[]
  selectedConversation: Conversation | null
  isLoading: boolean
  error: string | null
  
  // Operaciones de conversación
  createConversation: (title?: string) => Promise<string>
  selectConversation: (id: string) => void
  deleteConversation: (id: string) => Promise<void>
  updateConversationTitle: (id: string, title: string) => Promise<void>
  updateConversationFolder: (id: string, folder: string) => Promise<void>
  toggleConversationPin: (id: string) => Promise<void>
  
  // Operaciones de mensajes
  addMessage: (conversationId: string, message: Message) => Promise<void>
  updateMessage: (conversationId: string, messageId: string, content: string) => Promise<void>
  
  // Utilidades
  refreshConversations: () => Promise<void>
  getFilteredConversations: (filter: {
    pinned?: boolean
    folder?: string
    search?: string
    limit?: number
  }) => Conversation[]
}

export function useConversations(options: UseConversationsOptions = {}): UseConversationsReturn {
  const { autoLoad = true } = options
  
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const conversationService = ConversationService.getInstance()

  // Cargar conversaciones
  const loadConversations = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const loadedConversations = await conversationService.listConversations()
      setConversations(loadedConversations)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando conversaciones'
      setError(errorMessage)
      console.error('Error cargando conversaciones:', err)
    } finally {
      setIsLoading(false)
    }
  }, [conversationService])

  // Crear nueva conversación
  const createConversation = useCallback(async (title?: string): Promise<string> => {
    try {
      const id = await conversationService.createConversation(title)
      await loadConversations()
      return id
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creando conversación'
      setError(errorMessage)
      throw err
    }
  }, [conversationService, loadConversations])

  // Seleccionar conversación
  const selectConversation = useCallback(async (id: string) => {
    try {
      const conversation = await conversationService.getConversation(id)
      setSelectedConversation(conversation)
    } catch (err) {
      console.error('Error seleccionando conversación:', err)
      setError('Error cargando conversación')
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
        setSelectedConversation(prev => prev ? { ...prev, title } : null)
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
        setSelectedConversation(prev => prev ? { ...prev, folder } : null)
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
        setSelectedConversation(prev => prev ? { ...prev, pinned: !prev.pinned } : null)
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
      
      // Actualizar conversación seleccionada si es la misma
      if (selectedConversation?.id === conversationId) {
        const updatedConversation = await conversationService.getConversation(conversationId)
        setSelectedConversation(updatedConversation)
      }
      
      await loadConversations()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error agregando mensaje'
      setError(errorMessage)
      throw err
    }
  }, [conversationService, loadConversations, selectedConversation])

  // Actualizar mensaje
  const updateMessage = useCallback(async (conversationId: string, messageId: string, content: string) => {
    try {
      await conversationService.updateMessage(conversationId, messageId, content)
      
      // Actualizar conversación seleccionada si es la misma
      if (selectedConversation?.id === conversationId) {
        const updatedConversation = await conversationService.getConversation(conversationId)
        setSelectedConversation(updatedConversation)
      }
      
      await loadConversations()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error actualizando mensaje'
      setError(errorMessage)
      throw err
    }
  }, [conversationService, loadConversations, selectedConversation])

  // Obtener conversaciones filtradas
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
      filtered = filtered.filter(c => c.folder === filter.folder)
    }

    // Filtrar por búsqueda
    if (filter.search) {
      const search = filter.search.toLowerCase()
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(search) ||
        c.preview.toLowerCase().includes(search)
      )
    }

    // Ordenar por fecha de actualización
    filtered.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )

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
    error,
    
    createConversation,
    selectConversation,
    deleteConversation,
    updateConversationTitle,
    updateConversationFolder,
    toggleConversationPin,
    
    addMessage,
    updateMessage,
    
    refreshConversations: loadConversations,
    getFilteredConversations
  }
}
