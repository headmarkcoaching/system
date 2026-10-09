import type { Metadata, Viewport } from "next";
import { Inter, Lexend } from "next/font/google";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { PwaRegister } from "@/components/shared/pwa-register";
import "./globals.css";

// Inter carries every dense, small-size UI surface (tables, forms, badges) — it's the safest,
// most road-tested choice for that job. Lexend is reserved for headings and big numbers only:
// it was designed around reading-proficiency research, which is a real, subject-appropriate
// reason to reach for it on an academy app rather than defaulting to "Inter everywhere."
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const lexend = Lexend({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Head Mark Coaching",
    template: "%s | Head Mark Coaching",
  },
  description: "Live group classes, student accountability, and parent visibility for Class 8 through 2nd Year.",
  openGraph: {
    siteName: "Head Mark Coaching",
    type: "website",
    locale: "en_PK",
  },
  twitter: {
    card: "summary",
  },
  appleWebApp: {
    capable: true,
    title: "Head Mark",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2861bd",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(inter.variable, lexend.variable)}>
      <body>
        {children}
        <Toaster richColors position="top-center" />
        <PwaRegister />
      </body>
    </html>
  );
}
