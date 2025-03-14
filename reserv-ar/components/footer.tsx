import Link from "next/link"

export default function Footer() {
  return (
    <footer className="w-full border-t bg-gray-100">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4 py-10 px-4 md:px-6">
        <div className="flex flex-col gap-2">
          <Link href="/" className="text-xl font-bold text-blue-950">
            reserv-ar
          </Link>
          <p className="text-sm text-gray-500">© 2023 reserv-ar. Todos los derechos reservados.</p>
        </div>
        <nav className="flex gap-4 md:gap-6">
          <Link href="#" className="text-sm font-medium text-gray-500 hover:underline underline-offset-4">
            Términos
          </Link>
          <Link href="#" className="text-sm font-medium text-gray-500 hover:underline underline-offset-4">
            Privacidad
          </Link>
          <Link href="#" className="text-sm font-medium text-gray-500 hover:underline underline-offset-4">
            Contacto
          </Link>
        </nav>
      </div>
    </footer>
  )
}

