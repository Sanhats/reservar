import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Calendar, Store, ArrowRight } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] py-12">
      <h1 className="text-4xl font-bold mb-6 text-center">Bienvenido a reserv-ar</h1>
      <p className="text-xl mb-8 text-center max-w-2xl">
        Sistema integral de reservas para tu negocio. Simplifica la gestión de citas y mejora la experiencia de tus
        clientes.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full mb-12">
        {/* Opción para clientes */}
        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100 flex flex-col items-center text-center hover:shadow-lg transition-shadow">
          <Calendar className="h-12 w-12 text-blue-600 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Soy un cliente</h2>
          <p className="mb-6 text-gray-600">Busca negocios, reserva citas y gestiona tus reservas de forma sencilla.</p>
          <div className="space-y-3 w-full">
            <Button asChild className="w-full">
              <Link href="/client/register">
                <ArrowRight className="h-4 w-4 mr-2" />
                Registrarme como cliente
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/client/login">Iniciar sesión como cliente</Link>
            </Button>
            <Button variant="ghost" asChild className="w-full">
              <Link href="/businesses">
                <Calendar className="h-4 w-4 mr-2" />
                Explorar negocios
              </Link>
            </Button>
          </div>
        </div>

        {/* Opción para negocios */}
        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100 flex flex-col items-center text-center hover:shadow-lg transition-shadow">
          <Store className="h-12 w-12 text-blue-600 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Tengo un negocio</h2>
          <p className="mb-6 text-gray-600">Administra tu negocio, gestiona reservas y optimiza tu agenda.</p>
          <div className="space-y-3 w-full">
            <Button asChild className="w-full">
              <Link href="/business/register">
                <ArrowRight className="h-4 w-4 mr-2" />
                Registrar mi negocio
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/business/login">Iniciar sesión como negocio</Link>
            </Button>
            <Button variant="ghost" asChild className="w-full">
              <Link href="/dashboard">
                <Store className="h-4 w-4 mr-2" />
                Acceder a mi negocio
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

