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

messaging.onBackgroundMessage(async (payload) => {
  console.log("📥 Background message received:", payload);

  const ping = payload?.data?.ping ?? 0;
  if (ping && Number(ping) === 1) return;

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

  const title = payload?.notification?.title || "Notification";
  const options = {
    body: payload?.notification?.body || "",
    icon: "/icon.png",
  };

  self.registration.showNotification(title, options);
});
