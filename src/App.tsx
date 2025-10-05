import { useEffect, useState } from "react";
import "./App.css";
import { useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { WorldsPage } from "./pages/WorldsPage";
import { CanvasPage } from "./pages/CanvasPage";
import type { World } from "./api/worlds";

type Screen = "login" | "register" | "worlds" | "canvas";

function App() {
  const { isAuthenticated } = useAuth();
  const [screen, setScreen] = useState<Screen>(() =>
    isAuthenticated ? "worlds" : "login"
  );
  const [activeWorld, setActiveWorld] = useState<World | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setActiveWorld(null);
      setScreen((current) => (current === "register" ? "register" : "login"));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setScreen((current) => {
      if ((current === "login" || current === "register") && activeWorld) {
        return "canvas";
      }
      if (current === "canvas" && !activeWorld) {
        return "worlds";
      }
      if (current === "login" || current === "register") {
        return "worlds";
      }
      return current;
    });
  }, [isAuthenticated, activeWorld]);

  return (
    <div
      className={`app-shell ${screen === "canvas" ? "app-shell--canvas" : ""}`}
    >
      {!isAuthenticated && screen === "register" ? (
        <RegisterPage
          onGoToLogin={() => setScreen("login")}
          onRegistered={() => setScreen("login")}
        />
      ) : !isAuthenticated ? (
        <LoginPage
          onGoToRegister={() => setScreen("register")}
          onSuccess={() => setScreen("worlds")}
        />
      ) : screen === "canvas" && activeWorld ? (
        <CanvasPage
          world={activeWorld}
          onBack={() => {
            setActiveWorld(null);
            setScreen("worlds");
          }}
        />
      ) : (
        <WorldsPage
          onOpenWorld={(world) => {
            setActiveWorld(world);
            setScreen("canvas");
          }}
        />
      )}
    </div>
  );
}

export default App;
