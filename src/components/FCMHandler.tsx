"use client";

import { useEffect, useRef } from "react";
import { getMessagingInstance, getToken, onMessage } from "@/util/firebase";
import { Messaging } from "firebase/messaging";
import { toast } from "sonner";
import authAxios from "@/lib/authAxios";
import Cookies from "js-cookie";
import { time } from "console";
import { useNotificationStore } from "@/store/notificationStore";

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

          if (ping && Number(ping) === 1) return; // ignore pings

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

          // 🔔 Play sound
          notificationSound.play().catch(() => {});

          // 🪟 Show toast
          toast.custom(() => (
            <div className="flex flex-col gap-1 p-4 rounded-2xl shadow-lg bg-white border border-gray-200 w-80">
              <div className="text-base font-semibold text-gray-900">
                {title}
              </div>
              <div className="text-sm text-gray-700 leading-snug">{body}</div>
              <div className="border-t border-gray-100 my-2"></div>
              <div className="text-xs text-gray-500 flex items-center justify-end">
                {formattedTime}
              </div>
            </div>
          ));
        });

        // -----------------------------
        // 6️⃣ Background Messages → Zustand
        // -----------------------------
        // if (navigator.serviceWorker) {
        //   navigator.serviceWorker.addEventListener("message", (event) => {
        //     if (event.data?.source !== "fcm-background") return;

        //     const payload = event.data.payload;

        //     const title = payload.notification?.title ?? "New Notification";
        //     const body = payload.notification?.body ?? "";
        //     const ping = payload.data?.ping ?? 0;

        //     if (ping && Number(ping) === 1) return;

        //     const timeStamp = payload.data?.timeStamp
        //       ? new Date(Number(payload.data?.timeStamp))
        //       : new Date();

        //     const formattedTime = timeStamp.toLocaleString("en-IN", {
        //       timeStyle: "short",
        //       dateStyle: "medium",
        //     });

        //     // 💾 Save to Zustand from background
        //     addNotification({
        //       title,
        //       body,
        //       timestamp: formattedTime,
        //     });

        //     console.log("📥 Background notification stored:", payload);
        //   });
        // }
      } catch (err) {
        console.error("FCM Init Error:", err);
      }
    };

    initFCM();
  }, []);

  return null;
}
