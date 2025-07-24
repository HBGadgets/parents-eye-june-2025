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

  const title = payload?.notification?.title || "Notification";
  const options = {
    body: payload?.notification?.body || "",
    // icon: "/icon.png", // optional
    // badge: "/badge-icon.png", // optional
  };

  self.registration.showNotification(title, options);
});
