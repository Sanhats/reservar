"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function BusinessLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get("redirectedFrom") || "/dashboard"
  const { signIn, user, isLoading: authLoading, refreshSession } = useAuth()
  const { toast } = useToast()
  const [authStatus, setAuthStatus] = useState<string>("checking")
  const [refreshed, setRefreshed] = useState(false)

  // Verificar el estado de autenticación
  useEffect(() => {
    const checkAuth = async () => {
      if (authLoading) {
        setAuthStatus("checking")
        return
      }

      // Solo refrescar la sesión una vez para evitar bucles infinitos
      if (!refreshed) {
        setRefreshed(true)
        await refreshSession()
      }

      if (user) {
        // Verificar si el usuario es un negocio
        const { data, error } = await supabase.from("profiles").select("user_type").eq("id", user.id).single()

        if (error || data.user_type !== "business") {
          // Si hay un error o el usuario no es un negocio, cerrar sesión
          toast({
            title: "Acceso incorrecto",
            description: "Esta página es solo para negocios. Por favor, inicia sesión con una cuenta de negocio.",
            variant: "destructive",
          })
          setAuthStatus("unauthenticated")
          return
        }

        setAuthStatus("authenticated")
        console.log("Negocio autenticado:", user.email)
      } else {
        setAuthStatus("unauthenticated")
        console.log("Usuario no autenticado")
      }
    }

    checkAuth()
  }, [user, authLoading, refreshSession, refreshed, toast])

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    try {
      console.log("Intentando iniciar sesión con:", email)
      const { error, data } = await signIn(email, password)

      if (error) {
        console.error("Error al iniciar sesión:", error)
        toast({
          title: "Error al iniciar sesión",
          description: error.message,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Verificar si el usuario es un negocio
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", data?.user.id)
        .single()

      if (profileError || profileData.user_type !== "business") {
        toast({
          title: "Acceso incorrecto",
          description: "Esta página es solo para negocios. Por favor, inicia sesión con una cuenta de negocio.",
          variant: "destructive",
        })
        // Cerrar sesión
        await supabase.auth.signOut()
        setIsLoading(false)
        return
      }

      console.log("Inicio de sesión exitoso, sesión:", !!data)
      toast({
        title: "Inicio de sesión exitoso",
        description: "Bienvenido de nuevo",
      })

      // Actualizar el estado
      setAuthStatus("authenticated")

      // Redirigir al dashboard después de un inicio de sesión exitoso
      router.push(redirectPath)
    } catch (error) {
      console.error("Error inesperado al iniciar sesión:", error)
      toast({
        title: "Error al iniciar sesión",
        description: "Ocurrió un error inesperado",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualRedirect = () => {
    router.push(redirectPath)
  }

  // Si está cargando la autenticación, mostrar un indicador de carga
  if (authStatus === "checking") {
    return (
      <div className="container flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Verificando autenticación...</CardTitle>
            <CardDescription className="text-center">
              Estamos verificando tu estado de autenticación. Por favor, espera un momento.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Si el usuario está autenticado, mostrar un mensaje y un botón para redirigir
  if (authStatus === "authenticated") {
    return (
      <div className="container flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">¡Ya has iniciado sesión!</CardTitle>
            <CardDescription className="text-center">
              Has iniciado sesión como <strong>{user?.email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <div className="text-center">
              <p className="mb-4">Puedes continuar a tu panel de control.</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            <Button onClick={handleManualRedirect}>Ir al dashboard</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Si el usuario no está autenticado, mostrar el formulario de inicio de sesión
  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-8rem)] py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Iniciar sesión como negocio</CardTitle>
          <CardDescription className="text-center">
            Ingresa tus credenciales para acceder a tu panel de control
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="negocio@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar sesión"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-sm text-center text-gray-500 mt-2">
            ¿No tienes una cuenta?{" "}
            <Link href="/business/register" className="text-blue-600 hover:underline">
              Registrar negocio
            </Link>
          </div>
          <div className="text-sm text-center text-gray-500 mt-2">
            ¿Buscas reservar un turno?{" "}
            <Link href="/client/login" className="text-blue-600 hover:underline">
              Iniciar sesión como cliente
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

