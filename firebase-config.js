// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA9eoASRIi19IE2CjAiNKZKUt5fx4uQk_A",
  authDomain: "project-lighthouse2-b2bed.firebaseapp.com",
  projectId: "project-lighthouse2-b2bed",
  storageBucket: "project-lighthouse2-b2bed.firebasestorage.app",
  messagingSenderId: "206952722644",
  appId: "1:206952722644:web:ca6ab3907934b3bc340b41",
  measurementId: "G-PBPPRHMMTR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Analytics (optional)
export const analytics = getAnalytics(app);

// Initialize Cloud Functions (region: us-central1)
export const functions = getFunctions(app, 'us-central1');

// Export the app instance
export default app;
