import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Middleware simplificado que no realiza verificaciones de autenticación
export function middleware(req: NextRequest) {
  // Simplemente pasar la solicitud sin modificaciones
  return NextResponse.next()
}

// Configuración para que el middleware se ejecute solo en rutas específicas
export const config = {
  matcher: [
    // Rutas protegidas
    "/dashboard/:path*",
    "/reservations/:path*",
    "/profile/:path*",
  ],
}

