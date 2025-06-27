"use client";

import * as React from "react";
import Link from "next/link";
import { useNavigationStore } from "@/store/navigationStore";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { ProfileDropdown } from "@/components/ProfileDropdown";

export function Navbar() {
  const setActiveSection = useNavigationStore(
    (state) => state.setActiveSection
  );

  return (
    <div className="flex w-full h-16 items-center justify-between relative px-4">
      {/* Left placeholder to balance right profile width */}
      <div className="w-[150px]" />{" "}
      {/* Adjust based on ProfileDropdown width */}
      {/* Centered nav links */}
      <div className="flex-1 flex justify-center mr-25">
        <NavigationMenu>
          <NavigationMenuList>
            {["Dashboard", "School", "Users", "Reports"].map((section) => (
              <NavigationMenuItem key={section}>
                <NavigationMenuLink
                  asChild
                  className="font-semibold"
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
      {/* Right: Profile dropdown */}
      <div className="w-[150px] flex justify-end">
        <ProfileDropdown />
      </div>
    </div>
  );
}
