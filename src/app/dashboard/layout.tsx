"use client";
import { useEffect, useRef, useState } from "react";
import { useDeviceStore } from "@/store/deviceStore";
import { AppSidebar } from "@/components/app-sidebar";
import FCMHandler from "@/components/FCMHandler";
import { Navbar } from "@/components/navbar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNavigationStore } from "@/store/navigationStore";
import Cookies from "js-cookie";
import { usePathname } from "next/navigation";
import { redirect } from "next/navigation";
import { useRouter } from "next/navigation";
import { AiChatBot } from "@/components/dashboard/AiChatBot";
import { ActiveStatusChecker } from "@/components/ActiveStatusChecker";

import { getSectionFromPath } from "@/util/navigationAccess";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const activeSection = useNavigationStore((state) => state.activeSection);
  const setActiveSection = useNavigationStore((state) => state.setActiveSection);
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const currentSection =
    mounted && activeSection && activeSection !== "Dashboard"
      ? activeSection
      : getSectionFromPath(pathname);

  const SHOW_SIDEBAR_SECTIONS = [
    "Master",
    "School",
    "Reports",
    "Support",
  ];
  const router = useRouter();

  const store = useDeviceStore();
  const isDashboard = pathname === "/dashboard";
  const hasConnected = useRef(false);

  useEffect(() => {
    const detected = getSectionFromPath(pathname);
    if (detected && detected !== "Dashboard") {
      setActiveSection(detected);
    }
  }, [pathname, setActiveSection]);

  useEffect(() => {
    if (!store.isConnected) return;

    if (isDashboard) {
      // console.log("[Dashboard] Subscribing to all device data");
      // console.log("[Dashboard] Connection Status: ", store.streamingMode);
      store.switchToAllDevices(); // emit / subscribe
    } else {
      // console.log("[Dashboard] Unsubscribing from all device data");
      store.stopAllDeviceData(); // stop emits / listeners
    }
  }, [isDashboard, store.isConnected]);

  // Strip .txt suffix from URL if present (static export generates .txt RSC files,
  // which browsers display as raw text when accessed directly)
  if (typeof window !== "undefined" && window.location.pathname.endsWith(".txt")) {
    const cleanPath = window.location.pathname.replace(/\.txt$/, "");
    window.location.replace(cleanPath + window.location.search + window.location.hash);
  }

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      redirect("/login");
    }
    if (!hasConnected.current && !store.isConnected) {
      hasConnected.current = true;
      console.log("[Socket] Connecting once on app load");
      store.connect();
    }
  }, []);
  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider defaultOpen={true}>
        {SHOW_SIDEBAR_SECTIONS.includes(currentSection) && <AppSidebar />}
        <SidebarInset className="overflow-hidden flex flex-col h-screen">
          <header className="sticky top-0 z-20 flex h-14 md:h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear overflow-hidden bg-background border-b">
            <div className="flex items-center gap-2 px-2 md:px-4 min-w-0 relative z-20">
              {SHOW_SIDEBAR_SECTIONS.includes(currentSection) && (
                <>
                  <SidebarTrigger className="-ml-1 flex-shrink-0 cursor-pointer" />
                  <Separator
                    orientation="vertical"
                    className="mr-2 data-[orientation=vertical]:h-4 flex-shrink-0"
                  />
                </>
              )}

              <div className="min-w-0 flex-1">
                <Breadcrumb />
              </div>
            </div>
            <div className="absolute inset-0 z-10">
              <Navbar />
            </div>
          </header>

          <main className="pt-2 md:pt-4 px-2 md:px-4 pb-2 md:pb-3 overflow-auto flex-1 min-h-0 flex flex-col">
            <FCMHandler />
            <ActiveStatusChecker />
            {children}
            <AiChatBot />
          </main>

        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
