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

messaging.onBackgroundMessage((payload) => {
  console.log("📥 Background message received:", payload);

  const notificationTitle = payload?.notification?.title || "New Notification";
  const notificationOptions = {
    body: payload?.notification?.body || "You have a new message",
    icon: "/icon.png", // Make sure this path is valid and accessible
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
