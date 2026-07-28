import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getHrDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const today = new Date().toISOString().slice(0, 10);

    const [assignments, certs, employees, courses] = await Promise.all([
      supabase.from("course_assignments").select("id, due_date", { count: "exact", head: false }),
      supabase.from("certificates").select("id, issued_at, course_id, employee_id").order("issued_at", { ascending: false }).limit(5),
      supabase.from("employees").select("id", { count: "exact", head: true }),
      supabase.from("courses").select("id", { count: "exact", head: true }).eq("status", "published"),
    ]);

    const assigned = assignments.data?.length ?? 0;
    const overdue = (assignments.data ?? []).filter((a) => a.due_date && a.due_date < today).length;

    return {
      assigned,
      overdue,
      certificatesCount: certs.data?.length ?? 0,
      employees: employees.count ?? 0,
      publishedCourses: courses.count ?? 0,
      recentCertificates: certs.data ?? [],
    };
  });

export const getEmployeeDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!employee) {
      return { assigned: 0, inProgress: 0, completed: 0, certificates: 0, continueLearning: [] };
    }

    const [progress, certs] = await Promise.all([
      supabase.from("lesson_progress").select("id, completion_pct, completed_at").eq("employee_id", employee.id),
      supabase.from("certificates").select("id").eq("employee_id", employee.id),
    ]);

    const rows = progress.data ?? [];
    return {
      assigned: rows.length,
      inProgress: rows.filter((r) => (r.completion_pct ?? 0) > 0 && !r.completed_at).length,
      completed: rows.filter((r) => r.completed_at).length,
      certificates: certs.data?.length ?? 0,
      continueLearning: [],
    };
  });
