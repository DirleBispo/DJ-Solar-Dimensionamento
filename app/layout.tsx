import type { Metadata } from "next";
import "./globals.css";
import "./logo-overrides.css";

export const metadata: Metadata = {
  title: "DJ Solar | Dimensionamento Fotovoltaico",
  description: "Plataforma de dimensionamento preliminar de sistemas fotovoltaicos.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
