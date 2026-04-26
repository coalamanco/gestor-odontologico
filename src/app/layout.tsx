import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "../components/AppShell"; // 🔥 CORREÇÃO AQUI

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gestor Odontológico",
  description: "Sistema de gestão odontológica",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Gestor Odonto",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#239d9a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-slate-50`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}