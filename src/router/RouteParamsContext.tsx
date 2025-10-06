import { createContext, useContext, type ReactNode } from "react";

type RouteParams = Record<string, string>;

const RouteParamsContext = createContext<RouteParams>({});

export function RouteParamsProvider({
  params,
  children,
}: {
  params: RouteParams;
  children: ReactNode;
}) {
  return (
    <RouteParamsContext.Provider value={params}>
      {children}
    </RouteParamsContext.Provider>
  );
}

export function useRouteParams() {
  return useContext(RouteParamsContext);
}
