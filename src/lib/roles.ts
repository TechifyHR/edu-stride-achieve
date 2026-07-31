// Client-safe role helpers shared across the app.
// `super_admin` is the Workspace Owner — the highest permission level in an organization.
export type AppRole = "super_admin" | "hr_admin" | "manager" | "employee";

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Workspace Owner",
  hr_admin: "Admin",
  manager: "Manager",
  employee: "Employee",
};

export type ViewMode = "employee" | "admin" | "manager";

export const VIEW_LABELS: Record<ViewMode, string> = {
  employee: "Employee View",
  admin: "Admin View",
  manager: "Manager View",
};

export function isAdminRole(roles: AppRole[] | undefined) {
  return !!roles?.some((r) => r === "super_admin" || r === "hr_admin");
}
export function isOwnerRole(roles: AppRole[] | undefined) {
  return !!roles?.includes("super_admin");
}
export function isManagerRole(roles: AppRole[] | undefined) {
  return !!roles?.includes("manager");
}

export function availableViews(roles: AppRole[] | undefined): ViewMode[] {
  const views: ViewMode[] = ["employee"];
  if (isManagerRole(roles)) views.push("manager");
  if (isAdminRole(roles)) views.push("admin");
  return views;
}
