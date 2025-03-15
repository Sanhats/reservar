import { supabase } from "@/lib/supabase"

// ID ficticio para modo demostración
export const DEMO_BUSINESS_ID = "demo-business-id"

// Caché para evitar solicitudes repetidas
const businessIdCache: Record<string, string> = {}

export type DashboardStats = {
  totalReservations: number
  newClients: number
  revenue: number
  occupancyRate: number
}

export type UpcomingReservation = {
  id: string
  client_name: string
  service_name: string
  start_time: string
  duration: number
  status: string
}

export type BusinessSettings = {
  id: string
  name: string
  type: string
  phone: string
  address: string
  city: string
  state: string
  country: string
  postal_code: string
  opening_time: string
  closing_time: string
}

export async function fetchDashboardStats(businessId: string): Promise<DashboardStats> {
  try {
    // Si es el ID de demostración, devolver datos vacíos
    if (businessId === DEMO_BUSINESS_ID) {
      return {
        totalReservations: 0,
        newClients: 0,
        revenue: 0,
        occupancyRate: 0,
      }
    }

    // Obtener el total de reservas
    const { count: totalReservations, error: reservationsError } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)

    if (reservationsError) throw reservationsError

    // Obtener clientes nuevos (registrados en el último mes)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: newClients, error: clientsError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("user_type", "client")
      .gt("created_at", thirtyDaysAgo.toISOString())

    if (clientsError) throw clientsError

    // Obtener ingresos (suma de todas las reservas con estado "completed" y "paid")
    const { data: revenueData, error: revenueError } = await supabase
      .from("reservations")
      .select("service_id")
      .eq("business_id", businessId)
      .eq("status", "completed")
      .eq("payment_status", "paid")

    if (revenueError) throw revenueError

    // Para simplificar, calculamos un ingreso estimado basado en el número de reservas completadas
    // En un sistema real, se sumaría el precio real de cada servicio
    const revenue = revenueData ? revenueData.length * 50 : 0

    // Calcular tasa de ocupación (simplificado)
    // En un sistema real, esto sería más complejo y consideraría la disponibilidad real
    const occupancyRate = totalReservations ? Math.min(Math.round((totalReservations / 100) * 100), 100) : 0

    return {
      totalReservations: totalReservations || 0,
      newClients: newClients || 0,
      revenue,
      occupancyRate,
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    // Devolver datos reales en cero en lugar de datos de ejemplo
    return {
      totalReservations: 0,
      newClients: 0,
      revenue: 0,
      occupancyRate: 0,
    }
  }
}

export async function fetchUpcomingReservations(businessId: string): Promise<UpcomingReservation[]> {
  try {
    // Si es el ID de demostración, devolver array vacío
    if (businessId === DEMO_BUSINESS_ID) {
      return []
    }

    const now = new Date().toISOString()

    // Modificar la consulta para no usar la relación con profiles que no existe
    const { data, error } = await supabase
      .from("reservations")
      .select(`
        id,
        start_time,
        status,
        client_name,
        services (
          name,
          duration
        )
      `)
      .eq("business_id", businessId)
      .gt("start_time", now)
      .order("start_time", { ascending: true })
      .limit(10)

    if (error) throw error

    if (!data || data.length === 0) {
      return []
    }

    return data.map((reservation) => ({
      id: reservation.id,
      client_name: reservation.client_name || "Cliente",
      service_name: reservation.services?.name || "Servicio",
      start_time: reservation.start_time,
      duration: reservation.services?.duration || 30,
      status: reservation.status,
    }))
  } catch (error) {
    console.error("Error fetching upcoming reservations:", error)
    return []
  }
}

export async function fetchBusinessSettings(businessId: string): Promise<BusinessSettings | null> {
  try {
    // Si es el ID de demostración, devolver null para que se muestre el estado vacío
    if (businessId === DEMO_BUSINESS_ID) {
      return null
    }

    const { data, error } = await supabase.from("businesses").select("*").eq("id", businessId).single()

    if (error) {
      // Si el error es 'No rows found', devolver null
      if (error.code === "PGRST116") {
        console.log(`No se encontró configuración para el negocio: ${businessId}`)
        return null
      }
      throw error
    }

    if (!data) {
      return null
    }

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      phone: data.phone || "",
      address: data.address || "",
      city: data.city || "",
      state: data.state || "",
      country: data.country || "",
      postal_code: data.postal_code || "",
      opening_time: data.opening_time || "09:00",
      closing_time: data.closing_time || "18:00",
    }
  } catch (error) {
    console.error("Error fetching business settings:", error)
    return null
  }
}

export async function updateBusinessSettings(
  businessId: string,
  settings: Partial<BusinessSettings>,
): Promise<boolean> {
  try {
    // Si es el ID de demostración, simular éxito
    if (businessId === DEMO_BUSINESS_ID) {
      console.log("Modo demostración: Simulando actualización exitosa de configuración")
      return true
    }

    const { error } = await supabase
      .from("businesses")
      .update({
        name: settings.name,
        type: settings.type,
        phone: settings.phone,
        address: settings.address,
        city: settings.city,
        state: settings.state,
        country: settings.country,
        postal_code: settings.postal_code,
        opening_time: settings.opening_time,
        closing_time: settings.closing_time,
        updated_at: new Date().toISOString(),
      })
      .eq("id", businessId)

    if (error) throw error

    return true
  } catch (error) {
    console.error("Error updating business settings:", error)
    return false
  }
}

// Modificar la función fetchBusinessIdByOwnerId para usar caché y evitar solicitudes repetidas
export async function fetchBusinessIdByOwnerId(userId: string): Promise<string | null> {
  try {
    if (!userId) {
      console.log("fetchBusinessIdByOwnerId: userId es null o undefined")
      return null
    }

    // Limpiar la caché para asegurar datos frescos
    delete businessIdCache[userId]

    console.log("Buscando negocio para el usuario:", userId)

    // Intentar obtener el negocio directamente con una consulta más simple
    try {
      const { data, error } = await supabase.from("businesses").select("id, name").eq("owner_id", userId).maybeSingle()

      if (error) {
        throw error
      }

      if (data) {
        console.log("Negocio encontrado:", data.id, data.name)
        // Guardar en caché
        businessIdCache[userId] = data.id
        return data.id
      } else {
        console.log("No se encontró ningún negocio para el usuario:", userId)
        return null
      }
    } catch (queryError) {
      console.error("Error en la consulta a Supabase:", queryError)
      return null
    }
  } catch (error) {
    console.error("Error al obtener ID del negocio:", error)
    return null
  }
}

// Función para crear un nuevo negocio
export async function createBusiness(
  userId: string,
  businessData: Omit<BusinessSettings, "id">,
): Promise<{ success: boolean; businessId?: string; error?: string }> {
  try {
    if (!userId) {
      return { success: false, error: "ID de usuario no válido" }
    }

    const { data, error } = await supabase
      .from("businesses")
      .insert([
        {
          owner_id: userId,
          name: businessData.name,
          type: businessData.type,
          phone: businessData.phone,
          address: businessData.address,
          city: businessData.city,
          state: businessData.state,
          country: businessData.country,
          postal_code: businessData.postal_code,
          opening_time: businessData.opening_time,
          closing_time: businessData.closing_time,
          status: "verified", // Automáticamente verificado para simplificar
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Error al crear negocio:", error)
      return { success: false, error: error.message }
    }

    if (!data) {
      return { success: false, error: "No se pudo crear el negocio" }
    }

    // Limpiar la caché para este usuario
    delete businessIdCache[userId]

    return { success: true, businessId: data.id }
  } catch (error) {
    console.error("Error al crear negocio:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al crear el negocio",
    }
  }
}

