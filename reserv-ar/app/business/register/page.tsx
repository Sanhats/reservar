"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

export default function BusinessRegisterPage() {
  const [ownerName, setOwnerName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [businessType, setBusinessType] = useState("")
  const [phone, setPhone] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const { signUp } = useAuth()
  const { toast } = useToast()

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Registrar al usuario con Supabase Auth, incluyendo los metadatos
      const { data, error } = await signUp(email, password, {
        full_name: ownerName,
        user_type: "business",
      })

      if (error) {
        toast({
          title: "Error al registrarse",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      // Si el registro es exitoso, intentar crear el negocio
      if (data.user) {
        try {
          const { error: businessError } = await supabase.from("businesses").insert([
            {
              owner_id: data.user.id,
              name: businessName,
              type: businessType,
              phone: phone,
              status: "pending_verification",
            },
          ])

          if (businessError) {
            console.error("Error al crear negocio:", businessError)
            toast({
              title: "Advertencia",
              description:
                "Tu cuenta se creó pero hubo un problema al configurar tu negocio. Podrás completarlo más tarde.",
              variant: "default",
            })
          }
        } catch (businessError) {
          console.error("Error al crear negocio:", businessError)
          toast({
            title: "Advertencia",
            description:
              "Tu cuenta se creó pero hubo un problema al configurar tu negocio. Podrás completarlo más tarde.",
            variant: "default",
          })
        }
      }

      toast({
        title: "Registro exitoso",
        description: "Se ha enviado un correo de confirmación a tu email",
      })

      router.push("/business/login")
    } catch (error) {
      console.error("Error al registrarse:", error)
      toast({
        title: "Error al registrarse",
        description: "Ocurrió un error inesperado",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-8rem)] py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Registrar mi negocio</CardTitle>
          <CardDescription className="text-center">
            Crea una cuenta para gestionar las reservas de tu negocio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ownerName">Nombre del propietario</Label>
                <Input
                  id="ownerName"
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email de contacto</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="negocio@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">Nombre del negocio</Label>
              <Input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessType">Tipo de negocio</Label>
                <select
                  id="businessType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  required
                >
                  <option value="">Selecciona un tipo</option>
                  <option value="restaurant">Restaurante</option>
                  <option value="salon">Salón de belleza</option>
                  <option value="medical">Consultorio médico</option>
                  <option value="gym">Gimnasio</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando negocio...
                </>
              ) : (
                "Registrar negocio"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-sm text-center text-gray-500 mt-2">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/business/login" className="text-blue-600 hover:underline">
              Iniciar sesión
            </Link>
          </div>
          <div className="text-sm text-center text-gray-500 mt-2">
            ¿Buscas reservar un turno?{" "}
            <Link href="/client/register" className="text-blue-600 hover:underline">
              Registrarse como cliente
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

