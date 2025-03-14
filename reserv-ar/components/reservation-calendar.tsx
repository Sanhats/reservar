"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchUpcomingReservations } from "@/lib/services/dashboard-service"

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

  // Obtener las reservas para el mes actual
  useEffect(() => {
    const fetchReservations = async () => {
      if (!businessId) return

      setIsLoading(true)
      try {
        const data = await fetchUpcomingReservations(businessId)

        // Convertir las reservas al formato del calendario
        const calendarReservations = data.map((reservation) => ({
          id: reservation.id,
          client_name: reservation.client_name,
          service_name: reservation.service_name,
          start_time: reservation.start_time,
          date: new Date(reservation.start_time),
        }))

        setReservations(calendarReservations)
      } catch (error) {
        console.error("Error fetching reservations for calendar:", error)
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
                <div className="text-xs text-blue-600 font-medium">{getReservationsForDay(day).length} reserva(s)</div>
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
    </div>
  )
}

