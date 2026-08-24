"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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
import { Menu, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SHOW_SIDEBAR_SECTIONS = [
  "Master",
  "School",
  "Users",
  "Reports",
  "Support",
];

export function Navbar() {
  const activeSection = useNavigationStore((state) => state.activeSection);
  const setActiveSection = useNavigationStore(
    (state) => state.setActiveSection
  );
  const { setOpen, setOpenMobile, isMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { notifications } = useNotificationStore();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navigationMap: Record<string, string> = {
    Dashboard: "/dashboard",
    Maintenance: `${process.env.NEXT_PUBLIC_MAINTENANCE_URL}`,
    Geofence: "/dashboard/school/geofence",
    Notifications: "/dashboard/users/notification",
  };

  const navSections = [
    "Dashboard",
    "Master",
    "School",
    "Users",
    "Reports",
    "Maintenance",
    "Support",
  ];

  const handleNavClick = React.useCallback(
    (section: string) => {
      setMobileMenuOpen(false);
      if (section === "Dashboard") {
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
            className={`flex items-center animate-in fade-in duration-200 ${
              SHOW_SIDEBAR_SECTIONS.includes(activeSection)
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
      <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center z-[9999]">
        <NavigationMenu>
          <NavigationMenuList className="flex-wrap justify-center gap-1 lg:gap-2">
            {navSections.map((section) => (
              <NavigationMenuItem key={section}>
                <NavigationMenuLink
                  asChild
                  className="text-xs lg:text-sm px-2 lg:px-3 py-1.5 lg:py-2 whitespace-nowrap font-semibold hover:font-bold transition-colors duration-200 focus:font-bold hover:bg-yellow-500/20 rounded-md"
                >
                  <Link
                    href={navigationMap[section] || "#"}
                    onClick={() => handleNavClick(section)}
                  >
                    {section}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* Right: Profile dropdown positioned at the right edge */}
      <div className="flex items-center gap-2 sm:gap-4 ml-auto z-[9999]">
        <NotificationSheet />
        <ProfileDropdown />
      </div>
    </div>
  );
}

