"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { ChevronLeft, ChevronRight, CalendarIcon, Check, X, AlertCircle, Loader2 } from "lucide-react"
import RouteGuard from "@/components/route-guard"
import { useAuth } from "@/lib/auth"
import { fetchBusinessIdByOwnerId, DEMO_BUSINESS_ID } from "@/lib/services/dashboard-service"
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  addDays,
  startOfWeek,
  endOfWeek,
  getDay,
  addHours,
} from "date-fns"
import { es } from "date-fns/locale"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Reservation = {
  id: string
  client_name: string
  service_name: string
  start_time: string
  end_time: string
  status: "pending" | "confirmed" | "cancelled" | "completed"
  notes?: string
}

type CalendarView = "month" | "week" | "day"

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarView, setCalendarView] = useState<CalendarView>("month")
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingReservations, setIsLoadingReservations] = useState(false)
  const [reservationsError, setReservationsError] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
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
            toast({
              title: "Modo demostración",
              description: "Estás viendo datos de ejemplo.",
            })
          }
        } else {
          setBusinessId(DEMO_BUSINESS_ID)
          setIsDemoMode(true)
          toast({
            title: "Modo demostración",
            description: "No se encontró un negocio asociado a tu cuenta. Se están mostrando datos de ejemplo.",
          })
        }
      } catch (error) {
        console.error("Error fetching business ID:", error)
        setBusinessId(DEMO_BUSINESS_ID)
        setIsDemoMode(true)
        toast({
          title: "Modo demostración",
          description: "No se pudo cargar la información del negocio. Se están mostrando datos de ejemplo.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    getBusinessId()
  }, [user, toast])

  // Cargar reservas
  useEffect(() => {
    const fetchReservations = async () => {
      if (!businessId) return

      setIsLoadingReservations(true)
      setReservationsError(false)

      try {
        if (isDemoMode) {
          // Datos de ejemplo para el modo demo
          const today = new Date()
          const demoReservations: Reservation[] = [
            {
              id: "1",
              client_name: "Ana García",
              service_name: "Corte de cabello",
              start_time: format(addHours(today, 2), "yyyy-MM-dd'T'HH:mm:ss"),
              end_time: format(addHours(today, 3), "yyyy-MM-dd'T'HH:mm:ss"),
              status: "confirmed",
            },
            {
              id: "2",
              client_name: "Carlos Rodríguez",
              service_name: "Manicura",
              start_time: format(addHours(addDays(today, 1), 10), "yyyy-MM-dd'T'HH:mm:ss"),
              end_time: format(addHours(addDays(today, 1), 11), "yyyy-MM-dd'T'HH:mm:ss"),
              status: "pending",
            },
            {
              id: "3",
              client_name: "María López",
              service_name: "Masaje",
              start_time: format(addHours(addDays(today, 2), 14), "yyyy-MM-dd'T'HH:mm:ss"),
              end_time: format(addHours(addDays(today, 2), 15), "yyyy-MM-dd'T'HH:mm:ss"),
              status: "confirmed",
            },
            {
              id: "4",
              client_name: "Juan Martínez",
              service_name: "Corte de cabello",
              start_time: format(addHours(addDays(today, 3), 11), "yyyy-MM-dd'T'HH:mm:ss"),
              end_time: format(addHours(addDays(today, 3), 12), "yyyy-MM-dd'T'HH:mm:ss"),
              status: "pending",
            },
            {
              id: "5",
              client_name: "Laura Fernández",
              service_name: "Manicura",
              start_time: format(addHours(addDays(today, 4), 16), "yyyy-MM-dd'T'HH:mm:ss"),
              end_time: format(addHours(addDays(today, 4), 17), "yyyy-MM-dd'T'HH:mm:ss"),
              status: "confirmed",
            },
          ]
          setReservations(demoReservations)
          return
        }

        // Obtener reservas para el período actual
        let startDate, endDate

        if (calendarView === "month") {
          startDate = format(startOfMonth(currentDate), "yyyy-MM-dd")
          endDate = format(endOfMonth(currentDate), "yyyy-MM-dd")
        } else if (calendarView === "week") {
          startDate = format(startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd")
          endDate = format(endOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd")
        } else {
          startDate = format(currentDate, "yyyy-MM-dd")
          endDate = format(currentDate, "yyyy-MM-dd")
        }

        const { data, error } = await supabase
          .from("reservations")
          .select(`
            id,
            client_name,
            service_name,
            start_time,
            end_time,
            status,
            notes
          `)
          .eq("business_id", businessId)
          .gte("start_time", `${startDate}T00:00:00`)
          .lte("start_time", `${endDate}T23:59:59`)
          .order("start_time")

        if (error) throw error

        setReservations(data || [])
      } catch (error) {
        console.error("Error fetching reservations:", error)
        setReservationsError(true)
        toast({
          title: "Error",
          description: "No se pudieron cargar las reservas",
          variant: "destructive",
        })

        // Proporcionar datos de ejemplo en caso de error
        setReservations([])
      } finally {
        setIsLoadingReservations(false)
      }
    }

    if (businessId) {
      fetchReservations()
    }
  }, [businessId, isDemoMode, currentDate, calendarView, toast])

  // Navegar al período anterior
  const prevPeriod = () => {
    if (calendarView === "month") {
      setCurrentDate(subMonths(currentDate, 1))
    } else if (calendarView === "week") {
      setCurrentDate(addDays(currentDate, -7))
    } else if (calendarView === "day") {
      setCurrentDate(addDays(currentDate, -1))
    }
  }

  // Navegar al período siguiente
  const nextPeriod = () => {
    if (calendarView === "month") {
      setCurrentDate(addMonths(currentDate, 1))
    } else if (calendarView === "week") {
      setCurrentDate(addDays(currentDate, 7))
    } else if (calendarView === "day") {
      setCurrentDate(addDays(currentDate, 1))
    }
  }

  // Ir a hoy
  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Obtener los días del mes actual
  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    })
  }, [currentDate])

  // Obtener los días de la semana actual
  const daysInWeek = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(currentDate, { weekStartsOn: 1 }),
      end: endOfWeek(currentDate, { weekStartsOn: 1 }),
    })
  }, [currentDate])

  // Obtener los nombres de los días de la semana
  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

  // Verificar si un día tiene reservas
  const getReservationsForDay = (day: Date) => {
    return reservations.filter((reservation) => isSameDay(parseISO(reservation.start_time), day))
  }

  // Formatear la hora
  const formatTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), "HH:mm", { locale: es })
    } catch (error) {
      return ""
    }
  }

  // Obtener el color según el estado de la reserva
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Obtener el icono según el estado de la reserva
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Check className="h-4 w-4 text-green-600" />
      case "pending":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case "cancelled":
        return <X className="h-4 w-4 text-red-600" />
      case "completed":
        return <Check className="h-4 w-4 text-blue-600" />
      default:
        return null
    }
  }

  // Cambiar el estado de una reserva
  const updateReservationStatus = async (id: string, status: "confirmed" | "cancelled" | "completed") => {
    if (isDemoMode) {
      // Actualizar en modo demo
      setReservations((prev) => prev.map((res) => (res.id === id ? { ...res, status } : res)))

      setIsDialogOpen(false)

      toast({
        title: "Estado actualizado",
        description: `La reserva ha sido marcada como ${status === "confirmed" ? "confirmada" : status === "cancelled" ? "cancelada" : "completada"}`,
      })

      return
    }

    try {
      const { error } = await supabase.from("reservations").update({ status }).eq("id", id)

      if (error) throw error

      // Actualizar la lista de reservas
      setReservations((prev) => prev.map((res) => (res.id === id ? { ...res, status } : res)))

      setIsDialogOpen(false)

      toast({
        title: "Estado actualizado",
        description: `La reserva ha sido marcada como ${status === "confirmed" ? "confirmada" : status === "cancelled" ? "cancelada" : "completada"}`,
      })
    } catch (error) {
      console.error("Error updating reservation status:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la reserva",
        variant: "destructive",
      })
    }
  }

  // Renderizar vista mensual
  const renderMonthView = () => {
    return (
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div key={day} className="text-center font-medium text-sm py-2">
            {day}
          </div>
        ))}

        {/* Espacios vacíos para alinear el primer día del mes */}
        {Array.from({ length: getDay(daysInMonth[0]) || 7 }).map((_, index) => (
          <div key={`empty-start-${index}`} className="h-24 border rounded-md bg-gray-50"></div>
        ))}

        {/* Días del mes */}
        {daysInMonth.map((day) => {
          const dayReservations = getReservationsForDay(day)
          const isCurrentMonth = isSameMonth(day, currentDate)

          return (
            <div
              key={day.toString()}
              className={`h-24 border rounded-md p-1 overflow-hidden ${
                !isCurrentMonth ? "bg-gray-50 text-gray-400" : isToday(day) ? "bg-blue-50 border-blue-200" : ""
              }`}
            >
              <div className="text-right text-sm font-medium">{format(day, "d")}</div>
              <div className="mt-1 space-y-1">
                {dayReservations.slice(0, 3).map((reservation) => (
                  <div
                    key={reservation.id}
                    className={`text-xs p-1 rounded truncate cursor-pointer ${getStatusColor(reservation.status)}`}
                    onClick={() => {
                      setSelectedReservation(reservation)
                      setIsDialogOpen(true)
                    }}
                  >
                    {formatTime(reservation.start_time)} {reservation.client_name}
                  </div>
                ))}
                {dayReservations.length > 3 && (
                  <div className="text-xs text-center text-blue-600 font-medium">+{dayReservations.length - 3} más</div>
                )}
              </div>
            </div>
          )
        })}

        {/* Espacios vacíos para completar la última semana */}
        {Array.from({ length: (7 - ((daysInMonth.length + getDay(daysInMonth[0])) % 7)) % 7 }).map((_, index) => (
          <div key={`empty-end-${index}`} className="h-24 border rounded-md bg-gray-50"></div>
        ))}
      </div>
    )
  }

  // Renderizar vista semanal
  const renderWeekView = () => {
    // Horas de trabajo (de 8 a 20)
    const workHours = Array.from({ length: 13 }, (_, i) => i + 8)

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-8 border-b">
            <div className="p-2 font-medium text-sm text-center">Hora</div>
            {daysInWeek.map((day) => (
              <div
                key={day.toString()}
                className={`p-2 font-medium text-sm text-center ${isToday(day) ? "bg-blue-50" : ""}`}
              >
                <div>{format(day, "EEE", { locale: es })}</div>
                <div>{format(day, "d", { locale: es })}</div>
              </div>
            ))}
          </div>

          {workHours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b min-h-[80px]">
              <div className="p-2 text-sm text-center border-r">{hour}:00</div>

              {daysInWeek.map((day) => {
                const hourReservations = reservations.filter((reservation) => {
                  const reservationDate = parseISO(reservation.start_time)
                  return isSameDay(reservationDate, day) && reservationDate.getHours() === hour
                })

                return (
                  <div key={day.toString()} className={`p-1 border-r relative ${isToday(day) ? "bg-blue-50" : ""}`}>
                    {hourReservations.map((reservation) => (
                      <div
                        key={reservation.id}
                        className={`text-xs p-1 mb-1 rounded ${getStatusColor(reservation.status)} cursor-pointer`}
                        onClick={() => {
                          setSelectedReservation(reservation)
                          setIsDialogOpen(true)
                        }}
                      >
                        <div className="font-medium">{formatTime(reservation.start_time)}</div>
                        <div className="truncate">{reservation.client_name}</div>
                        <div className="truncate text-[10px]">{reservation.service_name}</div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Renderizar vista diaria
  const renderDayView = () => {
    // Horas de trabajo (de 8 a 20)
    const workHours = Array.from({ length: 13 }, (_, i) => i + 8)

    return (
      <div>
        <h3 className="text-lg font-medium mb-4 text-center">
          {format(currentDate, "EEEE d 'de' MMMM", { locale: es })}
        </h3>

        <div className="space-y-2">
          {workHours.map((hour) => {
            const hourReservations = reservations.filter((reservation) => {
              const reservationDate = parseISO(reservation.start_time)
              return isSameDay(reservationDate, currentDate) && reservationDate.getHours() === hour
            })

            return (
              <div key={hour} className="flex border rounded-md overflow-hidden">
                <div className="w-16 p-2 text-sm text-center bg-gray-50 border-r font-medium">{hour}:00</div>

                <div className="flex-1 p-2 min-h-[80px]">
                  {hourReservations.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-gray-400">Sin reservas</div>
                  ) : (
                    <div className="space-y-2">
                      {hourReservations.map((reservation) => (
                        <div
                          key={reservation.id}
                          className={`p-2 rounded ${getStatusColor(reservation.status)} cursor-pointer`}
                          onClick={() => {
                            setSelectedReservation(reservation)
                            setIsDialogOpen(true)
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{reservation.client_name}</div>
                              <div className="text-sm">{reservation.service_name}</div>
                            </div>
                            <div className="text-sm font-medium">
                              {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <RouteGuard>
        <div className="container py-10">
          <h1 className="text-3xl font-bold mb-6">Calendario de Reservas</h1>
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Cargando datos...</span>
          </div>
        </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard>
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Calendario de Reservas</h1>

        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={prevPeriod}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={nextPeriod}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold ml-2">
              {calendarView === "month"
                ? format(currentDate, "MMMM yyyy", { locale: es })
                : calendarView === "week"
                  ? `${format(daysInWeek[0], "d MMM", { locale: es })} - ${format(daysInWeek[6], "d MMM", { locale: es })}`
                  : format(currentDate, "d MMMM yyyy", { locale: es })}
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <Select value={calendarView} onValueChange={(value: CalendarView) => setCalendarView(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Seleccionar vista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Vista mensual</SelectItem>
                <SelectItem value="week">Vista semanal</SelectItem>
                <SelectItem value="day">Vista diaria</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            {isLoadingReservations ? (
              <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                <span>Cargando reservas...</span>
              </div>
            ) : reservationsError ? (
              <div className="text-center py-8 flex flex-col items-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Error al cargar reservas</h3>
                <p className="text-muted-foreground mb-4">
                  No se pudieron cargar las reservas. Por favor, intenta de nuevo más tarde.
                </p>
                <Button onClick={() => window.location.reload()}>Reintentar</Button>
              </div>
            ) : reservations.length === 0 ? (
              <div className="text-center py-8 flex flex-col items-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay reservas</h3>
                <p className="text-muted-foreground mb-4">No hay reservas programadas para este período.</p>
              </div>
            ) : (
              <>
                {calendarView === "month" && renderMonthView()}
                {calendarView === "week" && renderWeekView()}
                {calendarView === "day" && renderDayView()}
              </>
            )}
          </CardContent>
        </Card>

        {/* Diálogo de detalles de reserva */}
        {selectedReservation && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Detalles de la reserva</DialogTitle>
                <DialogDescription>Información y acciones para esta reserva</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-lg">{selectedReservation.client_name}</h3>
                    <p className="text-muted-foreground">{selectedReservation.service_name}</p>
                  </div>
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${getStatusColor(selectedReservation.status)}`}
                  >
                    {getStatusIcon(selectedReservation.status)}
                    <span className="ml-1">
                      {selectedReservation.status === "confirmed"
                        ? "Confirmada"
                        : selectedReservation.status === "pending"
                          ? "Pendiente"
                          : selectedReservation.status === "cancelled"
                            ? "Cancelada"
                            : "Completada"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha y hora</p>
                    <p className="font-medium">
                      {format(parseISO(selectedReservation.start_time), "PPP", { locale: es })}
                    </p>
                    <p>
                      {formatTime(selectedReservation.start_time)} - {formatTime(selectedReservation.end_time)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Duración</p>
                    <p className="font-medium">
                      {Math.round(
                        (new Date(selectedReservation.end_time).getTime() -
                          new Date(selectedReservation.start_time).getTime()) /
                          60000,
                      )}{" "}
                      minutos
                    </p>
                  </div>
                </div>

                {selectedReservation.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notas</p>
                    <p className="p-2 bg-gray-50 rounded-md">{selectedReservation.notes}</p>
                  </div>
                )}
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                {selectedReservation.status === "pending" && (
                  <>
                    <Button
                      onClick={() => updateReservationStatus(selectedReservation.id, "confirmed")}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Confirmar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => updateReservationStatus(selectedReservation.id, "cancelled")}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </>
                )}

                {selectedReservation.status === "confirmed" && (
                  <>
                    <Button
                      onClick={() => updateReservationStatus(selectedReservation.id, "completed")}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Marcar como completada
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => updateReservationStatus(selectedReservation.id, "cancelled")}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </>
                )}

                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </RouteGuard>
  )
}

