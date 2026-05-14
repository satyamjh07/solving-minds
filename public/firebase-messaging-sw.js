importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// These values should ideally match your firebase config
// But for the SW to work, we just need to initialize it.
firebase.initializeApp({
  apiKey: "AIzaSyDDUOv37kxPQW7Wr3HstpLXjcQishk1m4k",
  authDomain: "solving-minds.firebaseapp.com",
  projectId: "solving-minds",
  storageBucket: "solving-minds.firebasestorage.app",
  messagingSenderId: "530006487505",
  appId: "1:530006487505:web:2ed4b1905c22b6c3a6f0f0",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png', // Replace with your app logo
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
