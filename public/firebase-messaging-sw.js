// Service Worker Version — bump this to force cache refresh for offline/PWA users
const SW_VERSION = 'v1.4.0';
const CACHE_NAME = `solvingminds-${SW_VERSION}`;

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
    icon: '/logo.png',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Install: cache critical shell assets and activate immediately
self.addEventListener('install', (event) => {
  console.log(`[SW ${SW_VERSION}] Installing...`);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/logo.png',
        '/manifest.json',
      ]);
    })
  );
  self.skipWaiting(); // Activate new SW immediately
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  console.log(`[SW ${SW_VERSION}] Activating...`);
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith('solvingminds-') && key !== CACHE_NAME)
          .map((key) => {
            console.log(`[SW] Deleting old cache: ${key}`);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim(); // Take control of all clients immediately
});
