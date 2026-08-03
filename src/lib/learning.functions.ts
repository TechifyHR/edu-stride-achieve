import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Learner-facing data: assigned courses, lesson playback state, progress tracking
 * and automatic certificate issuing on completion.
 */

async function loadEmployee(supabase: any, userId: string) {
  const { data } = await supabase
    .from("employees")
    .select("id, organization_id, first_name, last_name, department_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data as
    | {
        id: string;
        organization_id: string;
        first_name: string;
        last_name: string;
        department_id: string | null;
      }
    | null;
}

export const getMyLearning = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const employee = await loadEmployee(supabase, userId);
    if (!employee) return { employee: null, courses: [] };

    const [{ data: groups }, { data: assignments }] = await Promise.all([
      supabase.from("user_group_members").select("group_id").eq("employee_id", employee.id),
      supabase
        .from("course_assignments")
        .select("id, course_id, assignee_type, assignee_id, start_date, due_date, mandatory"),
    ]);

    const groupIds = new Set((groups ?? []).map((g: any) => g.group_id));
    const mine = (assignments ?? []).filter((a: any) => {
      if (a.assignee_type === "company") return true;
      if (a.assignee_type === "employee") return a.assignee_id === employee.id;
      if (a.assignee_type === "department") return a.assignee_id === employee.department_id;
      if (a.assignee_type === "group") return groupIds.has(a.assignee_id);
      return false;
    });

    const courseIds = Array.from(new Set(mine.map((a: any) => a.course_id)));
    if (!courseIds.length) return { employee, courses: [] };

    const [{ data: courses }, { data: lessons }, { data: progress }, { data: certs }] =
      await Promise.all([
        supabase
          .from("courses")
          .select(
            "id, title, description, category, difficulty, status, duration_minutes, certificate_enabled, thumbnail_url",
          )
          .in("id", courseIds)
          .eq("status", "published")
          .is("deleted_at", null),
        supabase
          .from("course_lessons")
          .select(
            "id, course_id, title, type, order_index, content_url, youtube_video_id, text_body, min_watch_pct, duration_seconds",
          )
          .in("course_id", courseIds)
          .is("deleted_at", null)
          .order("order_index"),
        supabase
          .from("lesson_progress")
          .select("lesson_id, completion_pct, completed_at, last_position")
          .eq("employee_id", employee.id),
        supabase.from("certificates").select("id, course_id").eq("employee_id", employee.id),
      ]);

    const byCourse = new Map<string, any>();
    (courses ?? []).forEach((c: any) => byCourse.set(c.id, { ...c, lessons: [] }));
    (lessons ?? []).forEach((l: any) => byCourse.get(l.course_id)?.lessons.push(l));

    const assignmentByCourse = new Map(mine.map((a: any) => [a.course_id, a]));
    const certByCourse = new Set((certs ?? []).map((c: any) => c.course_id));

    return {
      employee,
      progress: progress ?? [],
      courses: Array.from(byCourse.values()).map((c) => ({
        ...c,
        assignment: assignmentByCourse.get(c.id) ?? null,
        hasCertificate: certByCourse.has(c.id),
      })),
    };
  });

export const saveLessonProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { lesson_id: string; completion_pct: number; position?: number | null }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const employee = await loadEmployee(supabase, userId);
    if (!employee) throw new Error("No employee record");

    const pct = Math.max(0, Math.min(100, Math.round(data.completion_pct)));
    const { data: existing } = await supabase
      .from("lesson_progress")
      .select("id, completion_pct, completed_at")
      .eq("employee_id", employee.id)
      .eq("lesson_id", data.lesson_id)
      .maybeSingle();

    const best = Math.max(pct, existing?.completion_pct ?? 0);
    const payload = {
      employee_id: employee.id,
      lesson_id: data.lesson_id,
      completion_pct: best,
      last_position: data.position ?? null,
      started_at: existing ? undefined : new Date().toISOString(),
      completed_at: best >= 100 ? (existing?.completed_at ?? new Date().toISOString()) : null,
    };

    const { error } = await supabase
      .from("lesson_progress")
      .upsert(payload, { onConflict: "employee_id,lesson_id" });
    if (error) throw error;
    return { completion_pct: best };
  });

export const getLessonMediaUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("course-media")
      .createSignedUrl(data.path, 60 * 60);
    if (error) throw error;
    return { url: signed?.signedUrl ?? null };
  });

/** Issues a certificate once every lesson of the course is complete. */
export const claimCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { course_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const employee = await loadEmployee(supabase, userId);
    if (!employee) throw new Error("No employee record");

    const { data: course } = await supabase
      .from("courses")
      .select("id, title, certificate_enabled")
      .eq("id", data.course_id)
      .maybeSingle();
    if (!course) throw new Error("Course not found");

    const { data: lessons } = await supabase
      .from("course_lessons")
      .select("id")
      .eq("course_id", data.course_id)
      .is("deleted_at", null);
    const lessonIds = (lessons ?? []).map((l: any) => l.id);
    if (!lessonIds.length) throw new Error("This course has no lessons yet");

    const { data: done } = await supabase
      .from("lesson_progress")
      .select("lesson_id")
      .eq("employee_id", employee.id)
      .in("lesson_id", lessonIds)
      .not("completed_at", "is", null);
    if ((done ?? []).length < lessonIds.length)
      throw new Error("Finish every lesson to earn your certificate");

    const { data: existing } = await supabase
      .from("certificates")
      .select("id, certificate_number, issued_at")
      .eq("employee_id", employee.id)
      .eq("course_id", data.course_id)
      .maybeSingle();
    if (existing) return existing;

    const number = `PH-${new Date().getFullYear()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    const { data: created, error } = await supabase
      .from("certificates")
      .insert({
        organization_id: employee.organization_id,
        employee_id: employee.id,
        course_id: data.course_id,
        certificate_number: number,
      })
      .select("id, certificate_number, issued_at")
      .single();
    if (error) throw error;
    return created;
  });

export const listOrgCertificates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("certificates")
      .select("id, certificate_number, issued_at, course_id, employee_id")
      .order("issued_at", { ascending: false });
    if (error) throw error;

    const rows = data ?? [];
    if (!rows.length) return [];
    const [{ data: emps }, { data: courses }, { data: org }] = await Promise.all([
      supabase.from("employees").select("id, first_name, last_name, email").in(
        "id",
        rows.map((r) => r.employee_id),
      ),
      supabase.from("courses").select("id, title").in(
        "id",
        rows.map((r) => r.course_id),
      ),
      supabase.from("organizations").select("name, logo_url").limit(1).maybeSingle(),
    ]);
    const empById = new Map((emps ?? []).map((e: any) => [e.id, e]));
    const courseById = new Map((courses ?? []).map((c: any) => [c.id, c]));
    return rows.map((r) => ({
      ...r,
      employee_name: empById.get(r.employee_id)
        ? `${empById.get(r.employee_id).first_name} ${empById.get(r.employee_id).last_name}`
        : "—",
      course_title: courseById.get(r.course_id)?.title ?? "—",
      organization_name: org?.name ?? "",
      organization_logo: org?.logo_url ?? null,
    }));
  });
