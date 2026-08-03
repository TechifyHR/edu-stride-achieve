import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LessonType = "youtube" | "video" | "pdf" | "pptx" | "text" | "link";
export type CourseStatus = "draft" | "published" | "archived";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type AssigneeType = "employee" | "department" | "role" | "company" | "group";

export const listCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [courses, lessons, assignments] = await Promise.all([
      supabase
        .from("courses")
        .select(
          "id, title, description, category, difficulty, status, mandatory, passing_score, quiz_enabled, certificate_enabled, duration_minutes, thumbnail_url, created_at",
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("course_lessons")
        .select("id, course_id, title, type, order_index, content_url, youtube_video_id, text_body, min_watch_pct, duration_seconds")
        .is("deleted_at", null)
        .order("order_index"),
      supabase
        .from("course_assignments")
        .select("id, course_id, assignee_type, assignee_id, start_date, due_date, mandatory, reminder_frequency, assigned_at"),
    ]);
    if (courses.error) throw courses.error;
    return {
      courses: courses.data ?? [],
      lessons: lessons.data ?? [],
      assignments: assignments.data ?? [],
    };
  });

export const saveCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id?: string;
      title: string;
      description?: string | null;
      category?: string | null;
      difficulty?: Difficulty | null;
      status: CourseStatus;
      mandatory: boolean;
      passing_score?: number | null;
      quiz_enabled: boolean;
      certificate_enabled: boolean;
      duration_minutes?: number | null;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: caller } = await supabase
      .from("user_roles")
      .select("organization_id, role")
      .eq("user_id", userId)
      .maybeSingle();
    if (!caller || (caller.role !== "hr_admin" && caller.role !== "super_admin"))
      throw new Error("Only HR admins can manage courses");

    const payload = {
      title: data.title.trim(),
      description: data.description || null,
      category: data.category || null,
      difficulty: data.difficulty ?? null,
      status: data.status,
      mandatory: data.mandatory,
      passing_score: data.passing_score ?? null,
      quiz_enabled: data.quiz_enabled,
      certificate_enabled: data.certificate_enabled,
      duration_minutes: data.duration_minutes ?? null,
    };

    if (data.id) {
      const { error } = await supabase.from("courses").update(payload).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: created, error } = await supabase
      .from("courses")
      .insert({ ...payload, organization_id: caller.organization_id, created_by: userId })
      .select("id")
      .single();
    if (error) throw error;
    return { id: created.id };
  });

export const deleteCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("courses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const saveLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id?: string;
      course_id: string;
      title: string;
      type: LessonType;
      content_url?: string | null;
      youtube_video_id?: string | null;
      text_body?: string | null;
      min_watch_pct?: number | null;
      duration_seconds?: number | null;
      order_index: number;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const payload = {
      course_id: data.course_id,
      title: data.title.trim(),
      type: data.type,
      content_url: data.content_url || null,
      youtube_video_id: data.youtube_video_id || null,
      text_body: data.text_body || null,
      min_watch_pct: data.min_watch_pct ?? null,
      duration_seconds: data.duration_seconds ?? null,
      order_index: data.order_index,
    };
    if (data.id) {
      const { error } = await supabase.from("course_lessons").update(payload).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: created, error } = await supabase
      .from("course_lessons")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { id: created.id };
  });

export const deleteLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("course_lessons")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const reorderLessons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[] }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await Promise.all(
      data.ids.map((id, index) =>
        supabase.from("course_lessons").update({ order_index: index }).eq("id", id),
      ),
    );
    return { ok: true };
  });

export const setCourseStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: CourseStatus }) => d)
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./authz.server");
    await requireAdmin(context.supabase, context.userId, "publish courses");
    const { error } = await context.supabase
      .from("courses")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const assignCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      course_id: string;
      assignee_type: AssigneeType;
      assignee_ids: string[];
      start_date?: string | null;
      due_date?: string | null;
      mandatory?: boolean;
      reminder_frequency?: string | null;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireAdmin } = await import("./authz.server");
    const caller = await requireAdmin(supabase, userId, "assign courses");

    const targets = data.assignee_type === "company" ? [null] : data.assignee_ids;
    if (!targets.length) throw new Error("Pick at least one target");

    const rows = targets.map((assignee_id) => ({
      organization_id: caller.orgId,
      course_id: data.course_id,
      assignee_type: data.assignee_type,
      assignee_id,
      start_date: data.start_date || null,
      due_date: data.due_date || null,
      mandatory: data.mandatory ?? false,
      reminder_frequency: data.reminder_frequency || null,
      assigned_by: userId,
    }));
    const { error } = await supabase.from("course_assignments").insert(rows);
    if (error) throw error;
    return { count: rows.length };
  });


export const removeAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("course_assignments").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
