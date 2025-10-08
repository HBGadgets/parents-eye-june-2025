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
import Image from "next/image";

export function Navbar() {
  const setActiveSection = useNavigationStore(
    (state) => state.setActiveSection
  );
  const { setOpen, setOpenMobile, isMobile } = useSidebar();

  const navigationMap = {
    Dashboard: "/dashboard",
    Maintenance: "https://maintenance.credencetracker.com/#/login",
  };

  const handleNavClick = React.useCallback(
    (section: string) => {
      if (section !== "Dashboard") {
        setActiveSection(section);
        // Open sidebar based on device type
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
    <div className="w-full h-16 flex items-center relative px-2 sm:px-4 bg-primary border-b border-yellow-600/20">
      {/* <div className="w-full h-16 fixed flex items-center px-2 sm:px-4 bg-primary border-b border-yellow-600/20"> */}
      {/* Left: Logo and title */}
      {/* <div className="flex items-center flex-shrink-0 h-full">
        <Image
          width={150}
          height={150}
          src="/logo.svg"
          alt="Logo"
          className="relative left-10 -top-2.5"
        />
      </div> */}

      {/* Centered nav links with responsive spacing */}
      <div className="flex-1 flex justify-center items-center relative z-30">
        <div className="max-w-[calc(100%-80px)] sm:max-w-none">
          <NavigationMenu>
            <NavigationMenuList className="flex-wrap justify-center gap-1 sm:gap-2">
              {[
                "Dashboard",
                "School",
                "Users",
                "Reports",
                "Support",
                "Maintenance",
              ].map((section) => (
                <NavigationMenuItem key={section}>
                  <NavigationMenuLink
                    asChild
                    className="text-xs sm:text-sm px-1.5 sm:px-3 py-1 sm:py-2 whitespace-nowrap font-semibold hover:font-bold transition-colors duration-200 focus:font-bold hover:bg-yellow-500/20 rounded-md"
                  >
                    <Link
                      // href={section === "Dashboard" ? "/dashboard" : "#"}
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
      </div>

      {/* Right: Profile dropdown positioned at the right edge */}
      <div className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 flex-shrink-0 z-[9999] h-full flex items-center">
        <ProfileDropdown />
      </div>
    </div>
  );
}
