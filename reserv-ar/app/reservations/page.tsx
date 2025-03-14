"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import RouteGuard from "@/components/route-guard"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import {
  fetchBusinessServices,
  fetchAvailableTimeSlots,
  createReservation,
  fetchUserReservations,
  updateReservationStatus,
  type Service,
  type TimeSlot,
  type Reservation,
} from "@/lib/services/reservation-service"
import { fetchBusinessIdByOwnerId } from "@/lib/services/dashboard-service"
import { format, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react"

export default function ReservationsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [service, setService] = useState<string>("")
  const [time, setTime] = useState<string>("")
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [userReservations, setUserReservations] = useState<Reservation[]>([])
  const [notes, setNotes] = useState("")
  const [activeTab, setActiveTab] = useState("new")

  // Obtener el ID del negocio y los servicios disponibles
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        console.log("Obteniendo ID de negocio para usuario:", user.id)
        // Obtener el ID del negocio
        const id = await fetchBusinessIdByOwnerId(user.id)

        if (id) {
          console.log("ID de negocio obtenido:", id)
          setBusinessId(id)

          // Obtener los servicios disponibles
          const servicesData = await fetchBusinessServices(id)
          setServices(servicesData)
        } else {
          console.log("No se encontró un negocio para este usuario. Usando ID ficticio para demostración.")
          // Usar un ID ficticio para demostración
          const demoId = "00000000-0000-0000-0000-000000000000"
          setBusinessId(demoId)

          // Obtener servicios de ejemplo
          const demoServices = [
            { id: "1", name: "Corte de cabello", description: "Corte básico", duration: 30, price: 20 },
            { id: "2", name: "Manicura", description: "Manicura completa", duration: 45, price: 35 },
            { id: "3", name: "Masaje", description: "Masaje relajante", duration: 60, price: 50 },
          ]
          setServices(demoServices)

          toast({
            title: "Modo demostración",
            description: "No se encontró un negocio asociado a tu cuenta. Se están mostrando datos de ejemplo.",
          })
        }

        // Obtener las reservas del usuario
        const reservationsData = await fetchUserReservations(user.id)
        setUserReservations(reservationsData)
      } catch (error) {
        console.error("Error al obtener datos iniciales:", error)

        // Configurar datos de demostración en caso de error
        setBusinessId("00000000-0000-0000-0000-000000000000")
        setServices([
          { id: "1", name: "Corte de cabello", description: "Corte básico", duration: 30, price: 20 },
          { id: "2", name: "Manicura", description: "Manicura completa", duration: 45, price: 35 },
          { id: "3", name: "Masaje", description: "Masaje relajante", duration: 60, price: 50 },
        ])

        toast({
          title: "Error",
          description: "No se pudieron cargar los datos. Se están mostrando datos de ejemplo.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchInitialData()
  }, [user, toast])

  // Obtener los horarios disponibles cuando cambia la fecha o el servicio
  useEffect(() => {
    const fetchTimeSlots = async () => {
      if (!businessId || !service || !date) return

      setIsLoading(true)
      try {
        const formattedDate = format(date, "yyyy-MM-dd")
        const slots = await fetchAvailableTimeSlots(businessId, service, formattedDate)
        setTimeSlots(slots)
      } catch (error) {
        console.error("Error fetching time slots:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los horarios disponibles",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (step === 3) {
      fetchTimeSlots()
    }
  }, [businessId, service, date, step, toast])

  const handleNext = () => {
    setStep(step + 1)
  }

  const handleBack = () => {
    setStep(step - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !businessId || !service || !date || !time) {
      toast({
        title: "Error",
        description: "Por favor, completa todos los campos",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Formatear la fecha y hora
      const formattedDate = format(date, "yyyy-MM-dd")
      const startTime = `${formattedDate}T${time}:00`

      // Crear la reserva
      const result = await createReservation(businessId, service, user.id, startTime, notes)

      if (!result.success) {
        throw new Error(result.error || "Error al crear la reserva")
      }

      toast({
        title: "Reserva confirmada",
        description: "Tu reserva ha sido creada exitosamente",
      })

      // Actualizar la lista de reservas del usuario
      const reservationsData = await fetchUserReservations(user.id)
      setUserReservations(reservationsData)

      // Reiniciar el formulario
      setService("")
      setDate(new Date())
      setTime("")
      setNotes("")
      setStep(1)
      setActiveTab("list")
    } catch (error) {
      console.error("Error creating reservation:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear la reserva",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelReservation = async (reservationId: string) => {
    if (!confirm("¿Estás seguro de que deseas cancelar esta reserva?")) {
      return
    }

    setIsLoading(true)
    try {
      const success = await updateReservationStatus(reservationId, "cancelled")

      if (!success) {
        throw new Error("No se pudo cancelar la reserva")
      }

      toast({
        title: "Reserva cancelada",
        description: "Tu reserva ha sido cancelada exitosamente",
      })

      // Actualizar la lista de reservas del usuario
      if (user) {
        const reservationsData = await fetchUserReservations(user.id)
        setUserReservations(reservationsData)
      }
    } catch (error) {
      console.error("Error cancelling reservation:", error)
      toast({
        title: "Error",
        description: "No se pudo cancelar la reserva",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
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

  // Obtener el nombre del servicio
  const getServiceName = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId)
    return service ? service.name : "Servicio"
  }

  // Obtener el estado de la reserva en español
  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendiente"
      case "confirmed":
        return "Confirmada"
      case "cancelled":
        return "Cancelada"
      case "completed":
        return "Completada"
      default:
        return status
    }
  }

  // Obtener el icono del estado
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "cancelled":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "completed":
        return <CheckCircle className="h-5 w-5 text-blue-500" />
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />
    }
  }

  return (
    <RouteGuard>
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Mis Reservas</h1>

        <div className="flex space-x-2 mb-6">
          <Button variant={activeTab === "new" ? "default" : "outline"} onClick={() => setActiveTab("new")}>
            Nueva Reserva
          </Button>
          <Button variant={activeTab === "list" ? "default" : "outline"} onClick={() => setActiveTab("list")}>
            Mis Reservas
          </Button>
        </div>

        {activeTab === "new" ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Nueva Reserva</CardTitle>
              <CardDescription>
                {step === 1 && "Selecciona el servicio que deseas reservar"}
                {step === 2 && "Elige la fecha para tu reserva"}
                {step === 3 && "Selecciona el horario disponible"}
                {step === 4 && "Confirma los detalles de tu reserva"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="service">Servicio</Label>
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Cargando servicios...</span>
                        </div>
                      ) : services.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">No hay servicios disponibles</div>
                      ) : (
                        <Select value={service} onValueChange={setService}>
                          <SelectTrigger id="service">
                            <SelectValue placeholder="Selecciona un servicio" />
                          </SelectTrigger>
                          <SelectContent>
                            {services.map((service) => (
                              <SelectItem key={service.id} value={service.id}>
                                {service.name} - ${service.price.toFixed(2)} ({service.duration} min)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <Label>Fecha</Label>
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      className="rounded-md border mx-auto"
                      disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                    />
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="time">Horario Disponible</Label>
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Cargando horarios...</span>
                        </div>
                      ) : timeSlots.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          No hay horarios disponibles para esta fecha
                        </div>
                      ) : (
                        <Select value={time} onValueChange={setTime}>
                          <SelectTrigger id="time">
                            <SelectValue placeholder="Selecciona un horario" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeSlots
                              .filter((slot) => slot.available)
                              .map((slot) => (
                                <SelectItem key={slot.start} value={slot.start}>
                                  {slot.start} - {slot.end}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notas adicionales (opcional)</Label>
                      <textarea
                        id="notes"
                        className="w-full min-h-[100px] p-2 border rounded-md"
                        placeholder="Agrega cualquier información adicional que necesitemos saber"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4">
                    <h3 className="font-medium">Resumen de la Reserva</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Servicio:</span>
                        <span className="font-medium">{getServiceName(service)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fecha:</span>
                        <span className="font-medium">{date?.toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hora:</span>
                        <span className="font-medium">{time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duración:</span>
                        <span className="font-medium">
                          {services.find((s) => s.id === service)?.duration || 60} minutos
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Precio:</span>
                        <span className="font-medium">
                          ${services.find((s) => s.id === service)?.price.toFixed(2) || "0.00"}
                        </span>
                      </div>
                      {notes && (
                        <div className="mt-2">
                          <span className="text-muted-foreground">Notas:</span>
                          <p className="mt-1">{notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
            <CardFooter className="flex justify-between">
              {step > 1 && (
                <Button variant="outline" onClick={handleBack} disabled={isLoading}>
                  Atrás
                </Button>
              )}
              {step < 4 ? (
                <Button
                  onClick={handleNext}
                  disabled={isLoading || (step === 1 && !service) || (step === 2 && !date) || (step === 3 && !time)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    "Siguiente"
                  )}
                </Button>
              ) : (
                <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    "Confirmar Reserva"
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Mis Reservas</CardTitle>
              <CardDescription>Historial de tus reservas y su estado actual</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Cargando reservas...</span>
                </div>
              ) : userReservations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No tienes reservas registradas</div>
              ) : (
                <div className="space-y-4">
                  {userReservations.map((reservation) => (
                    <div key={reservation.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">{reservation.services?.name || "Servicio"}</h3>
                          <p className="text-sm text-muted-foreground">{reservation.businesses?.name || "Negocio"}</p>
                        </div>
                        <div className="flex items-center">
                          {getStatusIcon(reservation.status)}
                          <span className="ml-1 text-sm font-medium">{getStatusText(reservation.status)}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <p className="text-muted-foreground">Fecha y hora:</p>
                          <p>{formatDateTime(reservation.start_time)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Duración:</p>
                          <p>{reservation.services?.duration || 60} minutos</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Precio:</p>
                          <p>${reservation.services?.price.toFixed(2) || "0.00"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Estado de pago:</p>
                          <p>{reservation.payment_status === "paid" ? "Pagado" : "Pendiente"}</p>
                        </div>
                      </div>
                      {reservation.status !== "cancelled" && reservation.status !== "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleCancelReservation(reservation.id)}
                          disabled={isLoading}
                        >
                          Cancelar reserva
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </RouteGuard>
  )
}

