import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email, password, fullName, userType, businessData } = await request.json()

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // 1. Registrar al usuario
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${request.headers.get("origin")}/auth/callback`,
        data: {
          full_name: fullName,
          user_type: userType,
        },
      },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // El perfil se creará automáticamente mediante el trigger

    // Si es un negocio, crear el registro de negocio
    if (userType === "business" && businessData && authData.user) {
      const { error: businessError } = await supabase.from("businesses").insert([
        {
          owner_id: authData.user.id,
          ...businessData,
        },
      ])

      if (businessError) {
        return NextResponse.json(
          {
            warning: "Usuario creado pero hubo un problema al registrar el negocio",
            error: businessError.message,
          },
          { status: 201 },
        )
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Usuario registrado correctamente",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error en el registro:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
      },
      { status: 500 },
    )
  }
}

