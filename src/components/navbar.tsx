"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useNavigationStore } from "@/store/navigationStore";
import { useSidebar } from "@/components/ui/sidebar";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { useNotificationStore } from "@/store/notificationStore";
import { NotificationSheet } from "./NotificationDropdown";
import { Menu, X, Sparkles } from "lucide-react";
import { useAiChatBotStore } from "@/store/aiChatBotStore";
import { FrameSequencePlayer } from "@/components/ui/FrameSequencePlayer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const SHOW_SIDEBAR_SECTIONS = [
  "Master",
  "School",
  "Users",
  "Reports",
  "Support",
];

export function Navbar() {
  const pathname = usePathname();
  const activeSection = useNavigationStore((state) => state.activeSection);
  const setActiveSection = useNavigationStore(
    (state) => state.setActiveSection
  );
  const { setOpen, setOpenMobile, isMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { notifications } = useNotificationStore();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { isOpen: isAiChatBotOpen, toggleOpen: toggleAiChatBot } =
    useAiChatBotStore();

  const navigationMap: Record<string, string> = {
    Dashboard: "/dashboard",
    "Incident Management": "/dashboard/incident-management",
    Maintenance: `${process.env.NEXT_PUBLIC_MAINTENANCE_URL}`,
    "Basic Maintenance": "/dashboard/basic-maintenance",
    Geofence: "/dashboard/school/geofence",
    Notifications: "/dashboard/users/notification",
  };

  const navSections = [
    "Dashboard",
    "Master",
    "School",
    "Users",
    "Reports",
    "Incident Management",
    "Maintenance",
    // "Basic Maintenance",
    "Support",
  ];

  React.useEffect(() => {
    if (pathname === "/dashboard/basic-maintenance") {
      setActiveSection("Basic Maintenance");
    } else if (pathname === "/dashboard/incident-management") {
      setActiveSection("Incident Management");
    } else if (pathname === "/dashboard") {
      setActiveSection("Dashboard");
    }
  }, [pathname, setActiveSection]);

  const handleNavClick = React.useCallback(
    (section: string) => {
      setMobileMenuOpen(false);
      if (
        section === "Dashboard" ||
        section === "Incident Management" ||
        section === "Basic Maintenance"
      ) {
        setActiveSection(section);
        setOpenMobile(false);
        setOpen(false);
      } else if (section === "Maintenance") {
        setActiveSection(section);
        setOpenMobile(false);
        setOpen(false);
      } else {
        setActiveSection(section);
        if (isMobile) {
          setOpenMobile(true);
        } else {
          setOpen(true);
        }
      }
    },
    [setActiveSection, setOpen, setOpenMobile, isMobile]
  );

  return (
    <div className="w-full h-14 md:h-16 flex items-center justify-between relative px-2 sm:px-4 bg-primary border-b border-yellow-600/20">
      {/* Left: Mobile Menu Button & Collapsed Logo */}
      <div className="flex items-center gap-2 z-[9999]">
        {/* Mobile Menu Button - visible only on small screens */}
        <div className="md:hidden flex items-center">
          <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 rounded-md hover:bg-yellow-500/20 transition-colors cursor-pointer"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5 text-yellow-900" />
                ) : (
                  <Menu className="h-5 w-5 text-yellow-900" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-48 bg-primary border-yellow-600/20"
            >
              {navSections.map((section) => (
                <DropdownMenuItem
                  key={section}
                  className="cursor-pointer font-semibold text-yellow-900 hover:bg-yellow-500/20 focus:bg-yellow-500/20"
                  asChild
                >
                  <Link
                    href={navigationMap[section] || "#"}
                    onClick={() => handleNavClick(section)}
                  >
                    {section}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Logo - visible when sidebar is collapsed */}
        {isCollapsed && (
          <div
            className={`flex items-center animate-in fade-in duration-200 ${SHOW_SIDEBAR_SECTIONS.includes(activeSection)
                ? "ml-10 sm:ml-12 md:ml-14"
                : "ml-0 sm:ml-1"
              }`}
          >
            <Link
              href="/dashboard"
              onClick={() => handleNavClick("Dashboard")}
              className="flex items-center"
            >
              <Image
                width={180}
                height={70}
                src="/logo.svg"
                alt="Logo"
                priority
                className="h-12 sm:h-13 md:h-14 w-auto object-contain cursor-pointer -translate-y-1 md:-translate-y-1.5"
              />
            </Link>
          </div>
        )}
      </div>

      {/* Desktop nav links - absolutely centered horizontally and vertically */}
      <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center z-[9999] max-w-[calc(100%-160px)]">
        <NavigationMenu className="max-w-full">
          <NavigationMenuList className="flex-nowrap justify-center gap-0.5 sm:gap-1 xl:gap-1.5">
            {navSections.map((section) => {
              const isActive =
                activeSection === section ||
                (section === "Basic Maintenance" &&
                  pathname === "/dashboard/basic-maintenance") ||
                (section === "Incident Management" &&
                  pathname.startsWith("/dashboard/incident-management")) ||
                (section === "Dashboard" && pathname === "/dashboard");
              return (
                <NavigationMenuItem key={section}>
                  <NavigationMenuLink
                    asChild
                    className={cn(
                      "text-xs xl:text-sm px-1.5 sm:px-2 xl:px-2.5 py-1 xl:py-1.5 whitespace-nowrap font-semibold hover:font-bold transition-colors duration-200 focus:font-bold rounded-md",
                      isActive
                        ? "bg-yellow-500/30 text-yellow-950 font-bold"
                        : "hover:bg-yellow-500/20 text-yellow-900"
                    )}
                  >
                    <Link
                      href={navigationMap[section] || "#"}
                      onClick={() => handleNavClick(section)}
                    >
                      {section === "Incident Management" ? (
                        <>
                          <span className="hidden xl:inline">Incident Management</span>
                          <span className="xl:hidden">Incident</span>
                        </>
                      ) : section === "Basic Maintenance" ? (
                        <>
                          <span className="hidden xl:inline">Basic Maintenance</span>
                          <span className="xl:hidden">Basic Maint.</span>
                        </>
                      ) : (
                        section
                      )}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              );
            })}
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* Right: AI Chatbot, NotificationSheet, Profile dropdown */}
      <div className="flex items-center gap-2 sm:gap-3.5 ml-auto z-[9999]">
        {/* AI Chatbot Button */}
        <button
          type="button"
          onClick={toggleAiChatBot}
          className={cn(
            "relative w-9 h-9 sm:w-10 sm:h-10 rounded-full p-0 transition-all duration-300 cursor-pointer flex items-center justify-center bg-transparent shrink-0 hover:scale-110",
            isAiChatBotOpen && "scale-105 filter drop-shadow-[0_0_8px_rgba(217,119,6,0.7)]"
          )}
          title="parentseye.ai Assistant"
          aria-label="Toggle parentseye.ai Assistant"
        >
          <FrameSequencePlayer
            frameCount={60}
            framePrefix="/background-remover/"
            fps={35}
            mode="pingpong"
            paddingRatio={0.98}
            className="w-full h-full object-contain pointer-events-none"
          />
        </button>

        <NotificationSheet />
        <ProfileDropdown />
      </div>
    </div>
  );
}

