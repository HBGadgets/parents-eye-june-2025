"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
// import { Button } from "@/components/ui/button";
// import { LogOut } from "lucide-react";
import { onMessage } from "@/util/firebase";
import { deleteToken } from "firebase/messaging";

export function LogoutButton() {
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      if (onMessage) {
        const isDeleted = await deleteToken(onMessage);
        localStorage.removeItem("fcm_token");
        console.log(
          isDeleted ? "🗑️ FCM token deleted" : "⚠️ FCM token not deleted"
        );
      }
      logout(); // clear state + token
      router.push("/login"); // redirect to login page
    } catch (error) {
      console.error("❌ Error deleting FCM token:", error);
    }
  };

  return (
    <span onClick={handleLogout} className="cursor-pointer ml-2">
      Logout
    </span>
  );
}
