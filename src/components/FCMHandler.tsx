"use client";

import { useEffect, useRef } from "react";
import { getMessagingInstance, getToken, onMessage } from "@/util/firebase";
import { Messaging } from "firebase/messaging";
import { toast } from "sonner";
import authAxios from "@/lib/authAxios";
import Cookies from "js-cookie";
import { time } from "console";
import { useNotificationStore } from "@/store/notificationStore";
import {
  getStoredPreferences,
  isNotificationEnabled,
} from "@/util/notificationPrefs";

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!;

export default function FCMHandler(): null {
  const hasInitialized = useRef(false);
  const addNotification = useNotificationStore(
    (state) => state.addNotification
  );

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const notificationSound = new Audio("/notification.mp3");
    notificationSound.preload = "auto";

    const sosSound = new Audio("/sos.mp3");
    sosSound.preload = "auto";

    // An important bug resolved by pavan raghuvanshi aka raghukul boi
    // Call for fun times 81204 09279
    const initFCM = async () => {
      try {
        // -----------------------------
        // 1️⃣ Get Messaging Instance
        // -----------------------------
        const messaging = await getMessagingInstance();
        if (!messaging) {
          console.warn("Firebase messaging not available");
          return;
        }

        // -----------------------------
        // 2️⃣ Request Notification Permission
        // -----------------------------
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.warn("❌ Notification permission denied");
          return;
        }

        // -----------------------------
        // 3️⃣ Get / Store FCM Token
        // -----------------------------
        let storedToken =
          typeof window !== "undefined"
            ? localStorage.getItem("fcm_token")
            : null;

        if (!storedToken) {
          try {
            const newToken = await getToken(messaging as Messaging, {
              vapidKey,
            });

            if (newToken) {
              console.log("FCM token Generated: ", newToken);
              localStorage.setItem("fcm_token", newToken);

              const token = Cookies.get("token");
              if (token) {
                console.log("FCM token Generating for user: ", token);
                await authAxios.post(
                  "/fcmtoken/store",
                  { fcmToken: newToken },
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                console.log("FCM token stored");
              }
            }
          } catch (err) {
            console.error("FCM token error:", err);
          }
        }

        // -----------------------------
        // 4️⃣ Register Service Worker
        // -----------------------------
        if ("serviceWorker" in navigator) {
          try {
            await navigator.serviceWorker.register("/firebase-messaging-sw.js");
          } catch (err) {
            console.error("Service Worker registration failed:", err);
          }
        }

        // -----------------------------
        // 5️⃣ Foreground & Background FCM Listener
        // -----------------------------
        onMessage(messaging as Messaging, (payload) => {
          const title = payload.notification?.title ?? "New Notification";
          const body = payload.notification?.body ?? "";
          const ping = payload.data?.ping ?? 0;
          const type = payload.data?.type;

          if (ping && Number(ping) === 1) return; // ignore pings
          // if (type === "ignition") return; // ignore ignitions

          // Check preferences
          const blockedTypes = getStoredPreferences();
          if (!isNotificationEnabled(type, blockedTypes)) {
            console.log(`Suppressing ${type} notification based on preferences`);
            return;
          }


          console.log("SOS Notification Received: ", payload);


          const timeStamp = payload.data?.timeStamp
            ? new Date(Number(payload.data?.timeStamp))
            : new Date();

          const formattedTime = timeStamp.toLocaleString("en-IN", {
            timeStyle: "short",
            dateStyle: "medium",
          });

          // 💾 Save to Zustand
          addNotification({
            title,
            body,
            timestamp: formattedTime,
          });


          // 🔔 Play sound - Check type for SOS
          if (type === "sos") {
            console.log("Playing SOS sound");
            sosSound.loop = true;
            sosSound.play().catch(() => { });
          } else {
            console.log("Playing normal sound");
            notificationSound.play().catch(() => { });
          }

          // 🪟 Show toast
          if (type === "sos") {
            console.log("Showing SOS toast");
            toast.custom(
              (t) => (
                <div className="flex flex-col gap-1 p-4 rounded-2xl shadow-lg bg-red-500 border border-red-600 w-80 text-white relative">
                  <div className="text-base font-bold flex items-center justify-between">
                    <span>🚨 SOS ALERT - {title}</span>
                    <button
                      onClick={() => {
                        toast.dismiss(t);
                        sosSound.pause();
                        sosSound.currentTime = 0;
                      }}
                      className="text-white hover:text-gray-200 cursor-pointer"
                    >
                      X
                    </button>
                  </div>
                  <div className="text-sm text-white/90 leading-snug font-medium">
                    {body}
                  </div>
                  <div className="border-t border-red-400 my-2"></div>
                  <div className="text-xs text-red-100 flex items-center justify-end">
                    {formattedTime}
                  </div>
                </div>
              ),
              { duration: Infinity, unstyled: true }
            );
          } else {
            console.log("Showing normal toast");
            toast.custom(
              () => (
                <div className="flex flex-col gap-1 p-4 rounded-2xl shadow-lg bg-white border border-gray-200 w-80">
                  <div className="text-base font-semibold text-gray-900">
                    {title}
                  </div>
                  <div className="text-sm text-gray-700 leading-snug">
                    {body}
                  </div>
                  <div className="border-t border-gray-100 my-2"></div>
                  <div className="text-xs text-gray-500 flex items-center justify-end">
                    {formattedTime}
                  </div>
                </div>
              ),
              { duration: 4000 }
            );
          }
        });
      } catch (err) {
        console.error("FCM Init Error:", err);
      }
    };

    initFCM();
  }, []);

  return null;
}
