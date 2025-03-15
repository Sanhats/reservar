"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Calendar, Clock, MapPin, CheckCircle, XCircle, AlertCircle, Loader2, Star } from "lucide-react"
import RouteGuard from "@/components/route-guard"
import Link from "next/link"
import { format, parseISO, isAfter } from "date-fns"
import { es } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

type Reservation = {
  id: string
  business_id: string
  service_id: string
  start_time: string
  end_time: string
  status: "pending" | "confirmed" | "cancelled" | "completed"
  payment_status: "pending" | "paid" | "refunded"
  business_name: string
  service_name: string
  service_price: number
  service_duration: number
  has_review: boolean
}

// Actualizar para requerir el rol de cliente
export default function ReservationsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("upcoming")
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Cargar reservas
  useEffect(() => {
    const fetchReservations = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from("reservations")
          .select(`
            id,
            business_id,
            service_id,
            start_time,
            end_time,
            status,
            payment_status,
            businesses (name),
            services (name, price, duration)
          `)
          .eq("user_id", user.id)
          .order("start_time", { ascending: false })

        if (error) throw error

        // Verificar si hay reseñas para cada reserva
        const reservationsWithReviewStatus = await Promise.all(
          data.map(async (reservation) => {
            const { data: reviewData, error: reviewError } = await supabase
              .from("reviews")
              .select("id")
              .eq("reservation_id", reservation.id)
              .maybeSingle()

            return {
              id: reservation.id,
              business_id: reservation.business_id,
              service_id: reservation.service_id,
              start_time: reservation.start_time,
              end_time: reservation.end_time,
              status: reservation.status,
              payment_status: reservation.payment_status,
              business_name: reservation.businesses?.name || "Negocio",
              service_name: reservation.services?.name || "Servicio",
              service_price: reservation.services?.price || 0,
              service_duration: reservation.services?.duration || 0,
              has_review: !!reviewData,
            }
          }),
        )

        setReservations(reservationsWithReviewStatus)
        filterReservations(reservationsWithReviewStatus, activeTab)
      } catch (error) {
        console.error("Error fetching reservations:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar tus reservas",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchReservations()
  }, [user, toast])

  // Filtrar reservas según la pestaña activa
  const filterReservations = (reservations: Reservation[], tab: string) => {
    const now = new Date()

    switch (tab) {
      case "upcoming":
        setFilteredReservations(
          reservations.filter(
            (res) => (res.status === "confirmed" || res.status === "pending") && isAfter(parseISO(res.start_time), now),
          ),
        )
        break
      case "past":
        setFilteredReservations(
          reservations.filter(
            (res) =>
              res.status === "completed" || (res.status !== "cancelled" && !isAfter(parseISO(res.start_time), now)),
          ),
        )
        break
      case "cancelled":
        setFilteredReservations(reservations.filter((res) => res.status === "cancelled"))
        break
      default:
        setFilteredReservations(reservations)
    }
  }

  // Cambiar de pestaña
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    filterReservations(reservations, tab)
  }

  // Cancelar reserva
  const handleCancelReservation = async () => {
    if (!selectedReservation) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from("reservations")
        .update({ status: "cancelled" })
        .eq("id", selectedReservation.id)

      if (error) throw error

      toast({
        title: "Reserva cancelada",
        description: "Tu reserva ha sido cancelada exitosamente",
      })

      // Actualizar la lista de reservas
      const updatedReservations = reservations.map((res) =>
        res.id === selectedReservation.id ? { ...res, status: "cancelled" } : res,
      )

      setReservations(updatedReservations)
      filterReservations(updatedReservations, activeTab)
      setIsCancelDialogOpen(false)
    } catch (error) {
      console.error("Error cancelling reservation:", error)
      toast({
        title: "Error",
        description: "No se pudo cancelar la reserva",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Enviar reseña
  const handleSubmitReview = async () => {
    if (!selectedReservation || !user) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from("reviews").insert([
        {
          user_id: user.id,
          business_id: selectedReservation.business_id,
          reservation_id: selectedReservation.id,
          rating: reviewRating,
          comment: reviewComment,
        },
      ])

      if (error) throw error

      toast({
        title: "Reseña enviada",
        description: "Gracias por compartir tu experiencia",
      })

      // Actualizar la lista de reservas
      const updatedReservations = reservations.map((res) =>
        res.id === selectedReservation.id ? { ...res, has_review: true } : res,
      )

      setReservations(updatedReservations)
      filterReservations(updatedReservations, activeTab)
      setIsReviewDialogOpen(false)
    } catch (error) {
      console.error("Error submitting review:", error)
      toast({
        title: "Error",
        description: "No se pudo enviar la reseña",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Formatear fecha y hora
  const formatDateTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), "PPp", { locale: es })
    } catch (error) {
      return dateString
    }
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
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
    }
  }

  // Renderizar estrellas para la calificación
  const renderStars = (rating: number, interactive = false) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} ${interactive ? "cursor-pointer" : ""}`}
          onClick={interactive ? () => setReviewRating(i + 1) : undefined}
        />
      ))
  }

  return (
    <RouteGuard requiredRole="client" redirectTo="/client/login">
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Mis Reservas</h1>

        <Tabs defaultValue="upcoming" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="upcoming">Próximas</TabsTrigger>
            <TabsTrigger value="past">Pasadas</TabsTrigger>
            <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            <Card>
              <CardHeader>
                <CardTitle>Próximas Reservas</CardTitle>
                <CardDescription>Reservas confirmadas y pendientes</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                    <span>Cargando reservas...</span>
                  </div>
                ) : filteredReservations.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No tienes reservas próximas</h3>
                    <p className="text-muted-foreground mb-6">Explora negocios y agenda tu próxima cita</p>
                    <Button asChild>
                      <Link href="/businesses">Explorar negocios</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredReservations.map((reservation) => (
                      <div key={reservation.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium">{reservation.service_name}</h3>
                            <p className="text-sm text-muted-foreground">{reservation.business_name}</p>
                          </div>
                          <div className="flex items-center">
                            {getStatusIcon(reservation.status)}
                            <span className="ml-1 text-sm font-medium">{getStatusText(reservation.status)}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-3">
                          <div className="flex items-start">
                            <Calendar className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground">Fecha y hora:</p>
                              <p>{formatDateTime(reservation.start_time)}</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Clock className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground">Duración:</p>
                              <p>{reservation.service_duration} minutos</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground">Negocio:</p>
                              <p>{reservation.business_name}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Precio:</p>
                            <p className="font-medium">${reservation.service_price.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              setSelectedReservation(reservation)
                              setIsCancelDialogOpen(true)
                            }}
                          >
                            Cancelar reserva
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="past">
            <Card>
              <CardHeader>
                <CardTitle>Reservas Pasadas</CardTitle>
                <CardDescription>Historial de tus reservas completadas</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                    <span>Cargando reservas...</span>
                  </div>
                ) : filteredReservations.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No tienes reservas pasadas</h3>
                    <p className="text-muted-foreground mb-6">Aquí aparecerán tus reservas completadas</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredReservations.map((reservation) => (
                      <div key={reservation.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium">{reservation.service_name}</h3>
                            <p className="text-sm text-muted-foreground">{reservation.business_name}</p>
                          </div>
                          <div className="flex items-center">
                            {getStatusIcon(reservation.status)}
                            <span className="ml-1 text-sm font-medium">{getStatusText(reservation.status)}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-3">
                          <div className="flex items-start">
                            <Calendar className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground">Fecha y hora:</p>
                              <p>{formatDateTime(reservation.start_time)}</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground">Negocio:</p>
                              <p>{reservation.business_name}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          {!reservation.has_review && reservation.status === "completed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedReservation(reservation)
                                setReviewRating(5)
                                setReviewComment("")
                                setIsReviewDialogOpen(true)
                              }}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Dejar reseña
                            </Button>
                          )}
                          {reservation.has_review && (
                            <Button variant="outline" size="sm" disabled>
                              <Star className="h-4 w-4 mr-2 fill-yellow-400 text-yellow-400" />
                              Reseña enviada
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cancelled">
            <Card>
              <CardHeader>
                <CardTitle>Reservas Canceladas</CardTitle>
                <CardDescription>Reservas que han sido canceladas</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                    <span>Cargando reservas...</span>
                  </div>
                ) : filteredReservations.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No tienes reservas canceladas</h3>
                    <p className="text-muted-foreground mb-6">Aquí aparecerán tus reservas canceladas</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredReservations.map((reservation) => (
                      <div key={reservation.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium">{reservation.service_name}</h3>
                            <p className="text-sm text-muted-foreground">{reservation.business_name}</p>
                          </div>
                          <div className="flex items-center">
                            {getStatusIcon(reservation.status)}
                            <span className="ml-1 text-sm font-medium">{getStatusText(reservation.status)}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-3">
                          <div className="flex items-start">
                            <Calendar className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground">Fecha y hora:</p>
                              <p>{formatDateTime(reservation.start_time)}</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground">Negocio:</p>
                              <p>{reservation.business_name}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/businesses/${reservation.business_id}`}>Reservar de nuevo</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Diálogo de confirmación de cancelación */}
        <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar reserva</DialogTitle>
              <DialogDescription>¿Estás seguro de que deseas cancelar esta reserva?</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {selectedReservation && (
                <div className="space-y-2">
                  <p>
                    <strong>Servicio:</strong> {selectedReservation.service_name}
                  </p>
                  <p>
                    <strong>Negocio:</strong> {selectedReservation.business_name}
                  </p>
                  <p>
                    <strong>Fecha y hora:</strong> {formatDateTime(selectedReservation.start_time)}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
                Volver
              </Button>
              <Button variant="destructive" onClick={handleCancelReservation} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  "Confirmar cancelación"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo para dejar reseña */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dejar reseña</DialogTitle>
              <DialogDescription>Comparte tu experiencia con este negocio</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {selectedReservation && (
                <div className="space-y-2">
                  <p>
                    <strong>Negocio:</strong> {selectedReservation.business_name}
                  </p>
                  <p>
                    <strong>Servicio:</strong> {selectedReservation.service_name}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Calificación</label>
                <div className="flex space-x-1">{renderStars(reviewRating, true)}</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Comentario (opcional)</label>
                <Textarea
                  placeholder="Comparte tu experiencia con este servicio..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmitReview} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar reseña"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RouteGuard>
  )
}

