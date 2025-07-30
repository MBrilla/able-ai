"use client";

import React, { createContext, useContext, ReactNode, useEffect } from "react";
import type { FirebaseStorage } from "firebase/storage";
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAI, GoogleAIBackend } from "firebase/ai";
import { getMessaging } from "firebase/messaging";

interface FirebaseContextType {
  authClient: Auth | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;
  ai: ReturnType<typeof getAI> | null;
  messaging: import("firebase/messaging").Messaging | null;
  loading: boolean;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export const FirebaseProvider = ({ children }: { children: ReactNode }) => {
  const [authClient, setAuthClient] = React.useState<Auth | null>(null);
  const [messaging, setMessaging] = React.useState<
    import("firebase/messaging").Messaging | null
  >(null);
  const [db, setDb] = React.useState<Firestore | null>(null);
  const [storage, setStorage] = React.useState<FirebaseStorage | null>(null);
  const [ai, setAi] = React.useState<ReturnType<typeof getAI> | null>(null);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    async function initFirebase() {
      const res = await fetch("/firebase-config.json");
      const firebaseConfig = await res.json();

      let firebaseApp: FirebaseApp;

      if (getApps().length === 0) {
        console.log("[Firebase] Initializing new instance...");
        firebaseApp = initializeApp(firebaseConfig);
      } else {
        console.log("[Firebase] Reusing existing instance.");
        firebaseApp = getApp();
      }

      setAuthClient(getAuth(firebaseApp));
      setDb(getFirestore(firebaseApp));
      setStorage(getStorage(firebaseApp));
      setAi(getAI(firebaseApp, { backend: new GoogleAIBackend() }));
      setMessaging(getMessaging(firebaseApp));
      setLoading(false);
    }
    initFirebase();
  }, []);

  return (
    <FirebaseContext.Provider
      value={{
        authClient: authClient,
        db,
        storage,
        ai,
        messaging,
        loading,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context)
    throw new Error("useFirebase must be used within FirebaseProvider");
  return context;
};
