"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Search, Mail, Phone, Calendar, User, MoreHorizontal, Loader2 } from "lucide-react"
import RouteGuard from "@/components/route-guard"
import { useAuth } from "@/lib/auth"
import { fetchBusinessIdByOwnerId, DEMO_BUSINESS_ID } from "@/lib/services/dashboard-service"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type Client = {
  id: string
  full_name: string
  email: string
  phone: string | null
  created_at: string
  total_reservations: number
  last_reservation: string | null
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  // Obtener el ID del negocio
  useEffect(() => {
    const getBusinessId = async () => {
      if (!user) return

      try {
        const id = await fetchBusinessIdByOwnerId(user.id)

        if (id) {
          setBusinessId(id)
          if (id === DEMO_BUSINESS_ID) {
            setIsDemoMode(true)
          }
        } else {
          setBusinessId(DEMO_BUSINESS_ID)
          setIsDemoMode(true)
        }
      } catch (error) {
        console.error("Error fetching business ID:", error)
        setBusinessId(DEMO_BUSINESS_ID)
        setIsDemoMode(true)
      }
    }

    getBusinessId()
  }, [user])

  // Cargar clientes
  useEffect(() => {
    const fetchClients = async () => {
      if (!businessId) return

      setIsLoading(true)
      try {
        if (isDemoMode) {
          // Datos de ejemplo para el modo demo
          const demoClients: Client[] = [
            {
              id: "1",
              full_name: "Ana García",
              email: "ana.garcia@example.com",
              phone: "+54 11 1234-5678",
              created_at: "2023-01-15T10:30:00Z",
              total_reservations: 8,
              last_reservation: "2023-06-10T14:00:00Z",
            },
            {
              id: "2",
              full_name: "Carlos Rodríguez",
              email: "carlos.rodriguez@example.com",
              phone: "+54 11 8765-4321",
              created_at: "2023-02-20T15:45:00Z",
              total_reservations: 5,
              last_reservation: "2023-06-05T11:30:00Z",
            },
            {
              id: "3",
              full_name: "María López",
              email: "maria.lopez@example.com",
              phone: "+54 11 2345-6789",
              created_at: "2023-03-10T09:15:00Z",
              total_reservations: 12,
              last_reservation: "2023-06-12T16:00:00Z",
            },
            {
              id: "4",
              full_name: "Juan Martínez",
              email: "juan.martinez@example.com",
              phone: "+54 11 9876-5432",
              created_at: "2023-04-05T13:20:00Z",
              total_reservations: 3,
              last_reservation: "2023-05-28T10:00:00Z",
            },
            {
              id: "5",
              full_name: "Laura Fernández",
              email: "laura.fernandez@example.com",
              phone: "+54 11 3456-7890",
              created_at: "2023-05-12T11:00:00Z",
              total_reservations: 1,
              last_reservation: "2023-05-15T15:30:00Z",
            },
          ]
          setClients(demoClients)
          setFilteredClients(demoClients)
          return
        }

        // Consulta para obtener clientes con reservas en este negocio
        const { data, error } = await supabase
          .from("reservations")
          .select(`
            user_id,
            client_name,
            start_time,
            profiles!inner (
              id,
              full_name,
              email,
              phone,
              created_at
            )
          `)
          .eq("business_id", businessId)
          .order("start_time", { ascending: false })

        if (error) throw error

        // Procesar los datos para obtener información de clientes única
        const clientsMap = new Map<string, Client>()

        data.forEach((reservation) => {
          const profile = reservation.profiles
          const userId = profile.id

          if (!clientsMap.has(userId)) {
            clientsMap.set(userId, {
              id: userId,
              full_name: profile.full_name || reservation.client_name,
              email: profile.email,
              phone: profile.phone,
              created_at: profile.created_at,
              total_reservations: 1,
              last_reservation: reservation.start_time,
            })
          } else {
            const client = clientsMap.get(userId)!
            client.total_reservations += 1

            // Actualizar última reserva si es más reciente
            if (new Date(reservation.start_time) > new Date(client.last_reservation!)) {
              client.last_reservation = reservation.start_time
            }
          }
        })

        const clientsList = Array.from(clientsMap.values())
        setClients(clientsList)
        setFilteredClients(clientsList)
      } catch (error) {
        console.error("Error fetching clients:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los clientes",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchClients()
  }, [businessId, isDemoMode, toast])

  // Filtrar clientes cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredClients(clients)
      return
    }

    const filtered = clients.filter(
      (client) =>
        client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.phone && client.phone.includes(searchTerm)),
    )

    setFilteredClients(filtered)
  }, [searchTerm, clients])

  // Formatear fecha
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"

    try {
      return format(new Date(dateString), "PPP", { locale: es })
    } catch (error) {
      return dateString
    }
  }

  // Enviar correo al cliente
  const handleSendEmail = (email: string) => {
    window.location.href = `mailto:${email}`
  }

  // Ver historial de reservas del cliente
  const handleViewReservations = (clientId: string) => {
    // En una implementación real, esto redigiría a una página de historial de reservas
    toast({
      title: "Ver reservas",
      description: "Funcionalidad en desarrollo",
    })
  }

  return (
    <RouteGuard>
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Clientes</h1>

        {/* Estadísticas de clientes */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clients.length}</div>
              <p className="text-xs text-muted-foreground">Clientes registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Reservas promedio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {clients.length > 0
                  ? (clients.reduce((sum, client) => sum + client.total_reservations, 0) / clients.length).toFixed(1)
                  : "0"}
              </div>
              <p className="text-xs text-muted-foreground">Por cliente</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Clientes nuevos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  clients.filter((client) => {
                    const oneMonthAgo = new Date()
                    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
                    return new Date(client.created_at) > oneMonthAgo
                  }).length
                }
              </div>
              <p className="text-xs text-muted-foreground">Últimos 30 días</p>
            </CardContent>
          </Card>
        </div>

        {/* Buscador */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, email o teléfono..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Lista de clientes */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de clientes</CardTitle>
            <CardDescription>
              {filteredClients.length} {filteredClients.length === 1 ? "cliente encontrado" : "clientes encontrados"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                <span>Cargando clientes...</span>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No se encontraron clientes</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? "Intenta con otros términos de búsqueda" : "Aún no tienes clientes registrados"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Cliente</th>
                      <th className="text-left py-3 px-4 font-medium">Contacto</th>
                      <th className="text-left py-3 px-4 font-medium">Reservas</th>
                      <th className="text-left py-3 px-4 font-medium">Última visita</th>
                      <th className="text-left py-3 px-4 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{client.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Cliente desde {formatDate(client.created_at)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center text-sm">
                            <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                            {client.email}
                          </div>
                          {client.phone && (
                            <div className="flex items-center text-sm mt-1">
                              <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                              {client.phone}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{client.total_reservations}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div>{formatDate(client.last_reservation)}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendEmail(client.email)}
                              title="Enviar email"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewReservations(client.id)}
                              title="Ver reservas"
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleSendEmail(client.email)}>
                                  Enviar email
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewReservations(client.id)}>
                                  Ver historial
                                </DropdownMenuItem>
                                <DropdownMenuItem>Añadir nota</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RouteGuard>
  )
}

