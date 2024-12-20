"use client";

import type { Metadata } from "next";
import localFont from "next/font/local";
import Sidebar from "@/components/Sidebar";
import { usePathname } from "next/navigation";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  // Verifica se estamos na rota de login ou na página raiz
  const hideSidebar = pathname === "/login" || pathname === "/";

  return (
    <html lang="pt-br">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div style={{ display: "flex" }}>
          {/* Renderiza o Sidebar apenas se não estiver na rota de login */}
          {!hideSidebar && <Sidebar />}
          <main style={{ marginLeft: hideSidebar ? "0" : "200px", padding: "20px", width: "100%" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
