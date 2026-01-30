// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBFZ2PJRotu0wBc0imTpwaOPX9I2K9sYZI",
    authDomain: "smartpds-c00c5.firebaseapp.com",
    projectId: "smartpds-c00c5",
    storageBucket: "smartpds-c00c5.firebasestorage.app",
    messagingSenderId: "424498395256",
    appId: "1:424498395256:web:117fa1b0d160b7f267558d",
    measurementId: "G-YEX86R9LMM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;
