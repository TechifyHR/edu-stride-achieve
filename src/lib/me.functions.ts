import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [roleRes, empRes] = await Promise.all([
      supabase.from("user_roles").select("organization_id, role").eq("user_id", userId).maybeSingle(),
      supabase.from("employees").select("id, first_name, last_name, email").eq("user_id", userId).maybeSingle(),
    ]);
    if (!roleRes.data) return null;
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, logo_url, primary_color")
      .eq("id", roleRes.data.organization_id)
      .maybeSingle();
    return {
      userId,
      role: roleRes.data.role as "super_admin" | "hr_admin" | "manager" | "employee",
      organization: org,
      employee: empRes.data,
    };
  });
