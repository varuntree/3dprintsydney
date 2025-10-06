import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import NextTopLoader from "nextjs-toploader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "3D Print Sydney Console",
  description:
    "Local operations desk for quoting, invoicing, and print queue management.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

/**
 * Root Layout - Simplified
 *
 * Provides only:
 * - HTML structure
 * - Global styles
 * - App-wide providers (theme, toast, etc.)
 *
 * Navigation handled by route group layouts:
 * - (admin)/layout.tsx - Admin portal with AdminNavigation
 * - (client)/layout.tsx - Client portal with ClientNavigation
 * - (public)/layout.tsx - Public pages (login/signup)
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <NextTopLoader
          color="#3b82f6"
          height={3}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #3b82f6,0 0 5px #3b82f6"
          zIndex={9999}
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
