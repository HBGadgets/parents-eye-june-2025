"use client";
import { useEffect } from "react";
import Cookies from "js-cookie";
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const token = Cookies.get("token");

    // Auto-connect if user is logged in
    if (token) {
      const connectToDevice = useDeviceStore.getState().connect;
      connectToDevice();
    }

    // Cleanup on app unmount
    return () => {
      const disconnect = useDeviceStore.getState().disconnect;
      disconnect();
    };
  }, []);
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden flex flex-col h-screen">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 overflow-hidden bg-background border-b">
          <div className="flex items-center gap-2 px-4 min-w-0 relative z-20">
            <SidebarTrigger className="-ml-1 flex-shrink-0" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4 flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <Breadcrumb />
            </div>
          </div>
          <div className="absolute inset-0 z-10">
            <Navbar />
          </div>
        </header>

        <main className="pt-4 px-4 overflow-auto flex-1 min-h-0">
          <FCMHandler />
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
