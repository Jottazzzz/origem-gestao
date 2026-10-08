import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Origem Gestão",
  description: "Gestão de contratos, leiras e coletas da Origem Compostagem.",
  icons: {
    icon: "/favicon-orange-hd.png",
    shortcut: "/favicon-orange-hd.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
