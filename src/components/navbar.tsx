"use client";

import * as React from "react";
import Link from "next/link";
import { useNavigationStore } from "@/store/navigationStore";
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

  return (
    <div className="w-full h-full flex items-center relative px-2 sm:px-4 bg-primary">
      {/* Left: Logo and title */}
      <div className="flex items-center flex-shrink-0">
        <Image
          width={150}
          height={150}
          src="/logo.svg"
          alt="Logo"
          className="relative left-10 -top-2.5"
        />
      </div>
      {/* Centered nav links with responsive spacing */}
      <div className="flex-1 flex justify-center relative z-30">
        <div className="max-w-[calc(100%-80px)] sm:max-w-none">
          <NavigationMenu>
            <NavigationMenuList className="flex-wrap justify-center gap-1 sm:gap-2">
              {["Dashboard", "School", "Users", "Reports"].map((section) => (
                <NavigationMenuItem key={section}>
                  <NavigationMenuLink
                    asChild
                    className={`text-xs sm:text-sm px-1.5 sm:px-3 py-1 sm:py-2 whitespace-nowrap font-semibold hover:font-bold transition-colors duration-200 focus:font-bold`}
                    onClick={() => {
                      if (section !== "Dashboard") {
                        setActiveSection(section);
                      }
                    }}
                  >
                    <Link href={section === "Dashboard" ? "/dashboard" : "#"}>
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
      <div className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 flex-shrink-0 z-30">
        <ProfileDropdown />
      </div>
    </div>
  );
}
