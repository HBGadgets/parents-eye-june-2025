"use client";

import * as React from "react";
import Cookies from "js-cookie";
import { getDecodedToken } from "@/lib/jwt";
import { useNavigationStore } from "@/store/navigationStore";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { useRouter, usePathname } from "next/navigation";
import RouteLoader from "@/components/RouteLoader";
import { useTransition } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  FileText,
  Search,
  School,
  MapPin,
  UserCheck,
  UserX,
  FileBarChart,
  Route,
  Clock,
  TrendingUp,
  Map,
  AlertCircle,
  Settings,
  Smartphone,
  Bell,
  CheckCircle,
  XCircle,
  MessageCircle,
  Ticket,
  BarChart3,
  ShieldAlert,
  Radio,
} from "lucide-react";
import { GiGps } from "react-icons/gi";
import Image from "next/image";
import Model from "@/app/dashboard/master/model/page";

import { useAuthStore } from "@/store/authStore";
import { UserRole, getAccessibleSidebarItems, getSectionFromPath } from "@/util/navigationAccess";


// Icon mapping for menu items
const iconMap: Record<string, React.ElementType> = {
  "Student Details": GraduationCap,
  Geofence: MapPin,
  "Pickup And Drop": Route,
  Routes: Route,
  "Route Roster": Route,
  "School Roster": Route,
  Absent: UserX,
  Present: UserCheck,
  "Leave Request": FileText,
  Status: AlertCircle,
  "Approved Request": CheckCircle,
  "Denied Request": XCircle,
  "School Master": School,
  "Branch Master": School,
  "Parents Master": Users,
  "Driver Approve": UserCheck,
  "Student Approve": UserCheck,
  "Supervisor Approve": UserCheck,
  "Device": Smartphone,
  "Read Device": Smartphone,
  Devices: Smartphone,
  "CRTag": Radio,
  "User Access": Settings,
  "Branch Group": Settings,
  Notification: Bell,
  "Status Report": FileBarChart,
  "Distance Report": Route,
  "History Report": Clock,
  "Stop Report": AlertCircle,
  "Stoppage Summary": AlertCircle,
  "Travel Summary": TrendingUp,
  "Trip Report": Route,
  "Idle Report": Clock,
  "Alerts/Events": Bell,
  "Geofence Report": Map,
  "Route Report": Route,
  "Chat Box": MessageCircle,
  Model: GiGps,
  Category: FileText,
  "Ticket Types": Ticket,
  "Send Broadcast": Bell,
  "Analytics Report": BarChart3,
  "Incident Management": ShieldAlert,
  "e-Police Report": ShieldAlert,
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { access, fullAccess, role: authRole } = useAuthStore();
  const activeSection = useNavigationStore((state) => state.activeSection);

  const [userRole, setUserRole] = React.useState<UserRole>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");

  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { setOpenMobile, isMobile, state } = useSidebar();

  React.useEffect(() => {
    const token = Cookies.get("token");
    const decoded = token ? getDecodedToken(token) : null;
    const role = authRole || decoded?.role;

    if (
      typeof role === "string" &&
      ["superAdmin", "school", "branchGroup", "branch"].includes(role)
    ) {
      setUserRole(role as UserRole);
    }

    setIsLoading(false);
  }, [authRole]);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const currentSection =
    mounted && activeSection && activeSection !== "Dashboard"
      ? activeSection
      : getSectionFromPath(pathname);

  const sidebarData = React.useMemo(() => {
    if (!currentSection || !userRole) return [];
    return getAccessibleSidebarItems(currentSection, userRole, access, fullAccess);
  }, [currentSection, userRole, access, fullAccess]);


  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return sidebarData;
    return sidebarData.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sidebarData, searchQuery]);

  React.useEffect(() => {
    if (!sidebarData || sidebarData.length === 0) return;
    sidebarData.forEach((item) => {
      router.prefetch(item.url);
    });
  }, [sidebarData, router]);

  const handleItemSelect = React.useCallback(
    (url: string) => {
      startTransition(() => {
        router.push(url);
        if (isMobile) {
          setOpenMobile(false);
        }
      });
    },
    [router, isMobile, setOpenMobile]
  );

  const isCollapsed = state === "collapsed";

  return (
    <>
      {isPending && <RouteLoader />}

      <Sidebar
        collapsible="icon"
        {...props}
        className="border-r border-yellow-600/20 transition-all duration-300 ease-in-out"
        style={{ backgroundColor: "#ffdc00" }}
      >
        {/* Header with Search - Fixed Height */}
        <SidebarHeader className="border-b border-yellow-600/20 bg-primary h-[60px] flex items-center justify-center transition-all duration-300 ease-in-out">
          {isLoading ? (
            <div className={isCollapsed ? "w-auto" : "w-full px-3"}>
              <Skeleton
                className={`rounded-md bg-yellow-300/60 transition-all duration-300 ${isCollapsed ? "h-10 w-10" : "h-9 w-full"
                  }`}
              />
            </div>
          ) : (
            <>
              {/* Expanded Search Bar - Only show when NOT collapsed */}
              {!isCollapsed && (
                <div className="w-full px-3 animate-in fade-in duration-200">
                  <div className="relative">
                    <Image
                      width={150}
                      height={150}
                      src="/logo.svg"
                      alt="Logo"
                      priority
                      className="relative left-10 -top-2.5"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </SidebarHeader>

        {/* Scrollable Content - Animated */}
        <SidebarContent className="bg-primary px-2 py-2 transition-all duration-300 ease-in-out">
          {isLoading || !userRole ? (
            <div className="flex flex-col gap-2 p-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-10 w-full rounded bg-yellow-300/60 transition-all duration-300"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          ) : sidebarData.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-yellow-800/70 font-medium group-data-[collapsible=icon]:hidden">
              No accessible modules
            </div>
          ) : (
            <SidebarGroup className="p-0">
              {/* Group Label with Fade Animation */}
              <SidebarGroupLabel className="px-2 py-2 text-xs font-bold uppercase tracking-wider text-yellow-900 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:scale-90 group-data-[collapsible=icon]:h-0 group-data-[collapsible=icon]:py-0 transition-all duration-300 ease-out overflow-hidden">
                {currentSection || "Menu"}
              </SidebarGroupLabel>

              <SidebarSeparator className="bg-yellow-600/20 my-1 group-data-[collapsible=icon]:opacity-0 transition-all duration-200" />

              <SidebarGroupContent className="mt-4">
                <SidebarMenu className="gap-0.5">
                  {filteredData.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-yellow-800/60 group-data-[collapsible=icon]:hidden transition-all duration-300">
                      No results
                    </div>
                  ) : (
                    filteredData.map((item, index) => {
                      const Icon = iconMap[item.title] || FileText;
                      const isActive = pathname === item.url;

                      return (
                        <SidebarMenuItem
                          key={item.title}
                          className="animate-in fade-in slide-in-from-left-2 fill-mode-both"
                          style={{
                            animationDelay: `${index * 30}ms`,
                            animationDuration: "300ms",
                          }}
                        >
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={item.title}
                            className={`
                              group/button relative transition-all duration-200
                              ${isActive
                                ? "bg-yellow-600 text-white font-semibold shadow-sm hover:bg-yellow-700"
                                : "text-yellow-900 hover:bg-yellow-500/30 hover:text-yellow-950 font-medium"
                              }
                              rounded-lg h-11
                              group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11
                              group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mb-2
                            `}
                          >
                            <Link
                              href={item.url}
                              onClick={(e) => {
                                e.preventDefault();
                                handleItemSelect(item.url);
                              }}
                              className="flex items-center gap-3 w-full px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 transition-all duration-200"
                            >
                              {/* Icon with rotate animation on collapse */}
                              <Icon
                                className={`
                                  h-7 w-7 flex-shrink-0 transition-all duration-300
                                  group-hover/button:scale-110 group-hover/button:rotate-3
                                  group-data-[collapsible=icon]:rotate-0 group-data-[collapsible=icon]:scale-150
                                  text-yellow-700
                                `}
                              />
                              {/* Text with slide and fade animation */}
                              <span className="flex-1 truncate text-sm transition-all duration-300 ease-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:translate-x-2 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:hidden">
                                {item.title}
                              </span>
                              {/* Active indicator with pulse */}
                              {isActive && (
                                <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-1 group-data-[collapsible=icon]:right-1 group-data-[collapsible=icon]:h-2 group-data-[collapsible=icon]:w-2 transition-all duration-200" />
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        {/* Animated Rail */}
        <SidebarRail className="bg-yellow-600/40 hover:bg-yellow-600/60 transition-all duration-300 ease-in-out hover:w-2" />
      </Sidebar>
    </>
  );
}
