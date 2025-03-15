"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CalendarIcon,
  UsersIcon,
  CreditCardIcon,
  BarChartIcon,
  Loader2,
  PlusCircle,
  Settings,
  Calendar,
} from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import RouteGuard from "@/components/route-guard"
import { useAuth } from "@/lib/auth"
import {
  fetchDashboardStats,
  fetchUpcomingReservations,
  fetchBusinessSettings,
  fetchBusinessIdByOwnerId,
  updateBusinessSettings,
  createBusiness,
  type DashboardStats,
  type UpcomingReservation,
  type BusinessSettings,
  DEMO_BUSINESS_ID,
} from "@/lib/services/dashboard-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// Importar el componente de calendario
import ReservationCalendar from "@/components/reservation-calendar"

// Actualizar la primera línea del componente
export default function DashboardPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [upcomingReservations, setUpcomingReservations] = useState<UpcomingReservation[]>([])
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isBusinessIdLoaded, setIsBusinessIdLoaded] = useState(false)
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false)
  const [newBusinessName, setNewBusinessName] = useState("")
  const [newBusinessType, setNewBusinessType] = useState("")
  const [loadingReservations, setLoadingReservations] = useState(false)
  const [reservationsError, setReservationsError] = useState(false)

  // Obtener el ID del negocio - solo una vez
  useEffect(() => {
    let isMounted = true

    const getBusinessId = async () => {
      if (!user || isBusinessIdLoaded) return

      try {
        console.log("Obteniendo ID de negocio para usuario:", user.id)
        const id = await fetchBusinessIdByOwnerId(user.id)

        if (!isMounted) return

        if (id) {
          console.log("ID de negocio obtenido:", id)
          setBusinessId(id)
          if (id === DEMO_BUSINESS_ID) {
            console.log("Modo demostración activado")
            toast({
              title: "Modo demostración",
              description: "Estás viendo datos de ejemplo. Crea un negocio para comenzar.",
            })
          }
        } else {
          console.log("No se encontró un negocio para este usuario.")
          setBusinessId(DEMO_BUSINESS_ID)
          toast({
            title: "Bienvenido",
            description: "Para comenzar, crea tu negocio usando el formulario a continuación.",
          })
        }
      } catch (error) {
        console.error("Error al obtener ID de negocio:", error)

        if (!isMounted) return

        setBusinessId(DEMO_BUSINESS_ID)

        toast({
          title: "Modo demostración",
          description: "No se pudo obtener la información del negocio. Mostrando datos de ejemplo.",
        })
      } finally {
        if (isMounted) {
          setIsBusinessIdLoaded(true)
        }
      }
    }

    getBusinessId()

    return () => {
      isMounted = false
    }
  }, [user, toast, isBusinessIdLoaded])

  // Cargar datos del dashboard
  const loadDashboardData = useCallback(async () => {
    if (!businessId || isDataLoaded) return

    setIsLoading(true)
    try {
      // Cargar estadísticas
      const statsData = await fetchDashboardStats(businessId)
      setStats(statsData)

      // Cargar próximas reservas
      setLoadingReservations(true)
      setReservationsError(false)
      try {
        const reservationsData = await fetchUpcomingReservations(businessId)
        setUpcomingReservations(reservationsData)
      } catch (error) {
        console.error("Error loading reservations:", error)
        setReservationsError(true)
        // Proporcionar datos de ejemplo en caso de error
        setUpcomingReservations([])
      } finally {
        setLoadingReservations(false)
      }

      // Cargar configuración del negocio
      const settingsData = await fetchBusinessSettings(businessId)

      if (settingsData) {
        setBusinessSettings(settingsData)
      }

      setIsDataLoaded(true)
    } catch (error) {
      console.error("Error loading dashboard data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del dashboard",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [businessId, toast, isDataLoaded])

  useEffect(() => {
    if (businessId && !isDataLoaded) {
      loadDashboardData()
    } else if (!businessId && isBusinessIdLoaded) {
      // Si no hay negocio pero ya se verificó, dejar de cargar
      setIsLoading(false)
    }
  }, [businessId, isDataLoaded, loadDashboardData, isBusinessIdLoaded])

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!businessId || !businessSettings) return

    setIsSaving(true)
    try {
      // Actualizar configuración del negocio
      const success = await updateBusinessSettings(businessId, businessSettings)

      if (success) {
        toast({
          title: "Configuración actualizada",
          description: "La configuración del negocio se ha actualizado correctamente",
        })
      } else {
        throw new Error("No se pudo actualizar la configuración")
      }
    } catch (error) {
      console.error("Error updating business settings:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración del negocio",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSettingsChange = (field: keyof BusinessSettings, value: string) => {
    if (!businessSettings) return

    setBusinessSettings({
      ...businessSettings,
      [field]: value,
    })
  }

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !newBusinessName || !newBusinessType) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    setIsCreatingBusiness(true)

    try {
      const result = await createBusiness(user.id, {
        name: newBusinessName,
        type: newBusinessType,
        phone: "",
        address: "",
        city: "",
        state: "",
        country: "",
        postal_code: "",
        opening_time: "09:00",
        closing_time: "18:00",
      })

      if (result.success && result.businessId) {
        toast({
          title: "Negocio creado",
          description: "Tu negocio ha sido creado correctamente",
        })

        // Actualizar el estado y recargar los datos
        setBusinessId(result.businessId)
        setIsBusinessIdLoaded(true)
        setIsDataLoaded(false)

        // Recargar la página para asegurar que todo se actualice correctamente
        window.location.reload()
      } else {
        throw new Error(result.error || "No se pudo crear el negocio")
      }
    } catch (error) {
      console.error("Error creating business:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el negocio",
        variant: "destructive",
      })
    } finally {
      setIsCreatingBusiness(false)
    }
  }

  // Formatear fecha y hora
  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "PPp", { locale: es })
    } catch (error) {
      return dateString
    }
  }

  // Si no hay negocio, mostrar formulario para crear uno
  if (isBusinessIdLoaded && businessId === DEMO_BUSINESS_ID && !isLoading) {
    return (
      <RouteGuard>
        <div className="container py-10">
          <h1 className="text-3xl font-bold mb-6">Configuración Inicial</h1>

          <Card>
            <CardHeader>
              <CardTitle>Configura tu Negocio</CardTitle>
              <CardDescription>
                Para comenzar a usar el sistema de reservas, necesitas configurar tu negocio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateBusiness} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Nombre del Negocio</Label>
                  <Input
                    id="business-name"
                    value={newBusinessName}
                    onChange={(e) => setNewBusinessName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-type">Tipo de Negocio</Label>
                  <select
                    id="business-type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newBusinessType}
                    onChange={(e) => setNewBusinessType(e.target.value)}
                    required
                  >
                    <option value="">Selecciona un tipo</option>
                    <option value="restaurant">Restaurante</option>
                    <option value="salon">Salón de belleza</option>
                    <option value="medical">Consultorio médico</option>
                    <option value="gym">Gimnasio</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <Button type="submit" className="w-full" disabled={isCreatingBusiness}>
                  {isCreatingBusiness ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    "Crear Negocio"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard requiredRole="business" redirectTo="/business/login">
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Panel de Control</h1>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Bienvenido, {user?.email}</CardTitle>
            <CardDescription>
              {businessId === DEMO_BUSINESS_ID
                ? "Estás en modo demostración. Crea tu negocio para acceder a todas las funcionalidades."
                : "Has iniciado sesión correctamente. Este es tu panel de control."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>ID de usuario: {user?.id}</p>
            <p>Email: {user?.email}</p>
            <p>Último inicio de sesión: {new Date(user?.last_sign_in_at || "").toLocaleString()}</p>
            {businessSettings && businessId !== DEMO_BUSINESS_ID && (
              <p className="mt-2">
                Negocio: <strong>{businessSettings.name}</strong>
              </p>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Cargando datos...</span>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reservas Totales</CardTitle>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalReservations || 0}</div>
                  <p className="text-xs text-muted-foreground">Reservas registradas</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Clientes Nuevos</CardTitle>
                  <UsersIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.newClients || 0}</div>
                  <p className="text-xs text-muted-foreground">Últimos 30 días</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
                  <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats?.revenue || 0}</div>
                  <p className="text-xs text-muted-foreground">Reservas completadas</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tasa de Ocupación</CardTitle>
                  <BarChartIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.occupancyRate || 0}%</div>
                  <p className="text-xs text-muted-foreground">Capacidad utilizada</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="upcoming">Próximas Reservas</TabsTrigger>
                <TabsTrigger value="calendar">Calendario</TabsTrigger>
                <TabsTrigger value="settings">Configuración</TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming">
                <Card>
                  <CardHeader>
                    <CardTitle>Próximas Reservas</CardTitle>
                    <CardDescription>Gestiona las reservas programadas para los próximos días.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingReservations ? (
                      <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                        <span>Cargando reservas...</span>
                      </div>
                    ) : reservationsError ? (
                      <div className="text-center py-8 flex flex-col items-center">
                        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Error al cargar reservas</h3>
                        <p className="text-muted-foreground mb-4">
                          No se pudieron cargar las reservas. Por favor, intenta de nuevo más tarde.
                        </p>
                        <Button onClick={() => window.location.reload()}>Reintentar</Button>
                      </div>
                    ) : upcomingReservations.length === 0 ? (
                      <div className="text-center py-8 flex flex-col items-center">
                        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No hay reservas próximas</h3>
                        <p className="text-muted-foreground mb-4">
                          Para ver reservas aquí, necesitas configurar tus servicios y recibir reservas de clientes.
                        </p>
                        <div className="flex gap-4">
                          <Button asChild>
                            <Link href="/dashboard/services">
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Configurar servicios
                            </Link>
                          </Button>
                          <Button variant="outline" asChild>
                            <Link href="/reservations">Ver página de reservas</Link>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {upcomingReservations.map((reservation) => (
                          <div key={reservation.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">{reservation.client_name}</p>
                              <p className="text-sm text-muted-foreground">{reservation.service_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatDateTime(reservation.start_time)}</p>
                              <p className="text-sm text-muted-foreground">{reservation.duration} minutos</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="calendar">
                <Card>
                  <CardHeader>
                    <CardTitle>Calendario de Reservas</CardTitle>
                    <CardDescription>Vista mensual de todas tus reservas programadas.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {businessId ? (
                      <ReservationCalendar businessId={businessId} />
                    ) : (
                      <div className="h-[400px] flex flex-col items-center justify-center border rounded-lg">
                        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Calendario no disponible</h3>
                        <p className="text-muted-foreground mb-4 text-center max-w-md">
                          Para ver el calendario de reservas, primero debes configurar tu negocio y crear servicios.
                        </p>
                        <Button asChild>
                          <Link href="/dashboard/settings">
                            <Settings className="h-4 w-4 mr-2" />
                            Configurar negocio
                          </Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Configuración del Negocio</CardTitle>
                    <CardDescription>Administra la información y preferencias de tu negocio.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!businessSettings ? (
                      <div className="text-center py-8 flex flex-col items-center">
                        <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Configura tu negocio</h3>
                        <p className="text-muted-foreground mb-4 max-w-md">
                          Para comenzar a recibir reservas, necesitas configurar la información básica de tu negocio.
                        </p>
                        <Button onClick={() => router.push("/dashboard/settings")}>
                          <Settings className="h-4 w-4 mr-2" />
                          Configurar ahora
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleSettingsSubmit} className="space-y-4">
                        <div className="grid gap-2">
                          <h3 className="text-lg font-medium">Información General</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="business-name">Nombre del Negocio</Label>
                              <Input
                                id="business-name"
                                value={businessSettings.name}
                                onChange={(e) => handleSettingsChange("name", e.target.value)}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="business-type">Tipo de Negocio</Label>
                              <select
                                id="business-type"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={businessSettings.type}
                                onChange={(e) => handleSettingsChange("type", e.target.value)}
                                required
                              >
                                <option value="">Selecciona un tipo</option>
                                <option value="restaurant">Restaurante</option>
                                <option value="salon">Salón de belleza</option>
                                <option value="medical">Consultorio médico</option>
                                <option value="gym">Gimnasio</option>
                                <option value="other">Otro</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <h3 className="text-lg font-medium">Contacto</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="business-phone">Teléfono</Label>
                              <Input
                                id="business-phone"
                                type="tel"
                                value={businessSettings.phone}
                                onChange={(e) => handleSettingsChange("phone", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="business-address">Dirección</Label>
                              <Input
                                id="business-address"
                                value={businessSettings.address}
                                onChange={(e) => handleSettingsChange("address", e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="business-city">Ciudad</Label>
                              <Input
                                id="business-city"
                                value={businessSettings.city}
                                onChange={(e) => handleSettingsChange("city", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="business-state">Provincia</Label>
                              <Input
                                id="business-state"
                                value={businessSettings.state}
                                onChange={(e) => handleSettingsChange("state", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="business-country">País</Label>
                              <Input
                                id="business-country"
                                value={businessSettings.country}
                                onChange={(e) => handleSettingsChange("country", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="business-postal">Código Postal</Label>
                              <Input
                                id="business-postal"
                                value={businessSettings.postal_code}
                                onChange={(e) => handleSettingsChange("postal_code", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <h3 className="text-lg font-medium">Horario de Atención</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="opening-time">Hora de Apertura</Label>
                              <Input
                                id="opening-time"
                                type="time"
                                value={businessSettings.opening_time}
                                onChange={(e) => handleSettingsChange("opening_time", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="closing-time">Hora de Cierre</Label>
                              <Input
                                id="closing-time"
                                type="time"
                                value={businessSettings.closing_time}
                                onChange={(e) => handleSettingsChange("closing_time", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        <Button type="submit" className="mt-4" disabled={isSaving}>
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Guardando...
                            </>
                          ) : (
                            "Guardar cambios"
                          )}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </RouteGuard>
  )
}

