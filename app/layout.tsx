import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-serif", style: ["normal", "italic"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://8888tracker.com"),
  title: {
    default: "8888 Tracker",
    template: "%s | 8888 Tracker"
  },
  description: "8888 Tracker - Where Prosperity will Find you.",
  applicationName: "8888 Tracker",
  openGraph: {
    title: "8888 Tracker",
    description: "Where Prosperity will Find you.",
    siteName: "8888 Tracker",
    type: "website"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f8fbff"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${newsreader.variable} ${inter.className}`}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
