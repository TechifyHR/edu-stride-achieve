import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { AppRole } from "./roles";

export type Caller = {
  userId: string;
  orgId: string;
  roles: AppRole[];
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
    isOwner: roles.includes("super_admin"),
    isAdmin: roles.some((r) => r === "super_admin" || r === "hr_admin"),
    isManager: roles.includes("manager"),
  };
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
