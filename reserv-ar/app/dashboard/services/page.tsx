"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { PlusCircle, Edit, Trash2, Package, Loader2 } from "lucide-react"
import RouteGuard from "@/components/route-guard"
import { fetchBusinessIdByOwnerId, DEMO_BUSINESS_ID } from "@/lib/services/dashboard-service"

type Service = {
  id: string
  business_id: string
  name: string
  description: string
  duration: number
  price: number
  created_at: string
}

export default function ServicesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [duration, setDuration] = useState("")
  const [price, setPrice] = useState("")

  useEffect(() => {
    if (user) {
      fetchBusinessId()
    }
  }, [user])

  useEffect(() => {
    if (businessId) {
      fetchServices()
    }
  }, [businessId])

  const fetchBusinessId = async () => {
    try {
      const id = await fetchBusinessIdByOwnerId(user?.id || "")

      if (id) {
        setBusinessId(id)
        if (id === DEMO_BUSINESS_ID) {
          setIsDemoMode(true)
          toast({
            title: "Modo demostración",
            description: "No se encontró un negocio asociado a tu cuenta. Se están mostrando datos de ejemplo.",
          })
        }
      } else {
        setBusinessId(DEMO_BUSINESS_ID)
        setIsDemoMode(true)
      }
    } catch (error) {
      console.error("Error fetching business ID:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar la información del negocio",
        variant: "destructive",
      })
      setBusinessId(DEMO_BUSINESS_ID)
      setIsDemoMode(true)
    }
  }

  const fetchServices = async () => {
    setIsLoading(true)
    try {
      // Si estamos en modo demo, crear servicios de ejemplo
      if (businessId === DEMO_BUSINESS_ID) {
        const demoServices = [
          {
            id: "demo-1",
            business_id: DEMO_BUSINESS_ID,
            name: "Corte de cabello",
            description: "Corte básico para todo tipo de cabello",
            duration: 30,
            price: 20,
            created_at: new Date().toISOString(),
          },
          {
            id: "demo-2",
            business_id: DEMO_BUSINESS_ID,
            name: "Manicura",
            description: "Manicura completa con esmalte",
            duration: 45,
            price: 35,
            created_at: new Date().toISOString(),
          },
        ]
        setServices(demoServices)
        return
      }

      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setServices(data || [])
    } catch (error) {
      console.error("Error fetching services:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los servicios",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (service: Service | null = null) => {
    if (service) {
      setEditingService(service)
      setName(service.name)
      setDescription(service.description)
      setDuration(service.duration.toString())
      setPrice(service.price.toString())
    } else {
      setEditingService(null)
      setName("")
      setDescription("")
      setDuration("")
      setPrice("")
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingService(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (isDemoMode) {
        // En modo demo, simular la creación/actualización
        if (editingService) {
          // Actualizar servicio existente en el estado local
          const updatedServices = services.map((s) =>
            s.id === editingService.id
              ? {
                  ...s,
                  name,
                  description,
                  duration: Number.parseInt(duration),
                  price: Number.parseFloat(price),
                }
              : s,
          )
          setServices(updatedServices)
        } else {
          // Crear nuevo servicio en el estado local
          const newService = {
            id: `demo-${Date.now()}`,
            business_id: DEMO_BUSINESS_ID,
            name,
            description,
            duration: Number.parseInt(duration),
            price: Number.parseFloat(price),
            created_at: new Date().toISOString(),
          }
          setServices([newService, ...services])
        }

        toast({
          title: editingService ? "Servicio actualizado" : "Servicio creado",
          description: `El servicio ha sido ${editingService ? "actualizado" : "creado"} correctamente (modo demo)`,
        })
      } else {
        if (editingService) {
          // Update existing service
          const { error } = await supabase
            .from("services")
            .update({
              name,
              description,
              duration: Number.parseInt(duration),
              price: Number.parseFloat(price),
              updated_at: new Date().toISOString(),
            })
            .eq("id", editingService.id)

          if (error) throw error

          toast({
            title: "Servicio actualizado",
            description: "El servicio ha sido actualizado correctamente",
          })
        } else {
          // Create new service
          const { error } = await supabase.from("services").insert([
            {
              business_id: businessId,
              name,
              description,
              duration: Number.parseInt(duration),
              price: Number.parseFloat(price),
            },
          ])

          if (error) throw error

          toast({
            title: "Servicio creado",
            description: "El servicio ha sido creado correctamente",
          })
        }
      }

      handleCloseDialog()
      fetchServices()
    } catch (error) {
      console.error("Error saving service:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar el servicio",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este servicio?")) {
      return
    }

    setIsLoading(true)
    try {
      if (isDemoMode) {
        // En modo demo, eliminar del estado local
        setServices(services.filter((s) => s.id !== id))
        toast({
          title: "Servicio eliminado",
          description: "El servicio ha sido eliminado correctamente (modo demo)",
        })
      } else {
        const { error } = await supabase.from("services").delete().eq("id", id)

        if (error) throw error

        toast({
          title: "Servicio eliminado",
          description: "El servicio ha sido eliminado correctamente",
        })

        fetchServices()
      }
    } catch (error) {
      console.error("Error deleting service:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el servicio",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <RouteGuard>
      <div className="container py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Servicios</h1>
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Nuevo Servicio
          </Button>
        </div>

        {isLoading && services.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                <p>Cargando servicios...</p>
              </div>
            </CardContent>
          </Card>
        ) : services.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col justify-center items-center h-60 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay servicios registrados</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Los servicios son la base de tu negocio. Crea servicios para que tus clientes puedan reservarlos.
                </p>
                <Button onClick={() => handleOpenDialog()}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Crear primer servicio
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card key={service.id}>
                <CardHeader>
                  <CardTitle>{service.name}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Duración</p>
                      <p>{service.duration} minutos</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Precio</p>
                      <p className="font-bold">${service.price.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleOpenDialog(service)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-red-500"
                    onClick={() => handleDelete(service.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingService ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
              <DialogDescription>
                {editingService
                  ? "Actualiza la información del servicio"
                  : "Completa la información para crear un nuevo servicio"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del servicio</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duración (minutos)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Precio ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingService ? "Actualizando..." : "Creando..."}
                    </>
                  ) : editingService ? (
                    "Actualizar"
                  ) : (
                    "Crear"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </RouteGuard>
  )
}

