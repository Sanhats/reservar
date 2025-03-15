"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type UserType = "client" | "business" | null

type RoleRouterProps = {
  children: React.ReactNode
  requiredRole?: UserType
  redirectTo?: string
}

export default function RoleRouter({ children, requiredRole, redirectTo = "/" }: RoleRouterProps) {
  const { user, isLoading: authLoading } = useAuth()
  const [userType, setUserType] = useState<UserType>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchUserType = async () => {
      if (!user) {
        if (requiredRole) {
          // Si se requiere un rol específico y no hay usuario, redirigir
          toast({
            title: "Acceso denegado",
            description: "Debes iniciar sesión para acceder a esta página",
            variant: "destructive",
          })

          // Redirigir a la página de inicio de sesión correspondiente
          if (requiredRole === "client") {
            router.push(`/client/login?redirectedFrom=${window.location.pathname}`)
          } else if (requiredRole === "business") {
            router.push(`/business/login?redirectedFrom=${window.location.pathname}`)
          } else {
            router.push(redirectTo)
          }
        }

        setIsLoading(false)
        return
      }

      try {
        const { data, error } = await supabase.from("profiles").select("user_type").eq("id", user.id).single()

        if (error) throw error

        const role = data.user_type as UserType
        setUserType(role)

        // Si se requiere un rol específico y el usuario no lo tiene, redirigir
        if (requiredRole && role !== requiredRole) {
          toast({
            title: "Acceso denegado",
            description: `Esta página es solo para ${requiredRole === "client" ? "clientes" : "negocios"}`,
            variant: "destructive",
          })

          // Redirigir según el rol del usuario
          if (role === "client") {
            router.push("/businesses")
          } else if (role === "business") {
            router.push("/dashboard")
          } else {
            router.push(redirectTo)
          }
        }
      } catch (error) {
        console.error("Error fetching user type:", error)

        if (requiredRole) {
          toast({
            title: "Error",
            description: "No se pudo verificar tu acceso a esta página",
            variant: "destructive",
          })
          router.push(redirectTo)
        }
      } finally {
        setIsLoading(false)
      }
    }

    if (!authLoading) {
      fetchUserType()
    }
  }, [user, authLoading, requiredRole, redirectTo, router, toast])

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Verificando acceso...</span>
      </div>
    )
  }

  // Si se requiere un rol y el usuario no está autenticado, no mostrar nada
  // (la redirección ya se habrá iniciado)
  if (requiredRole && !user) {
    return null
  }

  // Si se requiere un rol específico y el usuario no lo tiene, no mostrar nada
  // (la redirección ya se habrá iniciado)
  if (requiredRole && userType !== requiredRole) {
    return null
  }

  return <>{children}</>
}

