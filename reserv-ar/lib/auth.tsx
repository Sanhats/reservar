"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { supabase, createFreshSupabaseClient } from "./supabase"
import type { Session, User } from "@supabase/supabase-js"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (
    email: string,
    password: string,
  ) => Promise<{
    error: Error | null
    data: Session | null
  }>
  signInWithGoogle: (userType?: "client" | "business") => Promise<void>
  signUp: (
    email: string,
    password: string,
    metadata?: Record<string, any>,
  ) => Promise<{
    error: Error | null
    data: { user: User | null; session: Session | null }
  }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Función para guardar la sesión en localStorage
const saveSessionToLocalStorage = (session: Session | null) => {
  if (typeof window === "undefined") return

  if (session) {
    localStorage.setItem("auth:session", JSON.stringify(session))
  } else {
    localStorage.removeItem("auth:session")
  }
}

// Función para guardar el usuario en localStorage
const saveUserToLocalStorage = (user: User | null) => {
  if (typeof window === "undefined") return

  if (user) {
    localStorage.setItem("auth:user", JSON.stringify(user))
  } else {
    localStorage.removeItem("auth:user")
  }
}

// Función para cargar la sesión desde localStorage
const loadSessionFromLocalStorage = (): Session | null => {
  if (typeof window === "undefined") return null

  const sessionStr = localStorage.getItem("auth:session")
  if (!sessionStr) return null

  try {
    return JSON.parse(sessionStr)
  } catch (e) {
    console.error("Error parsing session from localStorage:", e)
    return null
  }
}

// Función para cargar el usuario desde localStorage
const loadUserFromLocalStorage = (): User | null => {
  if (typeof window === "undefined") return null

  const userStr = localStorage.getItem("auth:user")
  if (!userStr) return null

  try {
    return JSON.parse(userStr)
  } catch (e) {
    console.error("Error parsing user from localStorage:", e)
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Función para actualizar el usuario y la sesión
  const updateAuthState = useCallback((newSession: Session | null, newUser: User | null) => {
    setSession(newSession)
    setUser(newUser)
    saveSessionToLocalStorage(newSession)
    saveUserToLocalStorage(newUser)
  }, [])

  const refreshSession = useCallback(async () => {
    // Evitar múltiples refrescos simultáneos
    if (isRefreshing) return

    setIsRefreshing(true)
    try {
      console.log("Refrescando sesión...")

      // Primero intentamos cargar desde localStorage para una experiencia más rápida
      const localSession = loadSessionFromLocalStorage()
      const localUser = loadUserFromLocalStorage()

      if (localSession && localUser) {
        console.log("Sesión cargada desde localStorage:", localUser.email)
        setSession(localSession)
        setUser(localUser)
      }

      // Crear un cliente fresco para evitar problemas de caché
      const freshClient = createFreshSupabaseClient()
      const { data, error } = await freshClient.auth.getSession()

      if (error) {
        console.error("Error al refrescar la sesión:", error)
        return
      }

      if (data.session) {
        console.log("Sesión refrescada desde Supabase:", data.session.user.email)
        updateAuthState(data.session, data.session.user)
      } else {
        console.log("No hay sesión activa en Supabase")
        // Si no hay sesión en Supabase pero sí en localStorage, mantener la de localStorage
        if (!localSession) {
          updateAuthState(null, null)
        }
      }
    } catch (error) {
      console.error("Error inesperado al refrescar la sesión:", error)
    } finally {
      setIsRefreshing(false)
    }
  }, [isRefreshing, updateAuthState])

  useEffect(() => {
    const loadSession = async () => {
      try {
        console.log("Cargando sesión inicial...")

        // Primero intentamos cargar desde localStorage para una experiencia más rápida
        const localSession = loadSessionFromLocalStorage()
        const localUser = loadUserFromLocalStorage()

        if (localSession && localUser) {
          console.log("Sesión cargada desde localStorage:", localUser.email)
          setSession(localSession)
          setUser(localUser)
        }

        // Luego verificamos con Supabase para asegurarnos de que la sesión sea válida
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Error al cargar la sesión:", error)
          setIsLoading(false)
          return
        }

        if (data.session) {
          console.log("Sesión cargada desde Supabase:", data.session.user.email)
          updateAuthState(data.session, data.session.user)
        } else {
          console.log("No hay sesión activa en Supabase")
          // Si no hay sesión en Supabase pero sí en localStorage, mantener la de localStorage
          if (!localSession) {
            updateAuthState(null, null)
          }
        }
      } catch (error) {
        console.error("Error inesperado al cargar la sesión:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSession()

    // Configurar el listener para cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("Auth state changed:", event, newSession?.user?.email || "No hay sesión")

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        updateAuthState(newSession, newSession?.user ?? null)
      } else if (event === "SIGNED_OUT") {
        updateAuthState(null, null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [updateAuthState])

  const signIn = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      console.log("Intentando iniciar sesión con:", email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Error al iniciar sesión:", error)
        return { data: null, error }
      }

      console.log("Inicio de sesión exitoso:", data.user?.email)
      updateAuthState(data.session, data.user)

      return { data: data.session, error: null }
    } catch (error) {
      console.error("Error inesperado al iniciar sesión:", error)
      return { data: null, error: error as Error }
    } finally {
      setIsLoading(false)
    }
  }

  // Actualizar la función signInWithGoogle para aceptar el tipo de usuario
  const signInWithGoogle = async (userType: "client" | "business" = "client") => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            // Pasar el tipo de usuario como parámetro para usarlo después
            user_type: userType,
          },
        },
      })

      if (error) {
        console.error("Error al iniciar sesión con Google:", error)
      }
    } catch (error) {
      console.error("Error inesperado al iniciar sesión con Google:", error)
    }
  }

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: metadata,
        },
      })

      if (error) {
        console.error("Error al registrarse:", error)
      } else {
        console.log("Registro exitoso:", data.user?.email)
        if (data.session) {
          updateAuthState(data.session, data.user)
        }
      }

      return { data, error }
    } catch (error) {
      console.error("Error inesperado al registrarse:", error)
      return { data: { user: null, session: null }, error: error as Error }
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error("Error al cerrar sesión:", error)
      } else {
        console.log("Sesión cerrada exitosamente")
        updateAuthState(null, null)
      }
    } catch (error) {
      console.error("Error inesperado al cerrar sesión:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

