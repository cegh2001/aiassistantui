// Tipos compatibles con OpenAI Conversations API
export interface ConversationItem {
  type: "message" | "response"
  id: string
  status: "in_progress" | "completed" | "failed"
  role: "user" | "assistant"
  content: Array<{
    type: "input_text" | "output_text"
    text: string
  }>
  created_at?: number
}

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  editedAt?: string
}

export interface Conversation {
  id: string
  object: "conversation"
  created_at: number
  metadata: Record<string, string> // OpenAI metadata is always string -> string
  // Propiedades locales para compatibilidad con UI existente
  title?: string
  updatedAt?: string
  messageCount?: number
  preview?: string
  pinned?: boolean
  folder?: string
  messages?: Message[]
}

export interface Template {
  id: string
  name: string
  content: string
  snippet: string
  createdAt: string
  updatedAt: string
}

export interface Folder {
  id: string
  name: string
}
