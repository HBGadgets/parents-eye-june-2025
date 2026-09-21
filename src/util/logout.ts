import Cookies from "js-cookie";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import { getMessagingInstance } from "@/util/firebase";
import { deleteToken } from "firebase/messaging";

export const performLogout = async (router?: any) => {
  try {
    if (typeof window !== "undefined") {
      // 1. Delete FCM token
      try {
        const messaging = await getMessagingInstance();
        if (messaging) {
          const isDeleted = await deleteToken(messaging);
          console.log(
            isDeleted ? "🗑️ FCM token deleted" : "⚠️ FCM token not deleted"
          );
        }
      } catch (err) {
        console.warn("FCM token deletion failed:", err);
      }

      // 2. Unregister Firebase service workers
      if ("serviceWorker" in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) {
            await reg.unregister();
          }
        } catch (err) {
          console.warn("Service worker unregister failed:", err);
        }
      }

      // 3. Clear Firebase IndexedDB
      try {
        indexedDB.deleteDatabase("firebase-messaging-database");
        indexedDB.deleteDatabase("firebase-messaging-database-v2");
        indexedDB.deleteDatabase("firebase-installations-database");
      } catch (err) {
        console.warn("IndexedDB deletion failed:", err);
      }

      // 4. Remove local storage keys
      localStorage.removeItem("fcm_token");
      localStorage.removeItem("ct-notifications");
      localStorage.removeItem("device-store");
      localStorage.removeItem("userId");

      // 5. Clear notification store
      useNotificationStore.getState().clearNotifications();
    }
  } catch (error) {
    console.error("❌ Error during logout cleanup:", error);
  } finally {
    // 6. Clear auth store and cookies
    useAuthStore.getState().logout();
    Cookies.remove("token");

    // 7. Redirect to login
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    } else if (router) {
      router.push("/login");
    }
  }
};
