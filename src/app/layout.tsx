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

  // Verifica se estamos na rota de login
  const isLoginPage = pathname === "/login";

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div style={{ display: "flex" }}>
          {/* Renderiza o Sidebar apenas se não estiver na rota de login */}
          {!isLoginPage && <Sidebar />}
          <main style={{ marginLeft: isLoginPage ? "0" : "200px", padding: "20px", width: "100%" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
