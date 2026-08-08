import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

const hasFirebaseConfig = () =>
  Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId &&
      vapidKey
  );

const getFirebaseApp = () => {
  if (!hasFirebaseConfig()) return null;
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
};

const buildServiceWorkerUrl = () => {
  const params = new URLSearchParams({
    apiKey: firebaseConfig.apiKey || "",
    authDomain: firebaseConfig.authDomain || "",
    projectId: firebaseConfig.projectId || "",
    storageBucket: firebaseConfig.storageBucket || "",
    messagingSenderId: firebaseConfig.messagingSenderId || "",
    appId: firebaseConfig.appId || "",
  });
  return `/firebase-messaging-sw.js?${params.toString()}`;
};

export const getFcmToken = async () => {
  if (!hasFirebaseConfig()) return null;
  if (!(await isSupported())) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const app = getFirebaseApp();
  if (!app) return null;

  const registration = await navigator.serviceWorker.register(buildServiceWorkerUrl());
  const messaging = getMessaging(app);
  return getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
};

export const listenForForegroundMessages = async (handler) => {
  if (!hasFirebaseConfig()) return () => {};
  if (!(await isSupported())) return () => {};

  const app = getFirebaseApp();
  if (!app) return () => {};
  const messaging = getMessaging(app);
  return onMessage(messaging, handler);
};
