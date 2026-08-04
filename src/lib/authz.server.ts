import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { AppRole } from "./roles";
import {
  PERMISSION_LABELS,
  permissionsFor,
  type PermissionKey,
  type Permissions,
} from "./permissions";

export type Caller = {
  userId: string;
  orgId: string;
  roles: AppRole[];
  permissions: Permissions;
  isOwner: boolean;
  isAdmin: boolean;
  isManager: boolean;
};

export async function getCaller(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Caller> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("organization_id, role")
    .eq("user_id", userId);
  if (error) throw error;
  if (!data?.length) throw new Error("You do not belong to a workspace yet");

  const roles = data.map((r) => r.role as AppRole);
  return {
    userId,
    orgId: data[0].organization_id,
    roles,
    permissions: permissionsFor(roles),
    isOwner: roles.includes("super_admin"),
    isAdmin: roles.some((r) => r === "super_admin" || r === "hr_admin"),
    isManager: roles.includes("manager"),
  };
}

export async function requirePermission(
  supabase: SupabaseClient<Database>,
  userId: string,
  key: PermissionKey,
  action?: string,
): Promise<Caller> {
  const caller = await getCaller(supabase, userId);
  if (!caller.permissions[key]) {
    throw new Error(`You do not have permission to ${action ?? PERMISSION_LABELS[key]}`);
  }
  return caller;
}

export async function requireAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
  action = "perform this action",
): Promise<Caller> {
  const caller = await getCaller(supabase, userId);
  if (!caller.isAdmin) throw new Error(`You need administrator permissions to ${action}`);
  return caller;
}

export async function requireOwner(
  supabase: SupabaseClient<Database>,
  userId: string,
  action = "perform this action",
): Promise<Caller> {
  const caller = await getCaller(supabase, userId);
  if (!caller.isOwner) throw new Error(`Only the workspace owner can ${action}`);
  return caller;
}

/**
 * Employee ids a manager is allowed to act on: their direct reports plus
 * everyone in the departments they manage.
 */
export async function managerScopeEmployeeIds(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ employeeIds: string[]; departmentIds: string[] }> {
  const { data: self } = await supabase
    .from("employees")
    .select("id, department_id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!self) return { employeeIds: [], departmentIds: [] };

  const departmentIds = self.department_id ? [self.department_id] : [];
  const { data: team } = await supabase
    .from("employees")
    .select("id, manager_id, department_id")
    .is("deleted_at", null);

  const employeeIds = (team ?? [])
    .filter(
      (e) =>
        e.manager_id === self.id ||
        (!!self.department_id && e.department_id === self.department_id),
    )
    .map((e) => e.id);

  return { employeeIds, departmentIds };
}
