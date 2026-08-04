// Client-safe RBAC layer. Every permission decision in the app derives from
// this file — no feature should ever hard-code a role name.
export type AppRole = "super_admin" | "hr_admin" | "manager" | "employee";

export const PERMISSION_KEYS = [
  "canManageOrganization",
  "canManagePeople",
  "canBulkImport",
  "canManageGroups",
  "canManageDepartments",
  "canManageRoles",
  "canCreateCourse",
  "canEditCourse",
  "canDeleteCourse",
  "canPublishCourse",
  "canManageQuiz",
  "canAssignCourse",
  "canViewReports",
  "canLearn",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];
export type Permissions = Record<PermissionKey, boolean>;

// Which roles grant each permission. Workspace Owner (super_admin) and
// Admin (hr_admin) share operational rights; ownership-only actions are
// restricted to super_admin.
const MATRIX: Record<PermissionKey, AppRole[]> = {
  canManageOrganization: ["super_admin"],
  canManagePeople: ["super_admin", "hr_admin"],
  canBulkImport: ["super_admin", "hr_admin"],
  canManageGroups: ["super_admin", "hr_admin"],
  canManageDepartments: ["super_admin", "hr_admin"],
  canManageRoles: ["super_admin", "hr_admin"],
  canCreateCourse: ["super_admin", "hr_admin"],
  canEditCourse: ["super_admin", "hr_admin"],
  canDeleteCourse: ["super_admin", "hr_admin"],
  canPublishCourse: ["super_admin", "hr_admin"],
  canManageQuiz: ["super_admin", "hr_admin"],
  canAssignCourse: ["super_admin", "hr_admin", "manager"],
  canViewReports: ["super_admin", "hr_admin", "manager"],
  canLearn: ["super_admin", "hr_admin", "manager", "employee"],
};

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  canManageOrganization: "manage organization settings",
  canManagePeople: "manage people",
  canBulkImport: "import people",
  canManageGroups: "manage groups",
  canManageDepartments: "manage departments",
  canManageRoles: "assign roles",
  canCreateCourse: "create courses",
  canEditCourse: "edit courses",
  canDeleteCourse: "delete courses",
  canPublishCourse: "publish courses",
  canManageQuiz: "manage quizzes",
  canAssignCourse: "assign courses",
  canViewReports: "view reports",
  canLearn: "access learning",
};

export function can(roles: AppRole[] | undefined, key: PermissionKey): boolean {
  const list = roles ?? [];
  return MATRIX[key].some((r) => list.includes(r));
}

export function permissionsFor(roles: AppRole[] | undefined): Permissions {
  return PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = can(roles, key);
    return acc;
  }, {} as Permissions);
}

export const NO_PERMISSIONS: Permissions = permissionsFor([]);
