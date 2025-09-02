"use client"

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle2, Settings } from 'lucide-react'

interface OpenAIStatusProps {
  className?: string
}

export default function OpenAIStatus({ className = "" }: OpenAIStatusProps) {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkOpenAIStatus()
  }, [])

  const checkOpenAIStatus = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "test"
        }),
      })

      const result = await response.json()
      
      if (result.error && result.error.includes('OpenAI API key no configurada')) {
        setIsConfigured(false)
      } else {
        setIsConfigured(true)
      }
    } catch (error) {
      console.error('Error checking OpenAI status:', error)
      setIsConfigured(false)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-zinc-500 ${className}`}>
        <Settings className="h-4 w-4 animate-spin" />
        <span>Verificando configuración...</span>
      </div>
    )
  }

  if (isConfigured === false) {
    return (
      <div className={`flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 ${className}`}>
        <AlertCircle className="h-4 w-4" />
        <span>OpenAI no configurado</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 text-sm text-green-600 dark:text-green-400 ${className}`}>
      <CheckCircle2 className="h-4 w-4" />
      <span>OpenAI conectado</span>
    </div>
  )
}
