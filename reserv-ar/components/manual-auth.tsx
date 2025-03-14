"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function ManualAuth() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(`Inicio de sesión exitoso como ${data.user.email}`)

      // Esperar un momento antes de redirigir
      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)
    } catch (err) {
      setError("Error inesperado al iniciar sesión")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Button
        variant="outline"
        size="sm"
        className="opacity-50 hover:opacity-100"
        onClick={() => document.getElementById("manual-auth-modal")?.classList.toggle("hidden")}
      >
        Auth Manual
      </Button>

      <div
        id="manual-auth-modal"
        className="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Autenticación Manual</CardTitle>
            <CardDescription>
              Usa este formulario para iniciar sesión directamente con Supabase, evitando el flujo normal de
              autenticación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual-email">Email</Label>
                <Input
                  id="manual-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-password">Contraseña</Label>
                <Input
                  id="manual-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <div className="text-red-500 text-sm">{error}</div>}
              {success && <div className="text-green-500 text-sm">{success}</div>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Iniciando sesión..." : "Iniciar sesión manual"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="ghost"
              onClick={() => document.getElementById("manual-auth-modal")?.classList.add("hidden")}
            >
              Cerrar
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Ir al dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

