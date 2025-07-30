'use client';
import { useEffect } from "react";
import useFCMToken from "./useFCMToken";
import { onMessage } from "firebase/messaging";
import { toast } from "sonner";
import { useFirebase } from "@/context/FirebaseContext";

const FcmProvider = ({ children }: { children: React.ReactNode }) => {
  const fcmToken = useFCMToken();
  const { messaging } = useFirebase();
  useEffect(() => {
    if ("serviceWorker" in navigator && messaging) {
        const fcmmessaging = messaging;
        const unsubscribe = onMessage(fcmmessaging, (payload) => {
          toast.info(payload.notification?.title, {icon: payload.notification?.icon, description: payload.notification?.body});
        });
      return () => unsubscribe();
    }
  }, [fcmToken, messaging]);

  return <>{children}</>
};

export default FcmProvider;
