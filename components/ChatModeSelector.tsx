"use client"

import { Zap, Bot } from "lucide-react"
import { ChatMode } from "@/lib/services/openai"
import { cls } from "@/lib/utils/helpers"

interface ChatModeSelectorProps {
  mode: ChatMode
  onChange: (mode: ChatMode) => void
  className?: string
}

export default function ChatModeSelector({ mode, onChange, className }: ChatModeSelectorProps) {
  return (
    <div className={cls("flex items-center rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800", className)}>
      <button
        onClick={() => onChange('fast')}
        className={cls(
          "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          mode === 'fast'
            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        )}
        title="Modo rápido para conversaciones generales con razonamiento mínimo"
      >
        <Zap className="h-4 w-4" />
        Rápido
      </button>
      <button
        onClick={() => onChange('agent')}
        className={cls(
          "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          mode === 'agent'
            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        )}
        title="Modo agente para tareas complejas con razonamiento profundo y herramientas"
      >
        <Bot className="h-4 w-4" />
        Agente
      </button>
    </div>
  )
}
