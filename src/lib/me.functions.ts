import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { permissionsFor } from "./permissions";
import type { AppRole } from "./roles";


export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [roleRes, empRes] = await Promise.all([
      supabase.from("user_roles").select("organization_id, role").eq("user_id", userId),
      supabase
        .from("employees")
        .select(
          "id, first_name, last_name, email, phone, avatar_url, employee_code, job_title, department_id, manager_id, employment_status, date_joined",
        )
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    if (!roleRes.data?.length) return null;

    const roles = roleRes.data.map((r) => r.role as AppRole);
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, logo_url, primary_color")
      .eq("id", roleRes.data[0].organization_id)
      .maybeSingle();

    return {
      userId,
      roles,
      isOwner: roles.includes("super_admin"),
      isAdmin: roles.some((r) => r === "super_admin" || r === "hr_admin"),
      isManager: roles.includes("manager"),
      organization: org,
      employee: empRes.data,
    };
  });
