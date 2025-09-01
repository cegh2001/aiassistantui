"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { translations } from './translations'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Marcar como montado para evitar problemas de hidratación
    setMounted(true)
    
    // Load saved language from localStorage
    try {
      const saved = localStorage.getItem('language')
      if (saved && translations[saved]) {
        setLanguage(saved)
      } else {
        // Detect browser language
        const browserLang = navigator.language.split('-')[0]
        if (translations[browserLang]) {
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

  const t = (key) => {
    return translations[language]?.[key] || translations.en[key] || key
  }

  const value = {
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

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
