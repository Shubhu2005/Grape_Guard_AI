import { useEffect } from "react";
import { toast } from "sonner";

import { getFcmToken, listenForForegroundMessages } from "@/lib/firebase";
import { emitNotificationsChanged } from "@/hooks/useNotifications";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const FCM_TOKEN_STORAGE_KEY = "fcm_token";
const FCM_REGISTERED_USER_KEY = "fcm_registered_user";

const registerToken = async (token, accessToken) => {
  const response = await fetch(`${API_BASE_URL}/notifications/register-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ fcm_token: token }),
  });
  if (!response.ok) {
    throw new Error("Failed to register notification token");
  }
};

export const unregisterCurrentToken = async (accessToken) => {
  const token = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
  if (!token || !accessToken) return;

  try {
    await fetch(`${API_BASE_URL}/notifications/unregister-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ fcm_token: token }),
    });
  } catch {
    // Best-effort cleanup only.
  } finally {
    localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
    localStorage.removeItem(FCM_REGISTERED_USER_KEY);
  }
};

export const usePushNotifications = (user, getAccessToken) => {
  useEffect(() => {
    if (!user?.id) return;

    let isCancelled = false;
    const boot = async () => {
      try {
        const accessToken = getAccessToken?.();
        if (!accessToken) return;

        const token = await getFcmToken();
        if (!token || isCancelled) return;

        const previousToken = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
        const previousUserId = localStorage.getItem(FCM_REGISTERED_USER_KEY);
        if (previousToken === token && previousUserId === user.id) {
          return;
        }

        await registerToken(token, accessToken);
        localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
        localStorage.setItem(FCM_REGISTERED_USER_KEY, user.id);
      } catch (error) {
        console.warn("Push notification setup failed", error);
      }
    };

    boot();

    let unsubscribe = () => {};
    listenForForegroundMessages((payload) => {
      const title = payload?.notification?.title || "New notification";
      const body = payload?.notification?.body || "You have a new update.";
      toast(title, { description: body });
      emitNotificationsChanged();
    }).then((cleanup) => {
      if (!isCancelled && typeof cleanup === "function") {
        unsubscribe = cleanup;
      }
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [user, getAccessToken]);
};
