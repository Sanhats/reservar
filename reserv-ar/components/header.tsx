"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, X, User, LogOut, Calendar, Settings, Store, Users } from "lucide-react"
import { useAuth } from "@/lib/auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase"

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, signOut, isLoading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [userType, setUserType] = useState<"client" | "business" | null>(null)

  // Evitar problemas de hidratación
  useEffect(() => {
    setMounted(true)
  }, [])

  // Obtener el tipo de usuario
  useEffect(() => {
    const fetchUserType = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase.from("profiles").select("user_type").eq("id", user.id).single()

        if (error) throw error

        setUserType(data.user_type as "client" | "business")
      } catch (error) {
        console.error("Error fetching user type:", error)
      }
    }

    if (user) {
      fetchUserType()
    } else {
      setUserType(null)
    }
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  // Si no está montado, mostrar un esqueleto del header
  if (!mounted) {
    return (
      <header className="w-full border-b bg-white">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-950">reserv-ar</span>
          </div>
          <div className="flex gap-4">
            {/* Esqueleto de los botones */}
            <div className="h-10 w-24 bg-gray-200 rounded-md animate-pulse"></div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="w-full border-b bg-white">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-blue-950">reserv-ar</span>
        </Link>

        {/* Navegación principal - visible solo en desktop */}
        <nav className="hidden md:flex gap-6">
          {!user ? (
            <>
              <Link href="#" className="text-sm font-medium hover:underline underline-offset-4">
                Características
              </Link>
              <Link href="#" className="text-sm font-medium hover:underline underline-offset-4">
                Precios
              </Link>
              <Link href="#" className="text-sm font-medium hover:underline underline-offset-4">
                Contacto
              </Link>
            </>
          ) : userType === "business" ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium hover:underline underline-offset-4">
                Dashboard
              </Link>
              <Link href="/dashboard/services" className="text-sm font-medium hover:underline underline-offset-4">
                Servicios
              </Link>
              <Link href="/dashboard/calendar" className="text-sm font-medium hover:underline underline-offset-4">
                Calendario
              </Link>
              <Link href="/dashboard/clients" className="text-sm font-medium hover:underline underline-offset-4">
                Clientes
              </Link>
            </>
          ) : (
            <>
              <Link href="/businesses" className="text-sm font-medium hover:underline underline-offset-4">
                Negocios
              </Link>
              <Link href="/reservations" className="text-sm font-medium hover:underline underline-offset-4">
                Mis Reservas
              </Link>
              <Link href="/favorites" className="text-sm font-medium hover:underline underline-offset-4">
                Favoritos
              </Link>
            </>
          )}
        </nav>

        {/* Botones de acción - visible solo en desktop */}
        <div className="hidden md:flex gap-4">
          {isLoading ? (
            // Mostrar un esqueleto mientras carga
            <div className="h-10 w-24 bg-gray-200 rounded-md animate-pulse"></div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Mi cuenta</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {userType === "business" ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">Panel de control</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/settings">Configuración</Link>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/reservations">Mis reservas</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/favorites">Favoritos</Link>
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuItem asChild>
                  <Link href="/profile">Perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-500">
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href="/client/login">Cliente</Link>
                </Button>
                <Button asChild>
                  <Link href="/business/login">Negocio</Link>
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Botón de menú móvil */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          <span className="sr-only">Toggle menu</span>
        </Button>
      </div>

      {/* Menú móvil */}
      {isMenuOpen && (
        <div className="container md:hidden">
          <nav className="flex flex-col gap-4 p-4">
            {!user ? (
              <>
                <Link href="#" className="text-sm font-medium hover:underline underline-offset-4">
                  Características
                </Link>
                <Link href="#" className="text-sm font-medium hover:underline underline-offset-4">
                  Precios
                </Link>
                <Link href="#" className="text-sm font-medium hover:underline underline-offset-4">
                  Contacto
                </Link>
              </>
            ) : userType === "business" ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium hover:underline underline-offset-4 flex items-center"
                >
                  <Store className="h-4 w-4 mr-2" /> Dashboard
                </Link>
                <Link
                  href="/dashboard/services"
                  className="text-sm font-medium hover:underline underline-offset-4 flex items-center"
                >
                  <Settings className="h-4 w-4 mr-2" /> Servicios
                </Link>
                <Link
                  href="/dashboard/calendar"
                  className="text-sm font-medium hover:underline underline-offset-4 flex items-center"
                >
                  <Calendar className="h-4 w-4 mr-2" /> Calendario
                </Link>
                <Link
                  href="/dashboard/clients"
                  className="text-sm font-medium hover:underline underline-offset-4 flex items-center"
                >
                  <Users className="h-4 w-4 mr-2" /> Clientes
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/businesses"
                  className="text-sm font-medium hover:underline underline-offset-4 flex items-center"
                >
                  <Store className="h-4 w-4 mr-2" /> Negocios
                </Link>
                <Link
                  href="/reservations"
                  className="text-sm font-medium hover:underline underline-offset-4 flex items-center"
                >
                  <Calendar className="h-4 w-4 mr-2" /> Mis Reservas
                </Link>
                <Link
                  href="/favorites"
                  className="text-sm font-medium hover:underline underline-offset-4 flex items-center"
                >
                  <Calendar className="h-4 w-4 mr-2" /> Favoritos
                </Link>
              </>
            )}

            <div className="flex flex-col gap-2 mt-4">
              {isLoading ? (
                // Mostrar un esqueleto mientras carga
                <div className="h-10 w-full bg-gray-200 rounded-md animate-pulse"></div>
              ) : user ? (
                <>
                  <Link
                    href="/profile"
                    className="text-sm font-medium hover:underline underline-offset-4 flex items-center"
                  >
                    <User className="h-4 w-4 mr-2" /> Perfil
                  </Link>
                  <Button variant="outline" onClick={handleSignOut} className="w-full mt-2">
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar sesión
                  </Button>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" asChild className="w-full">
                      <Link href="/client/login">Cliente</Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link href="/business/login">Negocio</Link>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

