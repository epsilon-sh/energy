import React from "react";

import ReactDOM from "react-dom/client";

import { Provider as StoreProvider } from "react-redux";
import App from "./App.tsx";
import store from "./store.ts";
import { BrowserRouter } from "react-router-dom";

const appMount = document.getElementById("app");

ReactDOM.createRoot(appMount!)
  .render(
    <React.StrictMode>
      <StoreProvider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StoreProvider>
    </React.StrictMode>);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8989";

const cta = document.querySelector('form[name="waitlist"]')!;
const mail: HTMLInputElement = cta.querySelector('input[name="email"]')!;

const handleWaitlistSubmit = async (email: string) => {
  try {
    const target = new URL("/waitlist", API_URL);
    const response = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error("Failed to join waitlist");
    }

    alert("Successfully joined waitlist!");
    return;
  } catch (error) {
    console.error("Waitlist error:", error);
    alert("Failed to join waitlist. Please try again later.");
  }
};

// Update the event listener
cta.addEventListener("submit", (e) => {
  e.preventDefault();
  handleWaitlistSubmit(mail.value).then(() => mail.value = "");
});
