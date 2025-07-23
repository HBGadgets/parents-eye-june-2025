// components/FCMHandler.tsx
"use client";

import { useEffect, useRef } from "react";
import { messaging, getToken, onMessage } from "@/util/firebase";
import { Messaging } from "firebase/messaging";
import { toast } from "sonner";

// Get VAPID key from environment
const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!;

// Preload audio
const notificationSound = new Audio("/notification.mp3");
notificationSound.preload = "auto";

export default function FCMHandler(): null {
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initFCM = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.warn("❌ Notification permission denied");
          return;
        }

        if (!messaging) {
          console.warn("Firebase messaging not initialized");
          return;
        }

        const storedToken = localStorage.getItem("fcm_token");
        if (storedToken) {
          console.log("📦 Reusing stored FCM Token:", storedToken);
        } else {
          const newToken = await getToken(messaging as Messaging, { vapidKey });
          if (newToken) {
            console.log("✅ New FCM Token:", newToken);
            localStorage.setItem("fcm_token", newToken);
            // TODO: Send token to your backend
          }
        }

        // Set up listener once
        onMessage(messaging as Messaging, (payload) => {
          console.log("🔔 Foreground notification:", payload);

          const title = payload.notification?.title ?? "New Notification";
          const body = payload.notification?.body ?? "";
          const type = title.toLowerCase();

          // Play sound
          notificationSound.play().catch((err) => {
            console.warn("🔇 Sound blocked:", err);
          });

          // Native Notification
          try {
            new Notification(title, {
              body,
              icon: "/favicon.ico",
              tag: payload.messageId,
              data: payload.data,
            });
          } catch (err) {
            console.warn("Unable to show native notification:", err);
          }

          // Toast styles
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

          toast(title, {
            description: body,
            duration: 6000,
            className,
            descriptionClassName: "text-sm text-gray-600 mt-1",
          });
        });
      } catch (err) {
        console.error("🔥 FCM Init Error:", err);
      }
    };

    initFCM();
  }, []);

  return null;
}
