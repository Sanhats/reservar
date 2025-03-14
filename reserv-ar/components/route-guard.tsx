"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, refreshSession } = useAuth()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [refreshed, setRefreshed] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      console.log("RouteGuard - Verificando autenticación...")

      // Solo refrescar la sesión una vez para evitar bucles infinitos
      if (!refreshed && !isLoading) {
        setRefreshed(true)
        await refreshSession()
      }

      // Esperar un momento para asegurarnos de que la sesión se ha cargado
      if (!isLoading && refreshed) {
        setIsChecking(false)

        if (!user) {
          console.log("RouteGuard - No hay usuario, redirigiendo a login")
          router.push("/login")
        } else {
          console.log("RouteGuard - Usuario autenticado:", user.email)
        }
      }
    }

    checkAuth()
  }, [user, isLoading, router, refreshSession, refreshed])

  // Si está cargando o verificando, mostrar un indicador de carga
  if (isLoading || isChecking) {
    return (
      <div className="container py-10 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Verificando acceso...</CardTitle>
            <CardDescription className="text-center">
              Estamos verificando tu autenticación. Por favor, espera un momento.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Si no hay usuario después de verificar, mostrar un mensaje de error
  if (!user) {
    return (
      <div className="container py-10 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Acceso denegado</CardTitle>
            <CardDescription className="text-center">Debes iniciar sesión para acceder a esta página.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => router.push("/login")}>Iniciar sesión</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Si el usuario está autenticado, mostrar el contenido
  return <>{children}</>
}

