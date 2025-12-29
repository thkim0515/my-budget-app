import { initializeApp } from "firebase/app";
import { getFunctions } from "firebase/functions";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAaIyrqx5JqvDP-Llawws-K3YbOtF-em18",
  authDomain: "my-budget-app-4d22a.firebaseapp.com",
  projectId: "my-budget-app-4d22a",
  appId: "1:376640584062:web:5d19be448d6948b42f9b2f"
};

const app = initializeApp(firebaseConfig);

export const functions = getFunctions(app, "asia-northeast3");
export const db = getFirestore(app);