"use client"

import { useAuth } from "@/lib/auth"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function DebugAuth() {
  const { user, session, isLoading, signOut, refreshSession } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50 opacity-50 hover:opacity-100"
        onClick={() => setIsOpen(true)}
      >
        Debug
      </Button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border max-w-md w-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Estado de Autenticación</h3>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          Cerrar
        </Button>
      </div>
      <div className="space-y-2 text-sm">
        <p>
          <strong>Cargando:</strong> {isLoading ? "Sí" : "No"}
        </p>
        <p>
          <strong>Usuario:</strong> {user ? "Autenticado" : "No autenticado"}
        </p>
        {user && (
          <>
            <p>
              <strong>ID:</strong> {user.id}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Creado:</strong> {new Date(user.created_at).toLocaleString()}
            </p>
          </>
        )}
        <p>
          <strong>Sesión:</strong> {session ? "Activa" : "Inactiva"}
        </p>
        {session && (
          <>
            <p>
              <strong>Expira:</strong> {new Date(session.expires_at * 1000).toLocaleString()}
            </p>
            <p>
              <strong>Token:</strong> {session.access_token.substring(0, 10)}...
            </p>
          </>
        )}
      </div>
      <div className="mt-4 space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={async () => {
            await refreshSession()
            alert("Sesión refrescada")
          }}
        >
          Refrescar sesión
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            // Limpiar localStorage
            if (typeof window !== "undefined") {
              window.localStorage.clear()
              window.location.reload()
            }
          }}
        >
          Limpiar localStorage y recargar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            signOut().then(() => {
              router.push("/login")
            })
          }}
        >
          Cerrar sesión
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            router.push("/dashboard")
          }}
        >
          Ir al dashboard
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-red-500"
          onClick={() => {
            // Mostrar el localStorage actual
            if (typeof window !== "undefined") {
              const localStorageItems = { ...localStorage }
              console.log("LocalStorage actual:", localStorageItems)
              alert("LocalStorage mostrado en la consola")
            }
          }}
        >
          Mostrar localStorage en consola
        </Button>
      </div>
    </div>
  )
}

