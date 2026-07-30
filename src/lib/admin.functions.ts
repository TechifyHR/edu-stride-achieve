import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = "super_admin" | "hr_admin" | "manager" | "employee";
export type Gender = "male" | "female" | "other" | "undisclosed";

export const getAdminDirectory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [employees, departments, groups, members, roles, invites] = await Promise.all([
      supabase
        .from("employees")
        .select(
          "id, first_name, last_name, email, gender, job_title, employment_status, date_joined, department_id, user_id",
        )
        .is("deleted_at", null)
        .order("first_name"),
      supabase.from("departments").select("id, name").is("deleted_at", null).order("name"),
      supabase.from("user_groups").select("id, name, description").order("name"),
      supabase.from("user_group_members").select("group_id, employee_id"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("employee_invitations").select("id, employee_id, email, status, expires_at"),
    ]);

    if (employees.error) throw employees.error;

    return {
      employees: employees.data ?? [],
      departments: departments.data ?? [],
      groups: groups.data ?? [],
      members: members.data ?? [],
      roles: roles.data ?? [],
      invitations: invites.data ?? [],
    };
  });

export const createDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: role } = await supabase
      .from("user_roles")
      .select("organization_id, role")
      .eq("user_id", userId)
      .maybeSingle();
    if (!role || (role.role !== "hr_admin" && role.role !== "super_admin"))
      throw new Error("Only HR admins can add departments");
    const { data: dept, error } = await supabase
      .from("departments")
      .insert({ name: data.name.trim(), organization_id: role.organization_id })
      .select("id, name")
      .single();
    if (error) throw error;
    return dept;
  });

export const upsertPerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id?: string;
      first_name: string;
      last_name: string;
      email: string;
      gender?: Gender | null;
      job_title?: string | null;
      department_id?: string | null;
      role: AppRole;
      group_ids: string[];
      sendInvite: boolean;
      origin: string;
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
      throw new Error("Only HR admins can manage people");
    const orgId = caller.organization_id;
    const email = data.email.trim().toLowerCase();

    let employeeId = data.id;
    if (employeeId) {
      const { error } = await supabase
        .from("employees")
        .update({
          first_name: data.first_name.trim(),
          last_name: data.last_name.trim(),
          email,
          gender: data.gender ?? null,
          job_title: data.job_title || null,
          department_id: data.department_id || null,
        })
        .eq("id", employeeId);
      if (error) throw error;
    } else {
      const { data: created, error } = await supabase
        .from("employees")
        .insert({
          organization_id: orgId,
          first_name: data.first_name.trim(),
          last_name: data.last_name.trim(),
          email,
          gender: data.gender ?? null,
          job_title: data.job_title || null,
          department_id: data.department_id || null,
          employment_status: "active",
          date_joined: new Date().toISOString().slice(0, 10),
        })
        .select("id")
        .single();
      if (error) throw error;
      employeeId = created.id;
    }

    // sync group membership
    await supabase.from("user_group_members").delete().eq("employee_id", employeeId);
    if (data.group_ids.length) {
      const { error } = await supabase.from("user_group_members").insert(
        data.group_ids.map((g) => ({
          organization_id: orgId,
          group_id: g,
          employee_id: employeeId!,
        })),
      );
      if (error) throw error;
    }

    let inviteLink: string | null = null;
    let inviteError: string | null = null;

    const { data: employee } = await supabase
      .from("employees")
      .select("user_id")
      .eq("id", employeeId)
      .maybeSingle();

    if (data.sendInvite && !employee?.user_id) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const token = crypto.randomUUID().replace(/-/g, "");
      const redirectTo = `${data.origin}/invite?token=${token}`;

      const { data: invited, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        { redirectTo, data: { first_name: data.first_name, last_name: data.last_name } },
      );

      if (authError) {
        inviteError = authError.message;
      } else if (invited?.user) {
        await supabaseAdmin.from("employees").update({ user_id: invited.user.id }).eq("id", employeeId);
        await supabaseAdmin
          .from("user_roles")
          .upsert(
            { user_id: invited.user.id, organization_id: orgId, role: data.role },
            { onConflict: "user_id,organization_id,role" },
          );
        await supabaseAdmin.from("employee_invitations").insert({
          organization_id: orgId,
          employee_id: employeeId,
          email,
          role: data.role,
          token,
          invited_by: userId,
        });
        inviteLink = redirectTo;
      }
    } else if (employee?.user_id) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("user_roles")
        .update({ role: data.role })
        .eq("user_id", employee.user_id)
        .eq("organization_id", orgId);
    }

    return { id: employeeId, inviteLink, inviteError };
  });

export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { employeeId: string; origin: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: caller } = await supabase
      .from("user_roles")
      .select("organization_id, role")
      .eq("user_id", userId)
      .maybeSingle();
    if (!caller || (caller.role !== "hr_admin" && caller.role !== "super_admin"))
      throw new Error("Only HR admins can resend invites");

    const { data: employee } = await supabase
      .from("employees")
      .select("email")
      .eq("id", data.employeeId)
      .maybeSingle();
    if (!employee) throw new Error("Person not found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: employee.email,
      options: { redirectTo: `${data.origin}/invite` },
    });
    if (error) throw error;

    const { error: mailError } = await supabaseAdmin.auth.resetPasswordForEmail(employee.email, {
      redirectTo: `${data.origin}/invite`,
    });
    if (mailError) throw mailError;
    return { ok: true };
  });

export const setEmploymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "active" | "on_leave" | "terminated" }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("employees")
      .update({ employment_status: data.status })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const saveUserGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string; description?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: caller } = await supabase
      .from("user_roles")
      .select("organization_id, role")
      .eq("user_id", userId)
      .maybeSingle();
    if (!caller || (caller.role !== "hr_admin" && caller.role !== "super_admin"))
      throw new Error("Only HR admins can manage groups");

    if (data.id) {
      const { error } = await supabase
        .from("user_groups")
        .update({ name: data.name.trim(), description: data.description || null })
        .eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: created, error } = await supabase
      .from("user_groups")
      .insert({
        organization_id: caller.organization_id,
        name: data.name.trim(),
        description: data.description || null,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: created.id };
  });

export const deleteUserGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("user_groups").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const setGroupMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { groupId: string; employeeIds: string[] }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: caller } = await supabase
      .from("user_roles")
      .select("organization_id, role")
      .eq("user_id", userId)
      .maybeSingle();
    if (!caller || (caller.role !== "hr_admin" && caller.role !== "super_admin"))
      throw new Error("Only HR admins can manage groups");

    await supabase.from("user_group_members").delete().eq("group_id", data.groupId);
    if (data.employeeIds.length) {
      const { error } = await supabase.from("user_group_members").insert(
        data.employeeIds.map((e) => ({
          organization_id: caller.organization_id,
          group_id: data.groupId,
          employee_id: e,
        })),
      );
      if (error) throw error;
    }
    return { ok: true };
  });
