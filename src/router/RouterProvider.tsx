import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type NavigateOptions = {
  replace?: boolean;
  state?: unknown;
};

type RouterContextValue = {
  path: string;
  navigate: (to: string, options?: NavigateOptions) => void;
  state: unknown;
};

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

const getInitialPath = () =>
  typeof window !== "undefined" ? window.location.pathname : "/";

const getInitialState = () =>
  typeof window !== "undefined" ? window.history.state?.state ?? null : null;

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState<string>(() => getInitialPath());
  const [locationState, setLocationState] = useState<unknown>(() =>
    getInitialState()
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = (event: PopStateEvent) => {
      setPath(window.location.pathname);
      setLocationState(event.state?.state ?? null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((to: string, options?: NavigateOptions) => {
    if (typeof window === "undefined") return;

    const { replace = false, state } = options ?? {};
    const nextState = state ?? null;

    if (replace) {
      window.history.replaceState({ state: nextState }, "", to);
    } else {
      window.history.pushState({ state: nextState }, "", to);
    }

    setPath(window.location.pathname);
    setLocationState(nextState);
  }, []);

  const value = useMemo<RouterContextValue>(
    () => ({
      path,
      navigate,
      state: locationState,
    }),
    [path, navigate, locationState]
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter deve ser usado dentro de um RouterProvider");
  }
  return context;
}
