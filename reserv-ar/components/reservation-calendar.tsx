"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"

type CalendarReservation = {
  id: string
  client_name: string
  service_name: string
  start_time: string
  date: Date
}

type CalendarProps = {
  businessId: string
}

export default function ReservationCalendar({ businessId }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [reservations, setReservations] = useState<CalendarReservation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isError, setIsError] = useState(false)

  // Obtener las reservas para el mes actual
  useEffect(() => {
    const fetchReservations = async () => {
      if (!businessId) {
        setReservations([])
        return
      }

      setIsLoading(true)
      setIsError(false)

      try {
        // Si es un ID de demostración, usar datos de ejemplo
        if (businessId === "demo-business-id" || businessId === "00000000-0000-0000-0000-000000000000") {
          // Generar algunas reservas de ejemplo para el mes actual
          const demoReservations: CalendarReservation[] = []

          // Generar 5 reservas aleatorias para el mes actual
          const daysInCurrentMonth = endOfMonth(currentMonth).getDate()
          const clientNames = ["Ana García", "Carlos Rodríguez", "María López", "Juan Martínez", "Laura Fernández"]
          const serviceNames = ["Corte de cabello", "Manicura", "Pedicura", "Masaje", "Tratamiento facial"]

          for (let i = 0; i < 5; i++) {
            const randomDay = Math.floor(Math.random() * daysInCurrentMonth) + 1
            const randomHour = Math.floor(Math.random() * 8) + 9 // Entre 9 y 17
            const randomDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), randomDay, randomHour)

            if (randomDate > new Date()) {
              // Solo fechas futuras
              demoReservations.push({
                id: `demo-${i}`,
                client_name: clientNames[Math.floor(Math.random() * clientNames.length)],
                service_name: serviceNames[Math.floor(Math.random() * serviceNames.length)],
                start_time: randomDate.toISOString(),
                date: randomDate,
              })
            }
          }

          setReservations(demoReservations)
          setIsLoading(false)
          return
        }

        // Obtener el primer y último día del mes
        const firstDay = startOfMonth(currentMonth)
        const lastDay = endOfMonth(currentMonth)

        // Formatear fechas para la consulta
        const startDate = format(firstDay, "yyyy-MM-dd")
        const endDate = format(lastDay, "yyyy-MM-dd")

        const { data, error } = await supabase
          .from("reservations")
          .select(`
            id,
            client_name,
            service_name,
            start_time
          `)
          .eq("business_id", businessId)
          .gte("start_time", `${startDate}T00:00:00`)
          .lte("start_time", `${endDate}T23:59:59`)
          .order("start_time")

        if (error) {
          throw error
        }

        // Convertir las reservas al formato del calendario
        const calendarReservations = data.map((reservation) => ({
          id: reservation.id,
          client_name: reservation.client_name || "Cliente",
          service_name: reservation.service_name || "Servicio",
          start_time: reservation.start_time,
          date: new Date(reservation.start_time),
        }))

        setReservations(calendarReservations)
      } catch (error) {
        console.error("Error fetching reservations for calendar:", error)
        setIsError(true)
        // Proporcionar algunos datos de ejemplo en caso de error
        const today = new Date()
        const demoReservations: CalendarReservation[] = [
          {
            id: "error-1",
            client_name: "Cliente de ejemplo",
            service_name: "Servicio de ejemplo",
            start_time: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 10).toISOString(),
            date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 10),
          },
        ]
        setReservations(demoReservations)
      } finally {
        setIsLoading(false)
      }
    }

    fetchReservations()
  }, [businessId, currentMonth])

  // Navegar al mes anterior
  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  // Navegar al mes siguiente
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  // Obtener los días del mes actual
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  // Obtener los nombres de los días de la semana
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

  // Verificar si un día tiene reservas
  const hasReservations = (day: Date) => {
    return reservations.some((reservation) => isSameDay(reservation.date, day))
  }

  // Obtener las reservas para un día específico
  const getReservationsForDay = (day: Date) => {
    return reservations.filter((reservation) => isSameDay(reservation.date, day))
  }

  // Formatear la hora
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "HH:mm", { locale: es })
    } catch (error) {
      return ""
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{format(currentMonth, "MMMM yyyy", { locale: es })}</h2>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : isError ? (
        <div className="text-center py-8 border rounded-md">
          <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Error al cargar reservas</h3>
          <p className="text-muted-foreground mb-4">No se pudieron cargar las reservas. Mostrando datos de ejemplo.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => (
              <div key={day} className="text-center font-medium text-sm py-2">
                {day}
              </div>
            ))}

            {/* Espacios vacíos para alinear el primer día del mes */}
            {Array.from({ length: daysInMonth[0].getDay() }).map((_, index) => (
              <div key={`empty-${index}`} className="h-24 border rounded-md bg-gray-50"></div>
            ))}

            {/* Días del mes */}
            {daysInMonth.map((day) => (
              <div
                key={day.toString()}
                className={`h-24 border rounded-md p-1 overflow-hidden ${hasReservations(day) ? "bg-blue-50" : ""} ${
                  selectedDate && isSameDay(day, selectedDate) ? "ring-2 ring-blue-500" : ""
                } hover:bg-gray-50 cursor-pointer`}
                onClick={() => setSelectedDate(day)}
              >
                <div className="text-right text-sm font-medium">{format(day, "d")}</div>
                <div className="mt-1">
                  {hasReservations(day) && (
                    <div className="text-xs text-blue-600 font-medium">
                      {getReservationsForDay(day).length} reserva(s)
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle>Reservas para {format(selectedDate, "PPP", { locale: es })}</CardTitle>
                <CardDescription>
                  {getReservationsForDay(selectedDate).length === 0
                    ? "No hay reservas para este día"
                    : `${getReservationsForDay(selectedDate).length} reserva(s) programadas`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getReservationsForDay(selectedDate).map((reservation) => (
                    <div key={reservation.id} className="flex justify-between items-center p-2 border rounded-md">
                      <div>
                        <p className="font-medium">{reservation.client_name}</p>
                        <p className="text-sm text-muted-foreground">{reservation.service_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatTime(reservation.start_time)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

