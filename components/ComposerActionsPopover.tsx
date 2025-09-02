"use client"
import React, { useState } from "react"
import { Paperclip, Bot, Search, Palette, BookOpen, MoreHorizontal, Globe, ChevronRight, LucideIcon, Lock } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { useLanguage } from "../lib/i18n/LanguageContext"
import { ChatMode } from "@/lib/services/openai"

interface Action {
  icon: LucideIcon | (() => React.ReactElement);
  label: string;
  badge?: string;
  action: () => void;
  disabled?: boolean;
  isToggle?: boolean;
  isActive?: boolean;
}

interface ComposerActionsPopoverProps {
  children: React.ReactNode;
  chatMode?: ChatMode;
  onModeChange?: (mode: ChatMode) => void;
}

export default function ComposerActionsPopover({ children, chatMode = "fast", onModeChange }: ComposerActionsPopoverProps) {
  const [open, setOpen] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const { t } = useLanguage()

  const handleModeToggle = () => {
    if (onModeChange) {
      const newMode = chatMode === "fast" ? "agent" : "fast"
      onModeChange(newMode)
    }
  }

  const mainActions: Action[] = [
    {
      icon: Paperclip,
      label: t('addPhotosFiles'),
      disabled: true,
      action: () => console.log("Add photos & files"),
    },
    {
      icon: Bot,
      label: t('agentMode'),
      badge: chatMode === "agent" ? t('agentModeDescription') : t('fastModeDescription'),
      isToggle: true,
      isActive: chatMode === "agent",
      action: handleModeToggle,
    },
    {
      icon: Search,
      label: t('deepResearch'),
      disabled: true,
      action: () => console.log("Deep research"),
    },
    {
      icon: Palette,
      label: t('createImage'),
      disabled: true,
      action: () => console.log("Create image"),
    },
    {
      icon: BookOpen,
      label: t('studyLearn'),
      disabled: true,
      action: () => console.log("Study and learn"),
    },
  ]

  const moreActions: Action[] = [
    {
      icon: Globe,
      label: t('webSearch'),
      disabled: true,
      action: () => console.log("Web search"),
    },
    {
      icon: Palette,
      label: t('canvas'),
      disabled: true,
      action: () => console.log("Canvas"),
    },
    {
      icon: () => (
        <div className="h-4 w-4 rounded bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
          <div className="h-2 w-2 bg-white rounded-full" />
        </div>
      ),
      label: t('connectGoogleDrive'),
      disabled: true,
      action: () => console.log("Connect Google Drive"),
    },
    {
      icon: () => (
        <div className="h-4 w-4 rounded bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center">
          <div className="h-2 w-2 bg-white rounded-full" />
        </div>
      ),
      label: t('connectOneDrive'),
      disabled: true,
      action: () => console.log("Connect OneDrive"),
    },
    {
      icon: () => (
        <div className="h-4 w-4 rounded bg-gradient-to-br from-teal-500 to-teal-400 flex items-center justify-center">
          <div className="h-2 w-2 bg-white rounded-full" />
        </div>
      ),
      label: t('connectSharepoint'),
      disabled: true,
      action: () => console.log("Connect Sharepoint"),
    },
  ]

  const handleAction = (action: () => void, disabled?: boolean) => {
    if (disabled) return
    action()
    setOpen(false)
    setShowMore(false)
  }

  const handleMoreClick = () => {
    setShowMore(true)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setShowMore(false)
    }
  }

  const renderActionButton = (action: Action, index: number) => {
    const IconComponent = action.icon
    const isDisabled = action.disabled && !action.isToggle
    
    return (
      <button
        key={index}
        onClick={() => handleAction(action.action, isDisabled)}
        disabled={isDisabled}
        className={`
          flex items-center gap-3 w-full p-2 text-sm text-left rounded-lg transition-colors relative
          ${isDisabled 
            ? 'opacity-50 cursor-not-allowed text-zinc-400 dark:text-zinc-600' 
            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }
          ${action.isToggle && action.isActive 
            ? 'bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800' 
            : ''
          }
        `}
      >
        <div className="relative">
          {typeof IconComponent === "function" ? 
            <IconComponent /> : 
            React.createElement(IconComponent, { className: "h-4 w-4" })
          }
          {isDisabled && (
            <Lock className="h-2 w-2 absolute -top-1 -right-1 text-zinc-400" />
          )}
        </div>
        <span className="flex-1">{action.label}</span>
        {action.badge && (
          <span className={`
            ml-auto px-2 py-0.5 text-xs rounded-full
            ${action.isToggle && action.isActive
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : isDisabled
                ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-600'
                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
            }
          `}>
            {action.badge}
          </span>
        )}
        {isDisabled && (
          <span className="ml-auto px-2 py-0.5 text-xs bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-600 rounded-full">
            {t('comingSoon')}
          </span>
        )}
      </button>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start" side="top">
        {!showMore ? (
          // Main actions view
          <div className="p-3">
            <div className="space-y-1">
              {mainActions.map((action, index) => renderActionButton(action, index))}
              <button
                onClick={handleMoreClick}
                className="flex items-center gap-3 w-full p-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span>{t('more')}</span>
                <ChevronRight className="h-4 w-4 ml-auto" />
              </button>
            </div>
          </div>
        ) : (
          // More options view with two columns
          <div className="flex">
            <div className="flex-1 p-3 border-r border-zinc-200 dark:border-zinc-800">
              <div className="space-y-1">
                {mainActions.map((action, index) => renderActionButton(action, index))}
                <button
                  onClick={handleMoreClick}
                  className="flex items-center gap-3 w-full p-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span>{t('more')}</span>
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-3">
              <div className="space-y-1">
                {moreActions.map((action, index) => renderActionButton(action, index))}
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
