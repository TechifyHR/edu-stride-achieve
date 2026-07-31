import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyAchievements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: employee } = await supabase
      .from("employees")
      .select("id, first_name, last_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (!employee)
      return { certificates: [], badges: [], coursesCompleted: 0, employeeName: "", organization: null };

    const [certs, earned, org] = await Promise.all([
      supabase
        .from("certificates")
        .select("id, certificate_number, issued_at, pdf_url, course_id")
        .eq("employee_id", employee.id)
        .order("issued_at", { ascending: false }),
      supabase
        .from("employee_badges")
        .select("id, earned_at, course_id, badge_id")
        .eq("employee_id", employee.id)
        .order("earned_at", { ascending: false }),
      supabase.from("organizations").select("name, logo_url").limit(1).maybeSingle(),
    ]);

    const courseIds = Array.from(
      new Set([
        ...(certs.data ?? []).map((c) => c.course_id),
        ...(earned.data ?? []).map((b) => b.course_id).filter(Boolean),
      ]),
    ) as string[];

    const [courses, badgeDefs] = await Promise.all([
      courseIds.length
        ? supabase.from("courses").select("id, title").in("id", courseIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
      (earned.data ?? []).length
        ? supabase
            .from("badges")
            .select("id, name, description, icon, color")
            .in("id", (earned.data ?? []).map((b) => b.badge_id))
        : Promise.resolve({ data: [] as { id: string; name: string; description: string | null; icon: string; color: string }[] }),
    ]);

    const courseTitle = new Map((courses.data ?? []).map((c) => [c.id, c.title]));
    const badgeById = new Map((badgeDefs.data ?? []).map((b) => [b.id, b]));

    const { count: completed } = await supabase
      .from("lesson_progress")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", employee.id)
      .not("completed_at", "is", null);


    return {
      employeeName: `${employee.first_name} ${employee.last_name}`,
      organization: org.data,
      coursesCompleted: (certs.data ?? []).length || completed || 0,
      certificates: (certs.data ?? []).map((c) => ({
        ...c,
        course_title: courseTitle.get(c.course_id) ?? "Course",
      })),
      badges: (earned.data ?? []).map((b) => ({
        id: b.id,
        earned_at: b.earned_at,
        course_title: b.course_id ? (courseTitle.get(b.course_id) ?? null) : null,
        ...(badgeById.get(b.badge_id) ?? { name: "Badge", description: null, icon: "award", color: "#1D7A3E" }),
      })),
    };
  });
