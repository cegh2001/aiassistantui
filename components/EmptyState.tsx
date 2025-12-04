import { LoadingSpinner } from "./ui/loading-spinner"
import { useLanguage } from "../lib/i18n/LanguageContext"

interface EmptyStateProps {
  onCreateNewChat?: () => void
}

export function EmptyState({ onCreateNewChat }: EmptyStateProps) {
  const { t } = useLanguage()
  
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="mx-auto h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <span className="text-xl sm:text-2xl font-bold text-white">✱</span>
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t('welcomeToAI')}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            {t('selectConversationOrCreate')}
          </p>
        </div>
        <div className="flex justify-center">
          {onCreateNewChat && (
            <button 
              onClick={onCreateNewChat}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              {t('newChat')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function LoadingState() {
  const { t } = useLanguage()
  
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" className="mx-auto text-blue-500" />
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t('loadingConversation')}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            {t('pleaseWaitMoment')}
          </p>
        </div>
      </div>
    </div>
  )
}
