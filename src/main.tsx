import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./features/auth/AuthContext";
import { AppStateProvider } from "./features/app-state/AppStateContext";
import { migrateLegacyStorageKeys } from "./features/storage/migrateBrandKeys";

migrateLegacyStorageKeys();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </AuthProvider>
  </React.StrictMode>,
);
