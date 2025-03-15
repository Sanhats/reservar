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

export default function ClientLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get("redirectedFrom") || "/businesses"
  const { signIn, signInWithGoogle, user, isLoading: authLoading, refreshSession } = useAuth()
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
        // Verificar si el usuario es un cliente
        const { data, error } = await supabase.from("profiles").select("user_type").eq("id", user.id).single()

        if (error || data.user_type !== "client") {
          // Si hay un error o el usuario no es un cliente, cerrar sesión
          toast({
            title: "Acceso incorrecto",
            description: "Esta página es solo para clientes. Por favor, inicia sesión con una cuenta de cliente.",
            variant: "destructive",
          })
          setAuthStatus("unauthenticated")
          return
        }

        setAuthStatus("authenticated")
        console.log("Cliente autenticado:", user.email)
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

      // Verificar si el usuario es un cliente
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", data?.user.id)
        .single()

      if (profileError || profileData.user_type !== "client") {
        toast({
          title: "Acceso incorrecto",
          description: "Esta página es solo para clientes. Por favor, inicia sesión con una cuenta de cliente.",
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

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      await signInWithGoogle("client")
      // La redirección se manejará automáticamente por Supabase OAuth
    } catch (error) {
      console.error("Error de inicio de sesión con Google:", error)
      toast({
        title: "Error al iniciar sesión con Google",
        description: "Ocurrió un error inesperado",
        variant: "destructive",
      })
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
              <p className="mb-4">Puedes continuar a explorar negocios o ver tus reservas.</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            <Button onClick={handleManualRedirect}>Continuar</Button>
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
          <CardTitle className="text-2xl font-bold text-center">Iniciar sesión como cliente</CardTitle>
          <CardDescription className="text-center">
            Ingresa tus credenciales para acceder a tu cuenta de cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
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
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">O continúa con</span>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isLoading} type="button">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              Google
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-sm text-center text-gray-500 mt-2">
            ¿No tienes una cuenta?{" "}
            <Link href="/client/register" className="text-blue-600 hover:underline">
              Regístrate
            </Link>
          </div>
          <div className="text-sm text-center text-gray-500 mt-2">
            ¿Eres propietario de un negocio?{" "}
            <Link href="/business/login" className="text-blue-600 hover:underline">
              Iniciar sesión como negocio
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

