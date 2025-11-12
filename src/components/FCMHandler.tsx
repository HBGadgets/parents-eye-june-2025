"use client";

import { useEffect, useRef } from "react";
import { getMessagingInstance, getToken, onMessage } from "@/util/firebase";
import { Messaging } from "firebase/messaging";
import { toast } from "sonner";
import authAxios from "@/lib/authAxios";
import Cookies from "js-cookie";
import { time } from "console";

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!;

export default function FCMHandler(): null {
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const notificationSound = new Audio("/notification.mp3");
    notificationSound.preload = "auto";

    const initFCM = async () => {
      try {
        // Get messaging instance asynchronously
        const messaging = await getMessagingInstance();

        if (!messaging) {
          console.warn("Firebase messaging not available");
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.warn("❌ Notification permission denied");
          return;
        }
        let storedToken;
        if (typeof window !== "undefined") {
          storedToken = localStorage.getItem("fcm_token");
        }

        if (!storedToken) {
          try {
            const newToken = await getToken(messaging as Messaging, {
              vapidKey,
            });

            if (newToken) {
              localStorage.setItem("fcm_token", newToken);

              const token = Cookies.get("token");
              if (token) {
                await authAxios.post(
                  "/fcmtoken/store",
                  { fcmToken: newToken },
                  { headers: { Authorization: `Bearer ${token}` } }
                );
              }
            }
          } catch (err) {
            console.error("FCM token error:", err);
          }
        }

        // Register service worker
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker
            .register("/firebase-messaging-sw.js")
            .then((registration) => {
              // console.log("Service Worker registered:", registration.scope);
            })
            .catch((err) => {
              // console.error("Service Worker registration failed:", err);
            });
        }

        // Set up foreground message listener
        onMessage(messaging as Messaging, (payload) => {
          const title = payload.notification?.title ?? "New Notification";
          const body = payload.notification?.body ?? "";
          const ping = payload.data?.ping ?? 0;
          const type = title.toLowerCase();
          const timeStamp = new Date(Number(payload.data?.timeStamp));
          const date = new Date(timeStamp);
          const formattedTime = date.toLocaleString("en-IN", {
            timeStyle: "short",
            dateStyle: "medium",
          });

          if (ping && Number(ping) === 1) {
            // console.log(
            //   "⏩ Ping message detected — skipping notification and sound."
            // );
            return;
          }

          notificationSound.play().catch((err) => {
            console.warn("Sound blocked:", err);
          });

          const styles: Record<string, string> = {
            overspeed: "bg-red-50 text-red-800 border-l-4 border-red-600",
            running: "bg-green-50 text-green-800 border-l-4 border-green-600",
            stop: "bg-gray-100 text-gray-800 border-l-4 border-gray-500",
            geofence_enter:
              "bg-blue-50 text-blue-800 border-l-4 border-blue-600",
            geofence_exit:
              "bg-yellow-50 text-yellow-800 border-l-4 border-yellow-600",
          };

          const className =
            styles[type] ?? "bg-white text-black border-l-4 border-blue-500";

          toast.custom(() => (
            <div className="flex flex-col gap-1 p-4 rounded-2xl shadow-lg bg-white border border-gray-200 w-80">
              {/* Title */}
              <div className="text-base font-semibold text-gray-900">
                {title}
              </div>

              {/* Body */}
              <div className="text-sm text-gray-700 leading-snug">{body}</div>

              {/* Divider */}
              <div className="border-t border-gray-100 my-2"></div>

              {/* Timestamp */}
              <div className="text-xs text-gray-500 flex items-center justify-end">
                {formattedTime}
              </div>
            </div>
          ));
        });
      } catch (err) {
        // console.error("FCM Init Error:", err);
      }
    };

    initFCM();
  }, []);

  return null;
}
