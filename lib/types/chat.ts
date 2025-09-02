export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  editedAt?: string
}

export interface Conversation {
  id: string
  title: string
  updatedAt: string
  messageCount: number
  preview: string
  pinned: boolean
  folder: string
  messages: Message[]
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
