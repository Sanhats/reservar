import { createClient } from "@supabase/supabase-js"

// Estas variables de entorno deben configurarse en tu proyecto
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Singleton para evitar múltiples instancias
let supabaseInstance: ReturnType<typeof createClient> | null = null

// Configuración para usar localStorage exclusivamente
export const supabase = (() => {
  if (supabaseInstance) return supabaseInstance

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
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

  return supabaseInstance
})()

// Exportar una función para crear un cliente fresco
export const createFreshSupabaseClient = () => {
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

