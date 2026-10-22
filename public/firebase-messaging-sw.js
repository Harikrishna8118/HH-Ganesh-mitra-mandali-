/* eslint-disable no-undef */
// Firebase Cloud Messaging Background Service Worker for Shri Ganesh Mitra Mandali
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Initialize Firebase inside the Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyCyWexFSsBrdrceGE1scX3Fa0K3Eluo7oM",
  authDomain: "gen-lang-client-0766282449.firebaseapp.com",
  projectId: "gen-lang-client-0766282449",
  storageBucket: "gen-lang-client-0766282449.firebasestorage.app",
  messagingSenderId: "1001945315696",
  appId: "1:1001945315696:web:856879cc93c31630e977b5"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || payload.data?.title || '🕉️ Shri Ganesh Mitra Mandali';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'New urgent community update posted for H. Hosahalli.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [300, 100, 300, 100, 300],
    tag: payload.data?.tag || 'gmm-announcement',
    renotify: true,
    data: {
      url: payload.data?.click_action || payload.data?.url || '/',
      dateOfArrival: Date.now(),
      primaryKey: payload.data?.id || 1
    },
    actions: [
      { action: 'open_app', title: 'Open Mandali App' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification tap / click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
