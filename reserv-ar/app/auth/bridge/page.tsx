"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth"

export default function AuthBridgePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") || "/dashboard"
  const { user, isLoading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(5)

  // Efecto para la cuenta regresiva
  useEffect(() => {
    if (user && !isLoading) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [user, isLoading])

  // Efecto separado para la redirección
  useEffect(() => {
    if (countdown <= 0 && user) {
      // Usar setTimeout para evitar actualizar durante el renderizado
      setTimeout(() => {
        router.push(redirectTo)
      }, 0)
    }
  }, [countdown, user, router, redirectTo])

  // Efecto para manejar el error
  useEffect(() => {
    if (!isLoading && !user) {
      setError("No se pudo completar la autenticación. Por favor, intenta iniciar sesión nuevamente.")
    }
  }, [isLoading, user])

  const handleManualRedirect = () => {
    router.push(redirectTo)
  }

  if (isLoading) {
    return (
      <div className="container flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Autenticando...</CardTitle>
            <CardDescription className="text-center">
              Estamos verificando tu identidad. Por favor, espera un momento.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Error de autenticación</CardTitle>
            <CardDescription className="text-center text-red-500">{error}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push("/login")}>Volver a iniciar sesión</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">¡Autenticación exitosa!</CardTitle>
          <CardDescription className="text-center">
            Has iniciado sesión correctamente. Serás redirigido automáticamente en {countdown} segundos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <div className="text-center">
            <p className="mb-4">
              Usuario: <strong>{user?.email}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Si no eres redirigido automáticamente, haz clic en el botón de abajo.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={handleManualRedirect}>Ir al dashboard ahora</Button>
        </CardFooter>
      </Card>
    </div>
  )
}

