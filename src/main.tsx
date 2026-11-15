import React from "react";
import ReactDOM from "react-dom/client";
import { MotionConfig } from "motion/react";
import App from "./App";
import { AuthProvider } from "./features/auth/AuthContext";
import { AppStateProvider } from "./features/app-state/AppStateContext";
import { migrateLegacyStorageKeys } from "./features/storage/migrateBrandKeys";

// Theme last so it overrides the app's own CSS.
import "./styles/theme.css";

migrateLegacyStorageKeys();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <AppStateProvider>
          <App />
        </AppStateProvider>
      </AuthProvider>
    </MotionConfig>
  </React.StrictMode>,
);
