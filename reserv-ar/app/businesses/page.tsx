"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Search, MapPin, Clock, Star, Calendar } from "lucide-react"
import Link from "next/link"
import RouteGuard from "@/components/route-guard"

type Business = {
  id: string
  name: string
  type: string
  description: string | null
  city: string | null
  state: string | null
  opening_time: string | null
  closing_time: string | null
  rating?: number
}

// No requiere un rol específico, pero podemos usar RouteGuard sin requiredRole
export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState<string>("")
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const { data, error } = await supabase.from("businesses").select("*").eq("status", "verified").order("name")

        if (error) throw error

        // Agregar una calificación ficticia para la demostración
        const businessesWithRating = data.map((business) => ({
          ...business,
          rating: Math.floor(Math.random() * 5) + 1,
        }))

        setBusinesses(businessesWithRating)
        setFilteredBusinesses(businessesWithRating)
      } catch (error) {
        console.error("Error fetching businesses:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los negocios",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchBusinesses()
  }, [toast])

  // Filtrar negocios cuando cambia el término de búsqueda o el tipo seleccionado
  useEffect(() => {
    if (businesses.length === 0) return

    const filtered = businesses.filter((business) => {
      const matchesSearch =
        business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (business.description && business.description.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesType = selectedType === "" || business.type === selectedType

      return matchesSearch && matchesType
    })

    setFilteredBusinesses(filtered)
  }, [searchTerm, selectedType, businesses])

  // Obtener tipos únicos de negocios para el filtro
  const businessTypes = [...new Set(businesses.map((business) => business.type))]

  // Formatear hora
  const formatTime = (time: string | null) => {
    if (!time) return "No disponible"
    return time
  }

  // Renderizar estrellas para la calificación
  const renderStars = (rating = 0) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
      ))
  }

  return (
    <RouteGuard>
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Negocios Disponibles</h1>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre o descripción..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:w-48"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            {businessTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-gray-200"></CardHeader>
                <CardContent className="py-4">
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">No se encontraron negocios</h2>
            <p className="text-muted-foreground mb-6">Intenta con otros términos de búsqueda o filtros</p>
            <Button
              onClick={() => {
                setSearchTerm("")
                setSelectedType("")
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredBusinesses.map((business) => (
              <Card key={business.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle>{business.name}</CardTitle>
                  <CardDescription>{business.type.charAt(0).toUpperCase() + business.type.slice(1)}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  {business.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{business.description}</p>
                  )}
                  <div className="flex items-center text-sm text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>
                      {business.city || "No disponible"}
                      {business.city && business.state ? `, ${business.state}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground mb-2">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>
                      {formatTime(business.opening_time)} - {formatTime(business.closing_time)}
                    </span>
                  </div>
                  <div className="flex items-center mb-2">{renderStars(business.rating)}</div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={`/businesses/${business.id}`}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Ver disponibilidad
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

