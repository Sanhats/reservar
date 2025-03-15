"use client"

import type React from "react"
import RoleRouter from "./role-router"

type RouteGuardProps = {
  children: React.ReactNode
  requiredRole?: "client" | "business"
  redirectTo?: string
}

export default function RouteGuard({ children, requiredRole, redirectTo = "/login" }: RouteGuardProps) {
  return (
    <RoleRouter requiredRole={requiredRole} redirectTo={redirectTo}>
      {children}
    </RoleRouter>
  )
}

