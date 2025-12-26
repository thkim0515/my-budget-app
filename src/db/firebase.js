import { initializeApp } from "firebase/app";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAaIyrqx5JqvDP-Llawws-K3YbOtF-em18",
  authDomain: "my-budget-app-4d22a.firebaseapp.com",
  projectId: "my-budget-app-4d22a",
  appId: "1:376640584062:web:5d19be448d6948b42f9b2f"
};

const app = initializeApp(firebaseConfig);

// 반드시 리전 명시 (서버와 동일)
export const functions = getFunctions(app, "asia-northeast3");
