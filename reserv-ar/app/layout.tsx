import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth"
import { ToastProvider } from "@/components/ui/toaster"
import Header from "@/components/header"
import Footer from "@/components/footer"
import DebugAuth from "@/components/debug-auth"
import ManualAuth from "@/components/manual-auth"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "reserv-ar | Sistema de Reservas SaaS",
  description: "Plataforma integral para la gestión de reservas en diversos negocios",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="light">
            <ToastProvider>
              <Header />
              <main>{children}</main>
              <Footer />
              <DebugAuth />
              <ManualAuth />
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

