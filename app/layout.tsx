import type { Metadata } from "next";
import "./globals.css";
import "./logo-overrides.css";
import "./client-address-overrides.css";

export const metadata: Metadata = {
  title: "DJ Solar | Dimensionamento Fotovoltaico",
  description: "Plataforma profissional de dimensionamento e projeto fotovoltaico da DJ Solar Engenharia.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
