"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { MapPin, Clock, Star, Phone } from "lucide-react"
import RouteGuard from "@/components/route-guard"
import { useAuth } from "@/lib/auth"
import { format, addDays } from "date-fns"

type Business = {
  id: string
  name: string
  type: string
  description: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  postal_code: string | null
  opening_time: string | null
  closing_time: string | null
}

type Service = {
  id: string
  name: string
  description: string | null
  duration: number
  price: number
}

type TimeSlot = {
  time: string
  available: boolean
}

export default function BusinessDetailPage() {
  const params = useParams()
  const businessId = params.id as string
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()

  const [business, setBusiness] = useState<Business | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isBooking, setIsBooking] = useState(false)

  // Cargar datos del negocio
  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        // Obtener información del negocio
        const { data: businessData, error: businessError } = await supabase
          .from("businesses")
          .select("*")
          .eq("id", businessId)
          .single()

        if (businessError) throw businessError

        setBusiness(businessData)

        // Obtener servicios del negocio
        const { data: servicesData, error: servicesError } = await supabase
          .from("services")
          .select("*")
          .eq("business_id", businessId)
          .order("name")

        if (servicesError) throw servicesError

        setServices(servicesData)
        if (servicesData.length > 0) {
          setSelectedService(servicesData[0].id)
        }
      } catch (error) {
        console.error("Error fetching business data:", error)
        toast({
          title: "Error",
          description: "No se pudo cargar la información del negocio",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchBusinessData()
  }, [businessId, toast])

  // Generar horarios disponibles cuando cambia el servicio o la fecha
  useEffect(() => {
    if (!selectedService || !selectedDate || !business) return

    // Aquí normalmente consultaríamos a la API para obtener los horarios disponibles
    // Para este ejemplo, generaremos horarios ficticios
    const generateTimeSlots = () => {
      const slots: TimeSlot[] = []
      const openingHour = business.opening_time ? Number.parseInt(business.opening_time.split(":")[0]) : 9
      const closingHour = business.closing_time ? Number.parseInt(business.closing_time.split(":")[0]) : 18

      for (let hour = openingHour; hour < closingHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
          // Aleatoriamente marcar algunos horarios como no disponibles
          const available = Math.random() > 0.3
          slots.push({ time, available })
        }
      }

      return slots
    }

    setTimeSlots(generateTimeSlots())
  }, [selectedService, selectedDate, business])

  // Renderizar estrellas para la calificación
  const renderStars = (rating = 4) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
      ))
  }

  const handleBooking = async () => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para realizar una reserva",
      })
      router.push(`/login?redirectedFrom=/businesses/${businessId}`)
      return
    }

    if (!selectedService || !selectedDate || !selectedTime) {
      toast({
        title: "Información incompleta",
        description: "Por favor selecciona un servicio, fecha y horario",
        variant: "destructive",
      })
      return
    }

    setIsBooking(true)

    try {
      // Formatear la fecha y hora
      const formattedDate = format(selectedDate, "yyyy-MM-dd")
      const startTime = `${formattedDate}T${selectedTime}:00`

      // Crear la reserva
      const { data, error } = await supabase
        .from("reservations")
        .insert([
          {
            business_id: businessId,
            service_id: selectedService,
            user_id: user.id,
            start_time: startTime,
            // Calcular end_time basado en la duración del servicio
            end_time: new Date(
              new Date(startTime).getTime() + (services.find((s) => s.id === selectedService)?.duration || 60) * 60000,
            ).toISOString(),
            status: "pending",
            payment_status: "pending",
            client_name: user.user_metadata?.full_name || user.email,
          },
        ])
        .select()

      if (error) throw error

      toast({
        title: "Reserva confirmada",
        description: "Tu reserva ha sido creada exitosamente",
      })

      // Redirigir a la página de reservas
      router.push("/reservations")
    } catch (error) {
      console.error("Error creating reservation:", error)
      toast({
        title: "Error",
        description: "No se pudo crear la reserva",
        variant: "destructive",
      })
    } finally {
      setIsBooking(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container py-10 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Negocio no encontrado</h1>
        <p>El negocio que buscas no existe o ha sido eliminado.</p>
        <Button className="mt-4" onClick={() => router.push("/businesses")}>
          Volver a la lista de negocios
        </Button>
      </div>
    )
  }

  return (
    <RouteGuard>
      <div className="container py-10">
        <Button variant="outline" className="mb-6" onClick={() => router.push("/businesses")}>
          ← Volver a la lista de negocios
        </Button>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Información del negocio */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>{business.name}</CardTitle>
                <CardDescription>{business.type.charAt(0).toUpperCase() + business.type.slice(1)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {business.description && <p className="text-sm text-muted-foreground">{business.description}</p>}

                <div className="flex items-center">
                  {renderStars(4)}
                  <span className="ml-2 text-sm text-muted-foreground">4.0 (24 reseñas)</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>
                      {business.address || "Dirección no disponible"}
                      {business.city && `, ${business.city}`}
                      {business.state && `, ${business.state}`}
                    </span>
                  </div>

                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>
                      {business.opening_time || "09:00"} - {business.closing_time || "18:00"}
                    </span>
                  </div>

                  {business.phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{business.phone}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Lista de servicios */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Servicios disponibles</CardTitle>
              </CardHeader>
              <CardContent>
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay servicios disponibles</p>
                ) : (
                  <div className="space-y-4">
                    {services.map((service) => (
                      <div key={service.id} className="flex justify-between items-start pb-2 border-b last:border-0">
                        <div>
                          <h3 className="font-medium">{service.name}</h3>
                          {service.description && (
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                          )}
                          <p className="text-sm">{service.duration} minutos</p>
                        </div>
                        <p className="font-bold">${service.price.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Formulario de reserva */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Reservar cita</CardTitle>
                <CardDescription>Selecciona un servicio, fecha y horario para tu reserva</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="service" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="service">Servicio</TabsTrigger>
                    <TabsTrigger value="date" disabled={!selectedService}>
                      Fecha
                    </TabsTrigger>
                    <TabsTrigger value="time" disabled={!selectedService || !selectedDate}>
                      Horario
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="service" className="py-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Selecciona un servicio</label>
                        <select
                          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={selectedService}
                          onChange={(e) => setSelectedService(e.target.value)}
                        >
                          <option value="" disabled>
                            Selecciona un servicio
                          </option>
                          {services.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name} - ${service.price.toFixed(2)} ({service.duration} min)
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedService && (
                        <Button onClick={() => document.querySelector('[data-value="date"]')?.click()}>
                          Continuar a selección de fecha
                        </Button>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="date" className="py-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Selecciona una fecha</label>
                        <div className="border rounded-md p-4">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                            className="mx-auto"
                          />
                        </div>
                      </div>

                      {selectedDate && (
                        <div className="flex justify-between">
                          <Button
                            variant="outline"
                            onClick={() => document.querySelector('[data-value="service"]')?.click()}
                          >
                            Volver
                          </Button>
                          <Button onClick={() => document.querySelector('[data-value="time"]')?.click()}>
                            Continuar a selección de horario
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="time" className="py-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Selecciona un horario</label>
                        <div className="grid grid-cols-3 gap-2">
                          {timeSlots.map((slot) => (
                            <Button
                              key={slot.time}
                              variant={selectedTime === slot.time ? "default" : "outline"}
                              disabled={!slot.available}
                              onClick={() => setSelectedTime(slot.time)}
                              className="h-10"
                            >
                              {slot.time}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between mt-6">
                        <Button
                          variant="outline"
                          onClick={() => document.querySelector('[data-value="date"]')?.click()}
                        >
                          Volver
                        </Button>
                        <Button onClick={handleBooking} disabled={!selectedTime || isBooking}>
                          {isBooking ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Procesando...
                            </>
                          ) : (
                            "Confirmar reserva"
                          )}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RouteGuard>
  )
}

