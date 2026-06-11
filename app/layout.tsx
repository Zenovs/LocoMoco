import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import { ThemeWatcher } from "@/components/ThemeContext";
import { defaultTheme } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Loco Moco",
  description: "MOCO-Analytics-Dashboard",
};

// Pro Request rendern, damit LOCO_THEME (z. B. auf dem Server) zur Laufzeit
// gelesen wird statt beim Build statisch eingefroren zu werden.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // SSR-Default (z. B. auf dem Server via LOCO_THEME=pro); Client kann via
  // ThemeProvider auf das gespeicherte Theme wechseln.
  const theme = defaultTheme();
  return (
    <html lang="de" className="h-full" data-theme={theme}>
      <body className="min-h-full">
        <ThemeProvider />
        <ThemeWatcher>{children}</ThemeWatcher>
      </body>
    </html>
  );
}
