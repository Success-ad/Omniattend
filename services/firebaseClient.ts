import { initializeApp } from 'firebase/app';
import {getAuth} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBDIV6tV1Unz33lBhk5q9_BrC_k_4Uydxw",
  authDomain: "omniattend-26eda.firebaseapp.com",
  projectId: "omniattend-26eda",
  storageBucket: "omniattend-26eda.firebasestorage.app",
  messagingSenderId: "137034690470",
  appId: "1:137034690470:web:dca54bfcae450a25096967"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);