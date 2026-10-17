import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider }  from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

// No weight arrays — Turbopack requires single-entry variable font calls
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dmsans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ghana House Agent — Homes for rent & sale across Ghana",
  description:
    "Discover houses, apartments and rooms for rent or sale anywhere in Ghana. Walk through homes in 3D, meet verified agents, and book a viewing in seconds.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ghana House Agent",
  },
  formatDetection: { telephone: true },
  openGraph: {
    title: "Ghana House Agent",
    description: "Find houses for rent and sale across all 16 regions of Ghana",
    type: "website",
    locale: "en_GH",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0c3b2e",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>

      {/*
        Font variables on <body> as well as <html> so the Capacitor
        WebView always has them in scope even before full CSS hydration.
        This is what makes the "Ghana House Agent" inline-style fallback
        (fontFamily: "var(--font-fraunces, Georgia, serif)") work on Android.
      */}
      <body
        className={`${display.variable} ${sans.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}