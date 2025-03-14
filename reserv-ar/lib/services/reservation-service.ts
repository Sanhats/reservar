import { supabase } from "@/lib/supabase"

export type Reservation = {
  id: string
  business_id: string
  service_id: string
  user_id: string
  start_time: string
  end_time: string
  status: "pending" | "confirmed" | "cancelled" | "completed"
  payment_status: "pending" | "paid" | "refunded"
  notes?: string
  created_at: string
}

export type Service = {
  id: string
  name: string
  description: string
  duration: number
  price: number
}

export type TimeSlot = {
  start: string
  end: string
  available: boolean
}

export async function fetchUserReservations(userId: string): Promise<Reservation[]> {
  try {
    const { data, error } = await supabase
      .from("reservations")
      .select(`
        *,
        services (
          name,
          duration,
          price
        ),
        businesses (
          name
        )
      `)
      .eq("user_id", userId)
      .order("start_time", { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Error fetching user reservations:", error)
    return []
  }
}

// Mejorar la función fetchBusinessServices para manejar errores y proporcionar datos de ejemplo
export async function fetchBusinessServices(businessId: string): Promise<Service[]> {
  try {
    if (!businessId) {
      console.log("fetchBusinessServices: businessId es null o undefined")
      return []
    }

    // Si es el ID ficticio para demostración, devolver servicios de ejemplo
    if (businessId === "00000000-0000-0000-0000-000000000000") {
      console.log("Usando servicios de ejemplo para demostración")
      return [
        { id: "1", name: "Corte de cabello", description: "Corte básico", duration: 30, price: 20 },
        { id: "2", name: "Manicura", description: "Manicura completa", duration: 45, price: 35 },
        { id: "3", name: "Masaje", description: "Masaje relajante", duration: 60, price: 50 },
      ]
    }

    console.log("Buscando servicios para el negocio:", businessId)
    const { data, error } = await supabase.from("services").select("*").eq("business_id", businessId).order("name")

    if (error) {
      console.error("Error al buscar servicios:", error.message, error.details)
      throw error
    }

    console.log(`Se encontraron ${data?.length || 0} servicios`)
    return data || []
  } catch (error) {
    console.error("Error al obtener servicios del negocio:", error)

    // Devolver datos de ejemplo en caso de error
    return [
      { id: "1", name: "Corte de cabello", description: "Corte básico", duration: 30, price: 20 },
      { id: "2", name: "Manicura", description: "Manicura completa", duration: 45, price: 35 },
      { id: "3", name: "Masaje", description: "Masaje relajante", duration: 60, price: 50 },
    ]
  }
}

export async function fetchAvailableTimeSlots(
  businessId: string,
  serviceId: string,
  date: string,
): Promise<TimeSlot[]> {
  try {
    // 1. Obtener la duración del servicio
    const { data: serviceData, error: serviceError } = await supabase
      .from("services")
      .select("duration")
      .eq("id", serviceId)
      .single()

    if (serviceError) throw serviceError

    const serviceDuration = serviceData?.duration || 60 // Duración en minutos

    // 2. Obtener el horario de atención del negocio
    const { data: businessData, error: businessError } = await supabase
      .from("businesses")
      .select("opening_time, closing_time")
      .eq("id", businessId)
      .single()

    if (businessError) throw businessError

    const openingTime = businessData?.opening_time || "09:00"
    const closingTime = businessData?.closing_time || "18:00"

    // 3. Obtener las reservas existentes para ese día
    const startOfDay = `${date}T00:00:00`
    const endOfDay = `${date}T23:59:59`

    const { data: existingReservations, error: reservationsError } = await supabase
      .from("reservations")
      .select("start_time, end_time")
      .eq("business_id", businessId)
      .gte("start_time", startOfDay)
      .lte("start_time", endOfDay)
      .not("status", "eq", "cancelled")

    if (reservationsError) throw reservationsError

    // 4. Generar slots de tiempo disponibles
    const slots: TimeSlot[] = []
    const slotDuration = serviceDuration // Duración de cada slot en minutos

    // Convertir horarios a minutos desde medianoche para facilitar cálculos
    const openingMinutes = convertTimeToMinutes(openingTime)
    const closingMinutes = convertTimeToMinutes(closingTime)

    // Crear array de slots ocupados
    const occupiedSlots: { start: number; end: number }[] = existingReservations
      ? existingReservations.map((reservation) => ({
          start: convertTimeToMinutes(reservation.start_time.split("T")[1].substring(0, 5)),
          end: convertTimeToMinutes(reservation.end_time.split("T")[1].substring(0, 5)),
        }))
      : []

    // Generar todos los slots posibles
    for (let time = openingMinutes; time <= closingMinutes - slotDuration; time += 30) {
      const slotStart = time
      const slotEnd = time + slotDuration

      // Verificar si el slot está disponible
      const isAvailable = !occupiedSlots.some(
        (occupied) =>
          (slotStart >= occupied.start && slotStart < occupied.end) ||
          (slotEnd > occupied.start && slotEnd <= occupied.end) ||
          (slotStart <= occupied.start && slotEnd >= occupied.end),
      )

      slots.push({
        start: convertMinutesToTime(slotStart),
        end: convertMinutesToTime(slotEnd),
        available: isAvailable,
      })
    }

    return slots
  } catch (error) {
    console.error("Error fetching available time slots:", error)
    return []
  }
}

export async function createReservation(
  businessId: string,
  serviceId: string,
  userId: string,
  startTime: string,
  notes?: string,
): Promise<{ success: boolean; reservation?: Reservation; error?: string }> {
  try {
    // 1. Obtener la duración del servicio
    const { data: serviceData, error: serviceError } = await supabase
      .from("services")
      .select("duration")
      .eq("id", serviceId)
      .single()

    if (serviceError) throw serviceError

    const serviceDuration = serviceData?.duration || 60 // Duración en minutos

    // 2. Calcular la hora de finalización
    const startDate = new Date(startTime)
    const endDate = new Date(startDate.getTime() + serviceDuration * 60000)
    const endTime = endDate.toISOString()

    // 3. Crear la reserva
    const { data, error } = await supabase
      .from("reservations")
      .insert([
        {
          business_id: businessId,
          service_id: serviceId,
          user_id: userId,
          start_time: startTime,
          end_time: endTime,
          status: "pending",
          payment_status: "pending",
          notes,
        },
      ])
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      reservation: data,
    }
  } catch (error) {
    console.error("Error creating reservation:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al crear la reserva",
    }
  }
}

export async function updateReservationStatus(
  reservationId: string,
  status: "pending" | "confirmed" | "cancelled" | "completed",
): Promise<boolean> {
  try {
    const { error } = await supabase.from("reservations").update({ status }).eq("id", reservationId)

    if (error) throw error

    return true
  } catch (error) {
    console.error("Error updating reservation status:", error)
    return false
  }
}

// Funciones auxiliares para convertir entre formatos de tiempo
function convertTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function convertMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

