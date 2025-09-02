import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Interfaz para una conversación en el store
interface ConversationMetadata {
  id: string
  title: string
  preview: string
  pinned: boolean
  folder: string
  messageCount: number
  createdAt: string
  updatedAt: string
}

// Estado del store
interface ConversationStoreState {
  conversationIds: string[]
  conversations: Record<string, ConversationMetadata>
  
  // Acciones
  addConversation: (conversation: ConversationMetadata) => void
  removeConversation: (id: string) => void
  updateConversation: (id: string, updates: Partial<ConversationMetadata>) => void
  getConversationIds: () => string[]
  getConversationMetadata: (id: string) => ConversationMetadata | null
  getAllConversations: () => ConversationMetadata[]
  getFilteredConversations: (filter: {
    pinned?: boolean
    folder?: string
    search?: string
    limit?: number
  }) => ConversationMetadata[]
  clearAll: () => void
}

// Store con persistencia en localStorage
export const useConversationStore = create<ConversationStoreState>()(
  persist(
    (set, get) => ({
      conversationIds: [],
      conversations: {},
      
      addConversation: (conversation) => {
        set((state) => {
          const newConversations = { ...state.conversations }
          const newIds = [...state.conversationIds]
          
          // Agregar o actualizar la conversación
          newConversations[conversation.id] = conversation
          
          // Agregar ID al inicio si no existe
          if (!newIds.includes(conversation.id)) {
            newIds.unshift(conversation.id)
          }
          
          return {
            conversations: newConversations,
            conversationIds: newIds
          }
        })
      },
      
      removeConversation: (id) => {
        set((state) => {
          const newConversations = { ...state.conversations }
          const newIds = state.conversationIds.filter(existingId => existingId !== id)
          
          delete newConversations[id]
          
          return {
            conversations: newConversations,
            conversationIds: newIds
          }
        })
      },
      
      updateConversation: (id, updates) => {
        set((state) => {
          const existing = state.conversations[id]
          if (!existing) return state
          
          const newConversations = {
            ...state.conversations,
            [id]: {
              ...existing,
              ...updates,
              updatedAt: new Date().toISOString()
            }
          }
          
          return { ...state, conversations: newConversations }
        })
      },
      
      getConversationIds: () => {
        return get().conversationIds
      },
      
      getConversationMetadata: (id) => {
        return get().conversations[id] || null
      },
      
      getAllConversations: () => {
        const { conversationIds, conversations } = get()
        return conversationIds
          .map(id => conversations[id])
          .filter(Boolean)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      },
      
      getFilteredConversations: (filter) => {
        let conversations = get().getAllConversations()
        
        if (filter.pinned !== undefined) {
          conversations = conversations.filter(c => c.pinned === filter.pinned)
        }
        
        if (filter.folder) {
          conversations = conversations.filter(c => c.folder === filter.folder)
        }
        
        if (filter.search) {
          const search = filter.search.toLowerCase()
          conversations = conversations.filter(c => 
            c.title.toLowerCase().includes(search) ||
            c.preview.toLowerCase().includes(search)
          )
        }
        
        if (filter.limit) {
          conversations = conversations.slice(0, filter.limit)
        }
        
        return conversations
      },
      
      clearAll: () => {
        set({ conversationIds: [], conversations: {} })
      }
    }),
    {
      name: 'conversation-store',
      version: 1
    }
  )
)

export default useConversationStore
