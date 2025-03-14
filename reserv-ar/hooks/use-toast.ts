"use client"

import { useContext } from "react"
import { ToastContext } from "@/components/ui/toaster"

type ToastProps = {
  title: string
  description?: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const context = useContext(ToastContext)

  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider")
  }

  return {
    toast: (props: ToastProps) => context.addToast(props),
    toasts: context.toasts,
    dismiss: context.removeToast,
  }
}

