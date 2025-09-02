import type { Conversation, Message } from '@/lib/types/chat'

// Simplificar el manejo de conversaciones para usar solo estado local por ahora
// TODO: Integrar con OpenAI Conversations API cuando esté disponible
// TODO: import OpenAI from 'openai' cuando sea necesario

export class ConversationService {
  private static instance: ConversationService
  
  private constructor() {}
  
  static getInstance(): ConversationService {
    if (!ConversationService.instance) {
      ConversationService.instance = new ConversationService()
    }
    return ConversationService.instance
  }

  /**
   * Crea una nueva conversación local
   */
  async createConversation(title?: string): Promise<string> {
    try {
      const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const now = new Date().toISOString()
      
      const conversation: Conversation = {
        id,
        title: title || 'Nueva conversación',
        updatedAt: now,
        messageCount: 0,
        preview: 'Nueva conversación...',
        pinned: false,
        folder: 'General',
        messages: []
      }

      // Guardar en localStorage
      this.saveConversation(conversation)
      
      return id
    } catch (error) {
      console.error('Error creando conversación:', error)
      throw new Error('No se pudo crear la conversación')
    }
  }

  /**
   * Obtiene una conversación por ID desde localStorage
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const conversations = this.getAllConversations()
      return conversations.find(c => c.id === conversationId) || null
    } catch (error) {
      console.error('Error obteniendo conversación:', error)
      return null
    }
  }

  /**
   * Lista todas las conversaciones del localStorage
   */
  async listConversations(limit: number = 20): Promise<Conversation[]> {
    try {
      const conversations = this.getAllConversations()
      return conversations
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, limit)
    } catch (error) {
      console.error('Error listando conversaciones:', error)
      return []
    }
  }

  /**
   * Obtiene todas las conversaciones desde localStorage
   */
  private getAllConversations(): Conversation[] {
    try {
      const stored = localStorage.getItem('conversations')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  /**
   * Guarda una conversación en localStorage
   */
  private saveConversation(conversation: Conversation): void {
    try {
      const conversations = this.getAllConversations()
      const index = conversations.findIndex(c => c.id === conversation.id)
      
      if (index >= 0) {
        conversations[index] = conversation
      } else {
        conversations.push(conversation)
      }
      
      localStorage.setItem('conversations', JSON.stringify(conversations))
    } catch (error) {
      console.error('Error guardando conversación:', error)
    }
  }

  /**
   * Actualiza una conversación
   */
  async updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId)
      if (!conversation) {
        throw new Error('Conversación no encontrada')
      }

      const updatedConversation = {
        ...conversation,
        ...updates,
        updatedAt: new Date().toISOString()
      }

      this.saveConversation(updatedConversation)
    } catch (error) {
      console.error('Error actualizando conversación:', error)
      throw error
    }
  }

  /**
   * Agrega un mensaje a una conversación
   */
  async addMessage(conversationId: string, message: Message): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId)
      if (!conversation) {
        throw new Error('Conversación no encontrada')
      }

      const updatedMessages = [...conversation.messages, message]
      const preview = message.content.slice(0, 80)

      // Si es el primer mensaje del usuario, generar un título inteligente
      let title = conversation.title
      if (updatedMessages.length === 1 && message.role === 'user') {
        title = this.generateSmartTitle(message.content)
      }

      await this.updateConversation(conversationId, {
        messages: updatedMessages,
        messageCount: updatedMessages.length,
        preview,
        title,
        updatedAt: message.createdAt
      })
    } catch (error) {
      console.error('Error agregando mensaje:', error)
      throw error
    }
  }

  /**
   * Genera un título inteligente basado en el contenido del primer mensaje
   */
  private generateSmartTitle(content: string): string {
    // Limpiar el contenido
    const cleanContent = content.trim()
    
    // Si es muy corto, usar como está
    if (cleanContent.length <= 30) {
      return cleanContent
    }
    
    // Buscar la primera oración completa
    const firstSentence = cleanContent.split(/[.!?]+/)[0]
    if (firstSentence && firstSentence.length <= 50) {
      return firstSentence.trim()
    }
    
    // Si no hay oración clara, tomar las primeras palabras
    const words = cleanContent.split(' ')
    if (words.length <= 6) {
      return cleanContent
    }
    
    // Tomar las primeras 5-6 palabras
    return words.slice(0, 6).join(' ') + '...'
  }

  /**
   * Actualiza un mensaje en una conversación
   */
  async updateMessage(conversationId: string, messageId: string, content: string): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId)
      if (!conversation) {
        throw new Error('Conversación no encontrada')
      }

      const updatedMessages = conversation.messages.map(msg =>
        msg.id === messageId 
          ? { ...msg, content, editedAt: new Date().toISOString() }
          : msg
      )

      await this.updateConversation(conversationId, {
        messages: updatedMessages,
        preview: updatedMessages[updatedMessages.length - 1]?.content?.slice(0, 80) || conversation.preview
      })
    } catch (error) {
      console.error('Error actualizando mensaje:', error)
      throw error
    }
  }

  /**
   * Alterna el estado de pin de una conversación
   */
  async togglePin(conversationId: string): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId)
      if (!conversation) {
        throw new Error('Conversación no encontrada')
      }

      await this.updateConversation(conversationId, {
        pinned: !conversation.pinned
      })
    } catch (error) {
      console.error('Error alternando pin:', error)
      throw error
    }
  }

  /**
   * Actualiza el título de una conversación
   */
  async updateTitle(conversationId: string, title: string): Promise<void> {
    try {
      await this.updateConversation(conversationId, { title })
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
      await this.updateConversation(conversationId, { folder })
    } catch (error) {
      console.error('Error actualizando carpeta:', error)
      throw error
    }
  }

  /**
   * Elimina una conversación
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      const conversations = this.getAllConversations()
      const filtered = conversations.filter(c => c.id !== conversationId)
      localStorage.setItem('conversations', JSON.stringify(filtered))
    } catch (error) {
      console.error('Error eliminando conversación:', error)
      throw error
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
      let conversations = this.getAllConversations()

      // Filtrar por pin
      if (filter.pinned !== undefined) {
        conversations = conversations.filter(c => c.pinned === filter.pinned)
      }

      // Filtrar por carpeta
      if (filter.folder) {
        conversations = conversations.filter(c => c.folder === filter.folder)
      }

      // Filtrar por búsqueda
      if (filter.search) {
        const search = filter.search.toLowerCase()
        conversations = conversations.filter(c => 
          c.title.toLowerCase().includes(search) ||
          c.preview.toLowerCase().includes(search)
        )
      }

      // Ordenar por fecha de actualización
      conversations.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )

      // Limitar resultados
      if (filter.limit) {
        conversations = conversations.slice(0, filter.limit)
      }

      return conversations
    } catch (error) {
      console.error('Error obteniendo conversaciones filtradas:', error)
      return []
    }
  }
}

export default ConversationService
