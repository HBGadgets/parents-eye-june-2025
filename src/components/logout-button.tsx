"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getMessaging, deleteToken } from "firebase/messaging";
import { app } from "@/util/firebase"; // or wherever your Firebase app is initialized
import Cookies from "js-cookie";

export function LogoutButton() {
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      /**delete fcm token */

      // Get the messaging instance
      const messaging = getMessaging(app);

      // Delete the FCM token
      const isDeleted = await deleteToken(messaging);
      console.log(
        isDeleted ? "🗑️ FCM token deleted" : "⚠️ FCM token not deleted"
      );

      // Unregister Firebase service workers
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.unregister();
        }
      }

      //  Clear Firebase IndexedDB
      indexedDB.deleteDatabase("firebase-messaging-database");
      indexedDB.deleteDatabase("firebase-messaging-database-v2");
      indexedDB.deleteDatabase("firebase-installations-database");

      localStorage.removeItem("fcm_token");
      /** delete fmc token */

      logout(); // clear state + token
      router.push("/login"); // redirect to login page
      window.location.reload();
    } catch (error) {
      console.error("❌ Error deleting FCM token:", error);
      // Still logout even if token deletion fails
      logout();
      router.push("/login");
    }
  };

  return (
    <span onClick={handleLogout} className="cursor-pointer ml-2 w-full">
      Logout
    </span>
  );
}
