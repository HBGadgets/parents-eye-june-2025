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

export function Navbar() {
  const setActiveSection = useNavigationStore(
    (state) => state.setActiveSection
  );
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const { notifications } = useNotificationStore();

  // React.useEffect(() => {
  //   console.log("Notifications: ", notifications);
  // }, [notifications]);

  const navigationMap: Record<string, string> = {
    Dashboard: "/dashboard",
    Maintenance: "https://maintenance.credencetracker.com/#/login",
    Geofence: "/dashboard/school/geofence",
    Notifications: "/dashboard/users/notification",
  };

  const handleNavClick = React.useCallback(
    (section: string) => {
      if (section === "Dashboard") {
        // Close sidebar on both mobile and desktop when Dashboard is clicked
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
    <div className="w-full h-16 flex items-center relative px-2 sm:px-4 bg-primary border-b border-yellow-600/20">
      {/* Centered nav links with responsive spacing */}
      <div className="flex-1 flex justify-center items-center relative z-[9999]">
        <div className="max-w-[calc(100%-80px)] sm:max-w-none">
          <NavigationMenu>
            <NavigationMenuList className="flex-wrap justify-center gap-1 sm:gap-2">
              {[
                "Dashboard",
                "Master",
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
      <div className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 flex-shrink-0 z-[9999] h-full flex items-center gap-4">
        <NotificationSheet />
        <ProfileDropdown />
      </div>
    </div>
  );
}
