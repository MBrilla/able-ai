"use client"; // Ensures this module runs only on the client-side

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAI, GoogleAIBackend } from "firebase/ai";
import { getMessaging } from "firebase/messaging";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// It's STRONGLY recommended to load these from environment variables
// and ensure they are ONLY available on the client-side.
const firebaseConfig = {
  apiKey: "AIzaSyBF7DIyylS8ByVbXxdmnmLkKpLyXSdEbQA",
  authDomain: "ableai-mvp.firebaseapp.com",
  projectId: "ableai-mvp",
  storageBucket: "ableai-mvp.firebasestorage.app",
  messagingSenderId: "697522507372",
  appId: "1:697522507372:web:7ce039897f0e597d4d9249"
}


// Initialize Firebase App
let firebaseApp: FirebaseApp;

// Check if Firebase has already been initialized
if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp(); // If already initialized, use that app
}

// Initialize Firebase services
const authClient: Auth = getAuth(firebaseApp);
const db: Firestore = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);
// Initialize the Gemini Developer API backend service
const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });

export const messaging = () => getMessaging(firebaseApp);

export { firebaseApp, authClient, storage, firebaseConfig, ai, db };


