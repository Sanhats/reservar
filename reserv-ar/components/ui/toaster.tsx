"use client"

import type React from "react"
import { useState, useEffect, createContext, useContext } from "react"
import { X } from "lucide-react"

type Toast = {
  id: string
  title: string
  description?: string
  variant?: "default" | "destructive"
}

type ToastContextType = {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, "id">) => void
  removeToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      removeToast(id)
    }, 5000)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  )
}

export function Toaster() {
  const context = useContext(ToastContext)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !context || context.toasts.length === 0) return null

  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-4 w-full max-w-xs sm:max-w-md">
      {context.toasts.map((toast) => (
        <div
          key={toast.id}
          className={`p-4 rounded-lg shadow-lg transform transition-all duration-500 ease-in-out ${
            toast.variant === "destructive"
              ? "bg-red-600 text-white"
              : "bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100"
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{toast.title}</h3>
              {toast.description && <p className="text-sm mt-1">{toast.description}</p>}
            </div>
            <button
              onClick={() => context.removeToast(toast.id)}
              className="ml-4 inline-flex shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

