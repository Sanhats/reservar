import { createClient } from "@supabase/supabase-js"

// Estas variables de entorno deben configurarse en tu proyecto
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Cliente específico para el navegador que usa localStorage
export const createBrowserSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: {
        getItem: (key) => {
          if (typeof window === "undefined") return null
          return window.localStorage.getItem(key)
        },
        setItem: (key, value) => {
          if (typeof window === "undefined") return
          window.localStorage.setItem(key, value)
        },
        removeItem: (key) => {
          if (typeof window === "undefined") return
          window.localStorage.removeItem(key)
        },
      },
    },
  })
}

// Exportar una instancia del cliente para uso general en el navegador
export const supabaseBrowser = createBrowserSupabaseClient()

