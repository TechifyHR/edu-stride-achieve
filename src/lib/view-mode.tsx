import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { availableViews, type AppRole, type ViewMode } from "./roles";

const STORAGE_KEY = "peohub.view";

type Ctx = {
  view: ViewMode;
  setView: (v: ViewMode) => void;
  views: ViewMode[];
};

const ViewModeContext = createContext<Ctx>({
  view: "employee",
  setView: () => {},
  views: ["employee"],
});

export function ViewModeProvider({
  roles,
  children,
}: {
  roles: AppRole[] | undefined;
  children: ReactNode;
}) {
  // Always start on the Employee view — never auto-open Admin View after login.
  const [view, setViewState] = useState<ViewMode>("employee");
  const views = useMemo(() => availableViews(roles), [roles]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem(STORAGE_KEY) as ViewMode | null;
    if (stored && views.includes(stored)) setViewState(stored);
    else if (!views.includes(view)) setViewState("employee");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views.join(",")]);

  const setView = (v: ViewMode) => {
    setViewState(v);
    if (typeof window !== "undefined") window.sessionStorage.setItem(STORAGE_KEY, v);
  };

  return (
    <ViewModeContext.Provider value={{ view: views.includes(view) ? view : "employee", setView, views }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export const useViewMode = () => useContext(ViewModeContext);
