import { useEffect, useMemo, type ReactElement } from "react";
import "./App.css";
import { useAuth } from "./context/AuthContext";
import { CanvasPage } from "./pages/CanvasPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { WorldsPage } from "./pages/WorldsPage";
import { RouteParamsProvider } from "./router/RouteParamsContext";
import { useRouter } from "./router/RouterProvider";

type RouteDefinition = {
  path: string;
  element: ReactElement;
  protected?: boolean;
  layout?: "default" | "canvas";
};

type RouteMatch = RouteDefinition & {
  params: Record<string, string>;
};

const routes: RouteDefinition[] = [
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/worlds", element: <WorldsPage />, protected: true },
  {
    path: "/worlds/:worldId",
    element: <CanvasPage />,
    protected: true,
    layout: "canvas",
  },
];

const normalizePath = (value: string) => {
  if (value === "/") return "/";
  return value.replace(/\/+$/, "");
};

const matchPath = (pattern: string, pathname: string) => {
  const patternSegments = pattern === "/"
    ? []
    : pattern
        .split("/")
        .filter(Boolean);
  const pathSegments = pathname === "/"
    ? []
    : pathname
        .split("/")
        .filter(Boolean);

  if (patternSegments.length !== pathSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index];
    const pathSegment = pathSegments[index];

    if (patternSegment.startsWith(":")) {
      const key = patternSegment.slice(1);
      params[key] = decodeURIComponent(pathSegment);
      continue;
    }

    if (patternSegment !== pathSegment) {
      return null;
    }
  }

  return params;
};

function NotFoundPage() {
  const { navigate } = useRouter();

  return (
    <div className="not-found">
      <h1>Ops, esta página não existe.</h1>
      <p>Que tal voltar para a página inicial e explorar seus mundos?</p>
      <button type="button" onClick={() => navigate("/")}>Ir para a landing</button>
    </div>
  );
}

function App() {
  const { path, navigate } = useRouter();
  const { isAuthenticated } = useAuth();

  const normalizedPath = useMemo(() => normalizePath(path), [path]);

  const match = useMemo<RouteMatch | null>(() => {
    for (const route of routes) {
      const params = matchPath(route.path, normalizedPath);
      if (params) {
        return { ...route, params };
      }
    }
    return null;
  }, [normalizedPath]);

  useEffect(() => {
    if (!match) return;

    if (!isAuthenticated && match.protected) {
      navigate("/login", { replace: true, state: { from: normalizedPath } });
    }
  }, [isAuthenticated, match, navigate, normalizedPath]);

  useEffect(() => {
    if (match?.protected) return;
    if (!isAuthenticated) return;

    if (normalizedPath === "/login" || normalizedPath === "/register") {
      navigate("/worlds", { replace: true });
    }
  }, [isAuthenticated, match, navigate, normalizedPath]);

  const appShellClass = match?.layout === "canvas" ? "app-shell app-shell--canvas" : "app-shell";

  return (
    <div className={appShellClass}>
      {match ? (
        <RouteParamsProvider params={match.params}>{match.element}</RouteParamsProvider>
      ) : (
        <NotFoundPage />
      )}
    </div>
  );
}

export default App;
