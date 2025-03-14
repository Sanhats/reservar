"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, X, User, LogOut } from "lucide-react"
import { useAuth } from "@/lib/auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, signOut, isLoading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // Evitar problemas de hidratación
  useEffect(() => {
    setMounted(true)
  }, [])

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
        <nav className="hidden md:flex gap-6">
          <Link href="#" className="text-sm font-medium hover:underline underline-offset-4">
            Características
          </Link>
          <Link href="#" className="text-sm font-medium hover:underline underline-offset-4">
            Precios
          </Link>
          <Link href="#" className="text-sm font-medium hover:underline underline-offset-4">
            Contacto
          </Link>
        </nav>
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
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">Panel de control</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/reservations">Mis reservas</Link>
                </DropdownMenuItem>
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
              <Button variant="outline" asChild>
                <Link href="/login">Iniciar sesión</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Registrarse</Link>
              </Button>
            </>
          )}
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          <span className="sr-only">Toggle menu</span>
        </Button>
      </div>
      {isMenuOpen && (
        <div className="container md:hidden">
          <nav className="flex flex-col gap-4 p-4">
            <Link href="#" className="text-sm font-medium hover:underline underline-offset-4">
              Características
            </Link>
            <Link href="#" className="text-sm font-medium hover:underline underline-offset-4">
              Precios
            </Link>
            <Link href="#" className="text-sm font-medium hover:underline underline-offset-4">
              Contacto
            </Link>
            <div className="flex flex-col gap-2 mt-4">
              {isLoading ? (
                // Mostrar un esqueleto mientras carga
                <div className="h-10 w-full bg-gray-200 rounded-md animate-pulse"></div>
              ) : user ? (
                <>
                  <Link href="/dashboard" className="text-sm font-medium hover:underline underline-offset-4">
                    Panel de control
                  </Link>
                  <Link href="/reservations" className="text-sm font-medium hover:underline underline-offset-4">
                    Mis reservas
                  </Link>
                  <Link href="/profile" className="text-sm font-medium hover:underline underline-offset-4">
                    Perfil
                  </Link>
                  <Button variant="outline" onClick={handleSignOut} className="w-full mt-2">
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar sesión
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/login">Iniciar sesión</Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link href="/register">Registrarse</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

