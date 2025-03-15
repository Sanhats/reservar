import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const userType = requestUrl.searchParams.get("user_type") || "client"
  const next = requestUrl.searchParams.get("next") || userType === "business" ? "/dashboard" : "/businesses"

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Error al intercambiar código por sesión:", error)
        // Redirigir a login en caso de error
        return NextResponse.redirect(new URL(`/${userType}/login`, request.url))
      }

      console.log("Código intercambiado por sesión exitosamente")

      // Si el usuario inició sesión con Google, actualizar el tipo de usuario
      if (data.user?.app_metadata?.provider === "google") {
        // Actualizar el tipo de usuario en la tabla de perfiles
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ user_type: userType })
          .eq("id", data.user.id)

        if (updateError) {
          console.error("Error al actualizar el tipo de usuario:", updateError)
        }
      }

      // Redirigir según el tipo de usuario
      return NextResponse.redirect(new URL(next, request.url))
    } catch (error) {
      console.error("Error inesperado al intercambiar código por sesión:", error)
      // Redirigir a login en caso de error
      return NextResponse.redirect(new URL(`/${userType}/login`, request.url))
    }
  }

  // Si no hay código, redirigir a la página de inicio
  return NextResponse.redirect(new URL("/", request.url))
}

