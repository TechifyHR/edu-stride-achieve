import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("employees")
      .select("id, first_name, last_name, email, job_title, employment_status, date_joined, department_id")
      .is("deleted_at", null)
      .order("first_name");
    if (error) throw error;
    return data ?? [];
  });
