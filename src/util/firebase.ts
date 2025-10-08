// @/util/firebase.ts

import { initializeApp, getApps } from "firebase/app";
import {
  getMessaging,
  getToken as firebaseGetToken,
  onMessage as firebaseOnMessage,
  isSupported,
  Messaging,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Create a lazy getter for messaging
let messagingInstance: Messaging | null = null;
let messagingPromise: Promise<Messaging | null> | null = null;

const getMessagingInstance = async (): Promise<Messaging | null> => {
  if (messagingInstance) return messagingInstance;

  if (messagingPromise) return messagingPromise;

  messagingPromise = (async () => {
    if (typeof window === "undefined") return null;

    try {
      const supported = await isSupported();
      if (!supported) {
        console.warn("Firebase Messaging not supported");
        return null;
      }

      messagingInstance = getMessaging(app);
      return messagingInstance;
    } catch (error) {
      console.error("Error initializing Firebase Messaging:", error);
      return null;
    }
  })();

  return messagingPromise;
};

// Export the async getter instead of messaging directly
export {
  app,
  getMessagingInstance,
  firebaseGetToken as getToken,
  firebaseOnMessage as onMessage,
};
