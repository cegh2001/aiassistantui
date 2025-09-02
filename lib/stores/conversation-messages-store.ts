import { Message } from '@/lib/types/chat'

/**
 * Store temporal para manejar mensajes de conversaciones mientras resolvemos
 * la integración con la API de OpenAI Conversations.
 * Persiste en localStorage para mantener mensajes del asistente al recargar.
 */
class ConversationMessagesStore {
  private static instance: ConversationMessagesStore
  private messages: Map<string, Message[]> = new Map()
  private readonly storageKey = 'conversation-messages'

  private constructor() {
    // Solo cargar en el cliente, no en el servidor
    if (typeof window !== 'undefined') {
      this.loadFromStorage()
    }
  }

  static getInstance(): ConversationMessagesStore {
    if (!ConversationMessagesStore.instance) {
      ConversationMessagesStore.instance = new ConversationMessagesStore()
    }
    return ConversationMessagesStore.instance
  }

  /**
   * Carga mensajes desde localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return // Server-side
    
    try {
      const data = localStorage.getItem(this.storageKey)
      if (data) {
        const parsed = JSON.parse(data)
        // Convertir el objeto plano de vuelta a Map
        this.messages = new Map(Object.entries(parsed))
        console.log(`📁 Mensajes cargados desde localStorage: ${this.messages.size} conversaciones`)
      }
    } catch (error) {
      console.error('❌ Error cargando mensajes desde localStorage:', error)
      this.messages = new Map()
    }
  }

  /**
   * Método público para recargar desde localStorage
   */
  public reloadFromStorage(): void {
    this.loadFromStorage()
  }

  /**
   * Guarda mensajes en localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return // Server-side
    
    try {
      // Convertir Map a objeto plano para serialización
      const obj = Object.fromEntries(this.messages)
      localStorage.setItem(this.storageKey, JSON.stringify(obj))
    } catch (error) {
      console.error('❌ Error guardando mensajes en localStorage:', error)
    }
  }

  /**
   * Agrega un mensaje a una conversación
   */
  addMessage(conversationId: string, message: Message): void {
    const conversationMessages = this.messages.get(conversationId) || []
    
    // Evitar duplicados por ID
    const existingIndex = conversationMessages.findIndex(m => m.id === message.id)
    if (existingIndex >= 0) {
      conversationMessages[existingIndex] = message
    } else {
      conversationMessages.push(message)
    }
    
    // Ordenar por fecha de creación
    conversationMessages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    
    this.messages.set(conversationId, conversationMessages)
    
    // Guardar en localStorage
    this.saveToStorage()
    
    console.log(`📝 Mensaje agregado al store local (persistido) - ${conversationId}: ${message.role} (${message.content.substring(0, 50)}...)`)
  }

  /**
   * Obtiene todos los mensajes de una conversación
   */
  getMessages(conversationId: string): Message[] {
    return this.messages.get(conversationId) || []
  }

  /**
   * Combina mensajes de OpenAI con mensajes del store local
   */
  mergeMessages(conversationId: string, openaiMessages: Message[]): Message[] {
    const localMessages = this.getMessages(conversationId)
    const allMessages = [...openaiMessages, ...localMessages]
    
    // Remover duplicados por ID
    const uniqueMessages = allMessages.reduce((acc, current) => {
      const existing = acc.find(m => m.id === current.id)
      if (!existing) {
        acc.push(current)
      }
      return acc
    }, [] as Message[])
    
    // Ordenar por fecha de creación
    uniqueMessages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    
    return uniqueMessages
  }

  /**
   * Elimina todos los mensajes de una conversación
   */
  clearMessages(conversationId: string): void {
    this.messages.delete(conversationId)
    this.saveToStorage()
  }

  /**
   * Obtiene el conteo de mensajes de una conversación
   */
  getMessageCount(conversationId: string): number {
    const messages = this.getMessages(conversationId)
    return messages.length
  }

  /**
   * Obtiene el último mensaje de una conversación
   */
  getLastMessage(conversationId: string): Message | null {
    const messages = this.getMessages(conversationId)
    return messages.length > 0 ? messages[messages.length - 1] : null
  }
}

export default ConversationMessagesStore
