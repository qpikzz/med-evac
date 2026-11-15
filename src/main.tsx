import React from "react";
import ReactDOM from "react-dom/client";
import { MotionConfig } from "motion/react";
import App from "./App";
import SpaceBackdrop from "./components/SpaceBackdrop/SpaceBackdrop";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./features/auth/AuthContext";
import { AppStateProvider } from "./features/app-state/AppStateContext";
import { migrateLegacyStorageKeys } from "./features/storage/migrateBrandKeys";

// Theme last so it overrides the app's own CSS.
import "./styles/theme.css";

migrateLegacyStorageKeys();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <ErrorBoundary>
    <React.StrictMode>
      <MotionConfig reducedMotion="user">
        <SpaceBackdrop />
        <AuthProvider>
          <AppStateProvider>
            <App />
          </AppStateProvider>
        </AuthProvider>
      </MotionConfig>
    </React.StrictMode>
  </ErrorBoundary>,
);
