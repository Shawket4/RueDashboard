import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "@/shared/i18n";
// Side effects: auth store wires itself into apiContext on import
import "@/shared/auth/store";
import "@/shared/auth/app-store";
import { AppProviders } from "./providers";
import { AppRouter } from "./router";
import { initConsoleSilencer } from "./console-silencer";

initConsoleSilencer();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </React.StrictMode>,
);
