"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Lightbulb } from "lucide-react"
import { useState, useEffect } from "react"
import { Template } from "@/lib/data/mockData"

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTemplate: (template: Partial<Template> & { name: string; content: string }) => void;
  editingTemplate?: Template | null;
}

export default function CreateTemplateModal({ 
  isOpen, 
  onClose, 
  onCreateTemplate, 
  editingTemplate = null 
}: CreateTemplateModalProps) {
  const [templateName, setTemplateName] = useState<string>(editingTemplate?.name || "")
  const [templateContent, setTemplateContent] = useState<string>(editingTemplate?.content || "")

  const isEditing = !!editingTemplate

  useEffect(() => {
    if (editingTemplate) {
      setTemplateName(editingTemplate.name || "")
      setTemplateContent(editingTemplate.content || "")
    } else {
      setTemplateName("")
      setTemplateContent("")
    }
  }, [editingTemplate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (templateName.trim() && templateContent.trim()) {
      const templateData = {
        name: templateName.trim(),
        content: templateContent.trim(),
        snippet: templateContent.trim().slice(0, 100) + (templateContent.trim().length > 100 ? "..." : ""),
        createdAt: editingTemplate?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      if (isEditing && editingTemplate) {
        onCreateTemplate({ ...templateData, id: editingTemplate.id })
      } else {
        onCreateTemplate(templateData)
      }

      handleCancel()
    }
  }

  const handleCancel = () => {
    setTemplateName("")
    setTemplateContent("")
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-blue-500" />
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {isEditing ? "Edit Template" : "Create Template"}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Enter template name..."
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Template Content
                  </label>
                  <textarea
                    value={templateContent}
                    onChange={(e) => setTemplateContent(e.target.value)}
                    placeholder="Enter template content..."
                    rows={8}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!templateName.trim() || !templateContent.trim()}
                    className="px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isEditing ? "Update Template" : "Create Template"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
