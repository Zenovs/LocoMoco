import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loco Moco ✨",
  description: "Dein verspieltes MOCO-Analytics-Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
