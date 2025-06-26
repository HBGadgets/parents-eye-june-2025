"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const handleLogout = () => {
    logout(); // clear state + token
    router.push("/login"); // redirect to login page
  };

  return (
    <span onClick={handleLogout} className="cursor-pointer ml-2">
      Logout
    </span>
  );
}
