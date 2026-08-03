// Firebase core
import { initializeApp } from 'firebase/app';

// Firebase Authentication
import { getAuth } from 'firebase/auth';

// Firebase Firestore Database
import { getFirestore } from 'firebase/firestore';

// Your Firebase project config
const firebaseConfig = {
  apiKey: 'AIzaSyDN92BmdV9lePKAGoB_qvjDpAr_--PzyAo',
  authDomain: 'studio-8006047652-66704.firebaseapp.com',
  projectId: 'studio-8006047652-66704',
  storageBucket: 'studio-8006047652-66704.firebasestorage.app',
  messagingSenderId: '646439003177',
  appId: '1:646439003177:web:70e0fdc4fa7f630ceca838',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Auth and Firestore so the whole app can use them
export const auth = getAuth(app);
export const db = getFirestore(app);
