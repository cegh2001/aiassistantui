import { LoadingSpinner } from "./ui/loading-spinner"

interface EmptyStateProps {
  onCreateNewChat?: () => void
  onToggleSidebar?: () => void
}

export function EmptyState({ onCreateNewChat, onToggleSidebar }: EmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <span className="text-2xl font-bold text-white">✱</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Bienvenido a AI Assistant
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Selecciona una conversación existente o crea una nueva para comenzar
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onCreateNewChat && (
            <button 
              onClick={onCreateNewChat}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              Nueva conversación
            </button>
          )}
          {onToggleSidebar && (
            <button 
              onClick={onToggleSidebar}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Ver historial
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function LoadingState() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" className="mx-auto text-blue-500" />
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Cargando conversación...
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Por favor espera un momento
          </p>
        </div>
      </div>
    </div>
  )
}
