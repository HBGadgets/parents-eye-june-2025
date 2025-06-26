import { AppSidebar } from "@/components/app-sidebar";
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
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 overflow-hidden relative">
          <div className="flex items-center gap-2 px-4 min-w-0 flex-1 relative z-10">
            <SidebarTrigger className="-ml-1 flex-shrink-0" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4 flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <Breadcrumb />
            </div>
          </div>
          <div className="absolute inset-0 pointer-events-none">
            <Navbar />
          </div>
        </header>
        <main className="pt-4 px-4 overflow-hidden flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
