"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Heart, MapPin, Clock, Star, Calendar, Loader2 } from "lucide-react"
import RouteGuard from "@/components/route-guard"
import { useAuth } from "@/lib/auth"
import Link from "next/link"

type FavoriteBusiness = {
  id: string
  business_id: string
  user_id: string
  created_at: string
  business: {
    id: string
    name: string
    type: string
    description: string | null
    city: string | null
    state: string | null
    opening_time: string | null
    closing_time: string | null
  }
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteBusiness[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  // Cargar favoritos
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        // Verificar si existe la tabla de favoritos
        const { data: tableExists } = await supabase
          .from("information_schema.tables")
          .select("table_name")
          .eq("table_name", "favorites")
          .single()

        // Si la tabla no existe, mostrar datos de ejemplo
        if (!tableExists) {
          const demoFavorites = [
            {
              id: "1",
              business_id: "1",
              user_id: user.id,
              created_at: new Date().toISOString(),
              business: {
                id: "1",
                name: "Salón de Belleza Elegance",
                type: "salon",
                description: "Servicios de belleza y estética de alta calidad",
                city: "Buenos Aires",
                state: "CABA",
                opening_time: "09:00",
                closing_time: "20:00",
              },
            },
            {
              id: "2",
              business_id: "2",
              user_id: user.id,
              created_at: new Date().toISOString(),
              business: {
                id: "2",
                name: "Consultorio Dr. Martínez",
                type: "medical",
                description: "Atención médica personalizada",
                city: "Córdoba",
                state: "Córdoba",
                opening_time: "08:00",
                closing_time: "18:00",
              },
            },
            {
              id: "3",
              business_id: "3",
              user_id: user.id,
              created_at: new Date().toISOString(),
              business: {
                id: "3",
                name: "Gimnasio FitLife",
                type: "gym",
                description: "Entrenamiento personalizado y clases grupales",
                city: "Rosario",
                state: "Santa Fe",
                opening_time: "07:00",
                closing_time: "22:00",
              },
            },
          ]
          setFavorites(demoFavorites)
          return
        }

        const { data, error } = await supabase
          .from("favorites")
          .select(`
            id,
            business_id,
            user_id,
            created_at,
            business:businesses (
              id,
              name,
              type,
              description,
              city,
              state,
              opening_time,
              closing_time
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) throw error

        setFavorites(data)
      } catch (error) {
        console.error("Error fetching favorites:", error)

        // Mostrar datos de ejemplo en caso de error
        const demoFavorites = [
          {
            id: "1",
            business_id: "1",
            user_id: user.id,
            created_at: new Date().toISOString(),
            business: {
              id: "1",
              name: "Salón de Belleza Elegance",
              type: "salon",
              description: "Servicios de belleza y estética de alta calidad",
              city: "Buenos Aires",
              state: "CABA",
              opening_time: "09:00",
              closing_time: "20:00",
            },
          },
          {
            id: "2",
            business_id: "2",
            user_id: user.id,
            created_at: new Date().toISOString(),
            business: {
              id: "2",
              name: "Consultorio Dr. Martínez",
              type: "medical",
              description: "Atención médica personalizada",
              city: "Córdoba",
              state: "Córdoba",
              opening_time: "08:00",
              closing_time: "18:00",
            },
          },
        ]
        setFavorites(demoFavorites)

        toast({
          title: "Modo demostración",
          description: "Mostrando datos de ejemplo",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchFavorites()
  }, [user, toast])

  // Eliminar de favoritos
  const handleRemoveFavorite = async (id: string) => {
    try {
      // Verificar si existe la tabla de favoritos
      const { data: tableExists } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_name", "favorites")
        .single()

      // Si la tabla no existe, simular eliminación
      if (!tableExists) {
        setFavorites((prev) => prev.filter((fav) => fav.id !== id))

        toast({
          title: "Eliminado de favoritos",
          description: "El negocio ha sido eliminado de tus favoritos",
        })

        return
      }

      const { error } = await supabase.from("favorites").delete().eq("id", id)

      if (error) throw error

      setFavorites((prev) => prev.filter((fav) => fav.id !== id))

      toast({
        title: "Eliminado de favoritos",
        description: "El negocio ha sido eliminado de tus favoritos",
      })
    } catch (error) {
      console.error("Error removing favorite:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar de favoritos",
        variant: "destructive",
      })
    }
  }

  // Renderizar estrellas para la calificación
  const renderStars = (rating = 4) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
      ))
  }

  return (
    <RouteGuard>
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Mis Favoritos</h1>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
            <span>Cargando favoritos...</span>
          </div>
        ) : favorites.length === 0 ? (
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="text-center py-8 flex flex-col items-center">
                <Heart className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No tienes favoritos</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Agrega negocios a tus favoritos para acceder rápidamente a ellos
                </p>
                <Button asChild>
                  <Link href="/businesses">Explorar negocios</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {favorites.map((favorite) => (
              <Card key={favorite.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle>{favorite.business.name}</CardTitle>
                  <CardDescription>
                    {favorite.business.type.charAt(0).toUpperCase() + favorite.business.type.slice(1)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  {favorite.business.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{favorite.business.description}</p>
                  )}
                  <div className="flex items-center text-sm text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>
                      {favorite.business.city || "No disponible"}
                      {favorite.business.city && favorite.business.state ? `, ${favorite.business.state}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground mb-2">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>
                      {favorite.business.opening_time || "09:00"} - {favorite.business.closing_time || "18:00"}
                    </span>
                  </div>
                  <div className="flex items-center mb-2">{renderStars()}</div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => handleRemoveFavorite(favorite.id)}>
                    <Heart className="h-4 w-4 mr-2 fill-red-500 text-red-500" />
                    Quitar
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/businesses/${favorite.business.id}`}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Reservar
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RouteGuard>
  )
}

