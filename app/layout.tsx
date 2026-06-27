import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
