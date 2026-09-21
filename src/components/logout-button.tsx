"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { performLogout } from "@/util/logout";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await performLogout(router);
  };

  return (
    <span onClick={handleLogout} className="cursor-pointer ml-2 w-full flex items-center gap-3">
      <LogOut /> Logout
    </span>
  );
}

