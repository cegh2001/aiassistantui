"use client"
import { useState } from "react"
import { User, Globe, HelpCircle, Crown, BookOpen, LogOut, ChevronRight, Check } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { useLanguage } from "../lib/i18n/LanguageContext"

interface SettingsPopoverProps {
  children: React.ReactNode;
}

interface LanguageNames {
  [key: string]: string;
}

export default function SettingsPopover({ children }: SettingsPopoverProps) {
  const [open, setOpen] = useState(false)
  const [showLanguageSettings, setShowLanguageSettings] = useState(false)
  const { language, setLanguage, t, availableLanguages } = useLanguage()

  const languageNames: LanguageNames = {
    en: "English",
    es: "Español"
  }

  const handleLanguageSelect = (selectedLanguage: string) => {
    setLanguage(selectedLanguage)
    setShowLanguageSettings(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="top">
        <div className="p-4">
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">j@gmail.com</div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 mb-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">{t('personal') || 'Personal'}</span>
            </div>
            <div className="ml-auto">
              <div className="text-xs text-zinc-500">{t('proPlan') || 'Pro plan'}</div>
            </div>
            <div className="text-blue-500">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          {!showLanguageSettings ? (
            <div className="space-y-1">
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">{t('settings')}</div>

              <button 
                onClick={() => setShowLanguageSettings(true)}
                className="flex items-center gap-3 w-full p-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                <Globe className="h-4 w-4" />
                <span>{t('language')}</span>
                <div className="ml-auto text-xs text-zinc-500">
                  {languageNames[language]}
                </div>
                <ChevronRight className="h-4 w-4" />
              </button>

              <button className="flex items-center gap-3 w-full p-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <HelpCircle className="h-4 w-4" />
                <span>{t('getHelp') || 'Get help'}</span>
              </button>

              <button className="flex items-center gap-3 w-full p-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <Crown className="h-4 w-4" />
                <span>{t('upgradePlan') || 'Upgrade plan'}</span>
              </button>

              <button className="flex items-center gap-3 w-full p-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <BookOpen className="h-4 w-4" />
                <span>{t('learnMore') || 'Learn more'}</span>
                <ChevronRight className="h-4 w-4 ml-auto" />
              </button>

              <button className="flex items-center gap-3 w-full p-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <LogOut className="h-4 w-4" />
                <span>{t('logOut') || 'Log out'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3">
                <button 
                  onClick={() => setShowLanguageSettings(false)}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </button>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t('language')}</div>
              </div>

              {availableLanguages.map((lang: string) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageSelect(lang)}
                  className="flex items-center gap-3 w-full p-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  <Globe className="h-4 w-4" />
                  <span>{languageNames[lang]}</span>
                  {language === lang && (
                    <Check className="h-4 w-4 ml-auto text-blue-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
