import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { RouterProvider } from "./router/RouterProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider>
        <App />
      </RouterProvider>
    </AuthProvider>
  </StrictMode>
);
