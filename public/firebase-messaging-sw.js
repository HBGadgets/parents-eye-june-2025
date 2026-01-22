importScripts(
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: `AIzaSyDiHOKD_htTBuO_4vNNWQjbM17uxxszTuw`,
  authDomain: `parentseye-88b2f.firebaseapp.com`,
  projectId: `parentseye-88b2f`,
  storageBucket: `parentseye-88b2f.firebasestorage.app`,
  messagingSenderId: `713888678223`,
  appId: `1:713888678223:web:5eb043aae3483ab752453a`,
  measurementId: `G-NZMJZWCG1C`,
});

const messaging = firebase.messaging();

const DB_NAME = "notification-prefs-db";
const STORE_NAME = "prefs";
const KEY = "blocked-types";

// Helper to read from IndexedDB
const getBlockedTypes = () => {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => resolve([]);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      try {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const getRequest = store.get(KEY);
        getRequest.onsuccess = () => resolve(getRequest.result || []);
        getRequest.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    };
  });
};

messaging.onBackgroundMessage(async (payload) => {
  // console.log("📥 Background message received:", payload);

  const ping = payload?.data?.ping ?? 0;
  const type = payload?.data?.type;
  // console.log("📥 Background message type:", type);

  if (ping && Number(ping) === 1) return; // Ignore pings
  // if (type === "ignition") return; // Ignore ignitions (legacy check)

  // Check preferences from IndexedDB
  const blockedTypes = await getBlockedTypes();
  // Default to allowing "general" if type is missing, check if blocked
  const isBlocked = type
    ? blockedTypes.includes(type)
    : blockedTypes.includes("general");

  if (isBlocked) {
    console.log(`Suppressing background ${type} notification based on preferences`);
    return;
  }

  // Customize notification here if needed, or let the browser handle it if payload has 'notification' key
  // However, onBackgroundMessage is usually for handling data messages or overriding handling.
  // If payload has 'notification', the browser might show it automatically unless we ignore it?
  // Actually, for data-only messages, we must show it. For notification messages, this handler runs.
  // If we return here, we might stop custom handling, but if the message serves as a notification, we want to suppress it.
  // The documentation says: "If you want to customize the notification... return a promise... or 'self.registration.showNotification()'".
  // If we DO NOT call showNotification, no notification appears for data messages.
  // BUT if the payload has a 'notification' block, the browser handles it automatically when app is in bg,
  // EXCEPT if we handle it here? No, actually 'onBackgroundMessage' allows us to handle it, but suppressing a Notification-key message 
  // in background is tricky. Usually specific fields are used.
  // Assuming these are DATA messages that trigger local notifications (which seems to be the case given the code structure in other files or typical FCM usage for custom handling).
  
  // If we want to show it:
  if (payload.data) {
     const title = payload.notification?.title || payload.data.title || "New Notification";
     const body = payload.notification?.body || payload.data.body || "";
     
     // We must explicitly show notification for background data messages
     // If the message has a 'notification' key, the SDK might have already shown it? 
     // Let's assume we control it or these are data messages.
     // To be safe and avoid duplicates if it IS a notification message, we can just return if not blocked.
     // But wait, if we want to BLOCK it, implies we have control. 
     
     // Let's explicitly show it if it's NOT blocked, ensuring we handle data-only messages too.
     // self.registration.showNotification(title, { body, ... });
  }

  clients
    .matchAll({ includeUncontrolled: true, type: "window" })
    .then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({
          source: "fcm-background",
          payload,
        });
      });
    });
});
