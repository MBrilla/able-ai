"use client";
import { useEffect, useState } from "react";
import { getToken, isSupported } from "firebase/messaging";
import useNotificationPermission from "./useNotificationPermission";
import { subscribeFcmTopicAction } from "@/actions/notifications/notifications";
import { useFirebase } from "@/context/FirebaseContext";

const useFCMToken = () => {
  const permission = useNotificationPermission();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const { messaging } = useFirebase();

  useEffect(() => {
    const retrieveToken = async () => {
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        if (permission === "granted") {
          const isFCMSupported = await isSupported();
          if (!isFCMSupported) return;
          const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

          if (!messaging) {
            console.error("Firebase Messaging is not initialized.");
            return;
          }
          const fcmToken = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
          })
          setFcmToken(fcmToken);
          subscribeFcmTopicAction(fcmToken)
        }
      }
    };
    retrieveToken();
  }, [messaging, permission]);

  return fcmToken;
};

export default useFCMToken;
