import type { Metadata, Viewport } from "next";
import "./globals.css";
import { temaAtual } from "@/lib/filtro";

export const metadata: Metadata = {
  title: { default: "Central de Diligenciamento · JOPE", template: "%s · Central de Diligenciamento" },
  description: "Licenciamento, parcelamento do solo, ambiental e baixa de construção — INOVA BH e SAÚDE BH.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/jope-logo.png" },
};

export const viewport: Viewport = { themeColor: "#6F3B8C" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tema = await temaAtual();
  return (
    <html lang="pt-BR" data-theme={tema}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
