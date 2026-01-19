"use client";

import * as React from "react";
import Link from "next/link";
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

export function Navbar() {
  const setActiveSection = useNavigationStore(
    (state) => state.setActiveSection
  );
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const { notifications } = useNotificationStore();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navigationMap: Record<string, string> = {
    Dashboard: "/dashboard",
    Maintenance: "https://maintenance.credencetracker.com/#/login",
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
    <div className="w-full h-14 md:h-16 flex items-center relative px-2 sm:px-4 bg-primary border-b border-yellow-600/20">
      {/* Mobile Menu Button - visible only on small screens */}
      <div className="md:hidden flex items-center z-[9999]">
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

      {/* Desktop nav links - hidden on mobile */}
      <div className="hidden md:flex flex-1 justify-center items-center relative z-[9999]">
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

      {/* Mobile spacer for centering */}
      <div className="flex-1 md:hidden" />

      {/* Right: Profile dropdown positioned at the right edge */}
      <div className="flex items-center gap-2 sm:gap-4 z-[9999]">
        <NotificationSheet />
        <ProfileDropdown />
      </div>
    </div>
  );
}
