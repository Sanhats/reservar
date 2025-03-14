import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/dashboard"

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Error al intercambiar código por sesión:", error)
        // Redirigir a login en caso de error
        return NextResponse.redirect(new URL("/login", request.url))
      }

      console.log("Código intercambiado por sesión exitosamente")

      // Redirigir directamente al dashboard
      return NextResponse.redirect(new URL(next, request.url))
    } catch (error) {
      console.error("Error inesperado al intercambiar código por sesión:", error)
      // Redirigir a login en caso de error
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  // Si no hay código, redirigir a la página de inicio
  return NextResponse.redirect(new URL("/", request.url))
}

