import type { Conversation, Message } from '@/lib/types/chat'
import useConversationStore from '@/lib/stores/conversation-store'

export class ConversationClientService {
  private static instance: ConversationClientService
  private store = useConversationStore.getState()
  
  private constructor() {}
  
  static getInstance(): ConversationClientService {
    if (!ConversationClientService.instance) {
      ConversationClientService.instance = new ConversationClientService()
    }
    return ConversationClientService.instance
  }

  /**
   * Crea una nueva conversación
   */
  async createConversation(title?: string, initialMessage?: string): Promise<string> {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, initialMessage }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error creando conversación')
      }

      // Agregar al store cliente también
      this.store.addConversation({
        id: result.data.id,
        title: title || 'Nueva conversación',
        preview: initialMessage ? initialMessage.substring(0, 80) : 'Nueva conversación...',
        pinned: false,
        folder: 'General',
        messageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      return result.data.id
    } catch (error) {
      console.error('Error creando conversación:', error)
      throw error
    }
  }

  /**
   * Obtiene una conversación por ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`)
      
      if (response.status === 404) {
        return null
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error obteniendo conversación')
      }

      return result.data
    } catch (error) {
      console.error('Error obteniendo conversación:', error)
      return null
    }
  }

  /**
   * Lista todas las conversaciones (primero desde el store local, luego sincroniza con servidor)
   */
  async listConversations(limit: number = 10): Promise<Conversation[]> {
    try {
      // Primero obtener desde el servidor
      const response = await fetch(`/api/conversations?limit=${limit}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error listando conversaciones')
      }

      // Sincronizar el store local con los datos del servidor
      const serverConversations = result.data
      for (const conversation of serverConversations) {
        this.store.addConversation({
          id: conversation.id,
          title: conversation.title || conversation.metadata?.title || 'Sin título',
          preview: conversation.preview || conversation.metadata?.preview || '',
          pinned: conversation.pinned || conversation.metadata?.pinned === 'true',
          folder: conversation.folder || conversation.metadata?.folder || 'General',
          messageCount: conversation.messageCount || parseInt(conversation.metadata?.messageCount || '0'),
          createdAt: conversation.updatedAt || new Date(conversation.created_at * 1000).toISOString(),
          updatedAt: conversation.updatedAt || new Date(conversation.created_at * 1000).toISOString()
        })
      }

      return serverConversations
    } catch (error) {
      console.error('Error listando conversaciones desde servidor, usando store local:', error)
      
      // Si falla el servidor, usar el store local
      const localConversations = this.store.getAllConversations()
      return localConversations.map(conv => ({
        id: conv.id,
        object: 'conversation',
        created_at: Math.floor(new Date(conv.createdAt).getTime() / 1000),
        title: conv.title,
        updatedAt: conv.updatedAt,
        messageCount: conv.messageCount,
        preview: conv.preview,
        pinned: conv.pinned,
        folder: conv.folder,
        metadata: {
          title: conv.title,
          preview: conv.preview,
          pinned: conv.pinned.toString(),
          folder: conv.folder,
          messageCount: conv.messageCount.toString(),
          updatedAt: conv.updatedAt
        }
      }))
    }
  }

  /**
   * Actualiza el título de una conversación
   */
  async updateTitle(conversationId: string, title: string): Promise<void> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error actualizando título')
      }

      // Actualizar en el store cliente también
      this.store.updateConversation(conversationId, { title })
    } catch (error) {
      console.error('Error actualizando título:', error)
      throw error
    }
  }

  /**
   * Actualiza la carpeta de una conversación
   */
  async updateFolder(conversationId: string, folder: string): Promise<void> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folder }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error actualizando carpeta')
      }

      // Actualizar en el store cliente también
      this.store.updateConversation(conversationId, { folder })
    } catch (error) {
      console.error('Error actualizando carpeta:', error)
      throw error
    }
  }

  /**
   * Alterna el estado de pin de una conversación
   */
  async togglePin(conversationId: string): Promise<void> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pinned: true }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error alternando pin')
      }

      // Actualizar en el store cliente también
      const current = this.store.getConversationMetadata(conversationId)
      if (current) {
        this.store.updateConversation(conversationId, { pinned: !current.pinned })
      }
    } catch (error) {
      console.error('Error alternando pin:', error)
      throw error
    }
  }

  /**
   * Elimina una conversación
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error eliminando conversación')
      }

      // Remover del store cliente también
      this.store.removeConversation(conversationId)
    } catch (error) {
      console.error('Error eliminando conversación:', error)
      throw error
    }
  }

  /**
   * Agrega un mensaje a una conversación
   */
  async addMessage(conversationId: string, message: Message): Promise<void> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error agregando mensaje')
      }
    } catch (error) {
      console.error('Error agregando mensaje:', error)
      throw error
    }
  }

  /**
   * Obtiene los mensajes de una conversación
   */
  async getMessages(conversationId: string, limit: number = 50): Promise<Message[]> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages?limit=${limit}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error obteniendo mensajes')
      }

      return result.data
    } catch (error) {
      console.error('Error obteniendo mensajes:', error)
      return []
    }
  }

  /**
   * Obtiene conversaciones filtradas
   */
  async getFilteredConversations(filter: {
    pinned?: boolean
    folder?: string
    search?: string
    limit?: number
  } = {}): Promise<Conversation[]> {
    try {
      const params = new URLSearchParams()
      
      if (filter.pinned !== undefined) {
        params.append('pinned', filter.pinned.toString())
      }
      if (filter.folder) {
        params.append('folder', filter.folder)
      }
      if (filter.search) {
        params.append('search', filter.search)
      }
      if (filter.limit) {
        params.append('limit', filter.limit.toString())
      }

      const response = await fetch(`/api/conversations?${params.toString()}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error obteniendo conversaciones filtradas')
      }

      return result.data
    } catch (error) {
      console.error('Error obteniendo conversaciones filtradas:', error)
      return []
    }
  }
}

export default ConversationClientService
