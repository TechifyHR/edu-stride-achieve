import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotificationPrefs = {
  new_course: boolean;
  course_reminder: boolean;
  due_date: boolean;
  overdue_course: boolean;
  course_completed: boolean;
  certificate_ready: boolean;
  badge_earned: boolean;
  announcements: boolean;
};

export const NOTIFICATION_KEYS: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  { key: "new_course", label: "New course", hint: "A course is assigned to you" },
  { key: "course_reminder", label: "Course reminder", hint: "Nudges while a course is in progress" },
  { key: "due_date", label: "Due date", hint: "Ahead of a course deadline" },
  { key: "overdue_course", label: "Overdue course", hint: "A deadline has passed" },
  { key: "course_completed", label: "Course completed", hint: "You finish a course" },
  { key: "certificate_ready", label: "Certificate ready", hint: "A certificate is issued to you" },
  { key: "badge_earned", label: "Badge earned", hint: "You unlock a new badge" },
  { key: "announcements", label: "Platform announcements", hint: "Product news and workspace notices" },
];

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: employee } = await supabase
      .from("employees")
      .select(
        "id, employee_code, first_name, last_name, email, phone, avatar_url, job_title, department_id, manager_id, employment_status, date_joined",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (!employee) return { employee: null, department: null, manager: null, prefs: null };

    const [dept, manager, prefs] = await Promise.all([
      employee.department_id
        ? supabase.from("departments").select("name").eq("id", employee.department_id).maybeSingle()
        : Promise.resolve({ data: null }),
      employee.manager_id
        ? supabase
            .from("employees")
            .select("first_name, last_name")
            .eq("id", employee.manager_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    return {
      employee,
      department: dept.data?.name ?? null,
      manager: manager.data ? `${manager.data.first_name} ${manager.data.last_name}` : null,
      prefs: (prefs.data as (NotificationPrefs & { id: string }) | null) ?? null,
    };
  });

export const updateAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { avatar_url: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("employees")
      .update({ avatar_url: data.avatar_url })
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const saveNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<NotificationPrefs>) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notification_preferences")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true };
  });
