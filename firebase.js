// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBVeMG2qMFHNSCuTUgNHwzFBdCOAlscQj8",
  authDomain: "gerenciador-escolar-44ef8.firebaseapp.com",
  databaseURL: "https://gerenciador-escolar-44ef8-default-rtdb.firebaseio.com",
  projectId: "gerenciador-escolar-44ef8",
  storageBucket: "gerenciador-escolar-44ef8.appspot.com",
  messagingSenderId: "300859314525",
  appId: "1:300859314525:web:272edcc5d69663a6ad18b4",
  measurementId: "G-82H8KSJ3RX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);