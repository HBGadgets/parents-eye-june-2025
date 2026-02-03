"use client";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { GoogleAnalytics } from "@next/third-parties/google";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";
// import RouteTransitionWrapper from "@/components/RouteTransitionWrapper";
// Fonts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// export const metadata: Metadata = {
//   title: "Parents Eye",
//   description: "School Bus Tracking Solutions",
// };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrateAuth = useAuthStore((s) => s.hydrateAuth);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {/* <RouteTransitionWrapper> */}
          {children}
          {/* </RouteTransitionWrapper> */}
          {/* {children} */}
        </Providers>
        <Toaster position="bottom-right" richColors />
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || ""} />
      </body>
    </html>
  );
}
