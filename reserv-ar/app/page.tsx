import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] py-12">
      <h1 className="text-4xl font-bold mb-6">Bienvenido a reserv-ar</h1>
      <p className="text-xl mb-8 text-center max-w-2xl">
        Sistema integral de reservas para tu negocio. Simplifica la gestión de citas y mejora la experiencia de tus
        clientes.
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/register">Comenzar ahora</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/login">Iniciar sesión</Link>
        </Button>
      </div>
    </div>
  )
}

