"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations } from './translations'

interface LanguageContextValue {
  language: string;
  setLanguage: (language: string) => void;
  t: (key: string) => string;
  availableLanguages: string[];
  mounted: boolean;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<string>('en')
  const [mounted, setMounted] = useState<boolean>(false)

  useEffect(() => {
    // Marcar como montado para evitar problemas de hidratación
    setMounted(true)
    
    // Load saved language from localStorage
    try {
      const saved = localStorage.getItem('language')
      if (saved && (translations as any)[saved]) {
        setLanguage(saved)
      } else {
        // Detect browser language
        const browserLang = navigator.language.split('-')[0]
        if ((translations as any)[browserLang]) {
          setLanguage(browserLang)
        }
      }
    } catch (error) {
      console.warn('Error loading language:', error)
    }
  }, [])

  useEffect(() => {
    // Save language to localStorage only after mounting
    if (mounted) {
      try {
        localStorage.setItem('language', language)
      } catch (error) {
        console.warn('Error saving language:', error)
      }
    }
  }, [language, mounted])

  const t = (key: string): string => {
    return (translations as any)[language]?.[key] || (translations as any).en[key] || key
  }

  const value: LanguageContextValue = {
    language,
    setLanguage,
    t,
    availableLanguages: Object.keys(translations),
    mounted
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
