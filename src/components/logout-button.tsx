"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getMessaging, deleteToken } from "firebase/messaging";
import { app } from "@/util/firebase"; // or wherever your Firebase app is initialized

export function LogoutButton() {
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Get the messaging instance
      const messaging = getMessaging(app);

      // Delete the FCM token
      const isDeleted = await deleteToken(messaging);
      localStorage.removeItem("fcm_token");
      console.log(
        isDeleted ? "🗑️ FCM token deleted" : "⚠️ FCM token not deleted"
      );

      logout(); // clear state + token
      router.push("/login"); // redirect to login page
    } catch (error) {
      console.error("❌ Error deleting FCM token:", error);
      // Still logout even if token deletion fails
      logout();
      router.push("/login");
    }
  };

  return (
    <span onClick={handleLogout} className="cursor-pointer ml-2">
      Logout
    </span>
  );
}
