import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole } from "./roles";

export type { AppRole };
export type Gender = "male" | "female" | "other" | "undisclosed";
export type EmploymentStatus = "active" | "on_leave" | "terminated";

export type PersonInput = {
  id?: string;
  employee_code?: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  gender?: Gender | null;
  job_title?: string | null;
  department_id?: string | null;
  manager_id?: string | null;
  employment_status?: EmploymentStatus;
  date_joined?: string | null;
  roles: AppRole[];
  group_ids: string[];
  sendInvite: boolean;
  origin: string;
};

/* ------------------------------- directory ------------------------------- */

export const getAdminDirectory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [employees, departments, groups, members, roles, invites] = await Promise.all([
      supabase
        .from("employees")
        .select(
          "id, employee_code, first_name, last_name, email, phone, gender, job_title, employment_status, date_joined, department_id, manager_id, avatar_url, user_id",
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

/* ------------------------------ departments ------------------------------ */

export const createDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string }) => d)
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./authz.server");
    const caller = await requireAdmin(context.supabase, context.userId, "manage departments");
    if (data.id) {
      const { data: updated, error } = await context.supabase
        .from("departments")
        .update({ name: data.name.trim() })
        .eq("id", data.id)
        .select("id, name")
        .single();
      if (error) throw error;
      return updated;
    }
    const { data: dept, error } = await context.supabase
      .from("departments")
      .insert({ name: data.name.trim(), organization_id: caller.orgId })
      .select("id, name")
      .single();
    if (error) throw error;
    return dept;
  });

export const deleteDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./authz.server");
    await requireAdmin(context.supabase, context.userId, "manage departments");
    const { error } = await context.supabase
      .from("departments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* --------------------------------- people -------------------------------- */

async function syncRoles(
  admin: typeof import("@/integrations/supabase/client.server").supabaseAdmin,
  authUserId: string,
  orgId: string,
  roles: AppRole[],
  callerIsOwner: boolean,
) {
  const { data: existing } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", authUserId)
    .eq("organization_id", orgId);
  const current = (existing ?? []).map((r) => r.role as AppRole);

  // The workspace owner role can never be granted or removed through this path.
  if (current.includes("super_admin")) return;

  let next = Array.from(new Set<AppRole>([...roles, "employee"]));
  if (!callerIsOwner) {
    // Regular admins cannot change admin rights.
    next = current.includes("hr_admin")
      ? Array.from(new Set<AppRole>([...next, "hr_admin"]))
      : next.filter((r) => r !== "hr_admin");
  }

  const toAdd = next.filter((r) => !current.includes(r));
  const toRemove = current.filter((r) => !next.includes(r) && r !== "super_admin");

  if (toAdd.length)
    await admin
      .from("user_roles")
      .insert(toAdd.map((role) => ({ user_id: authUserId, organization_id: orgId, role })));
  if (toRemove.length)
    await admin
      .from("user_roles")
      .delete()
      .eq("user_id", authUserId)
      .eq("organization_id", orgId)
      .in("role", toRemove);
}

export const upsertPerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: PersonInput) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireAdmin } = await import("./authz.server");
    const caller = await requireAdmin(supabase, userId, "manage people");
    const orgId = caller.orgId;
    const email = data.email.trim().toLowerCase();

    const base = {
      employee_code: data.employee_code || null,
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      email,
      phone: data.phone || null,
      gender: data.gender ?? null,
      job_title: data.job_title || null,
      department_id: data.department_id || null,
      manager_id: data.manager_id || null,
      employment_status: data.employment_status ?? ("active" as EmploymentStatus),
      date_joined: data.date_joined || new Date().toISOString().slice(0, 10),
    };

    let employeeId = data.id;
    if (employeeId) {
      const { error } = await supabase.from("employees").update(base).eq("id", employeeId);
      if (error) throw error;
    } else {
      const { data: created, error } = await supabase
        .from("employees")
        .insert({ ...base, organization_id: orgId })
        .select("id")
        .single();
      if (error) throw error;
      employeeId = created.id;
    }

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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (employee?.user_id) {
      await syncRoles(supabaseAdmin, employee.user_id, orgId, data.roles, caller.isOwner);
    } else if (data.sendInvite) {
      const token = crypto.randomUUID().replace(/-/g, "");
      const redirectTo = `${data.origin}/invite?token=${token}`;

      const { data: invited, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo,
          data: {
            first_name: data.first_name,
            last_name: data.last_name,
            invited_org: orgId,
          },
        },
      );

      if (authError) {
        inviteError = authError.message;
      } else if (invited?.user) {
        await supabaseAdmin.from("employees").update({ user_id: invited.user.id }).eq("id", employeeId);
        const roles = Array.from(new Set<AppRole>([...data.roles, "employee"])).filter(
          (r) => r !== "super_admin" && (caller.isOwner || r !== "hr_admin"),
        );
        await supabaseAdmin
          .from("user_roles")
          .upsert(
            roles.map((role) => ({ user_id: invited.user!.id, organization_id: orgId, role })),
            { onConflict: "user_id,organization_id,role" },
          );
        await supabaseAdmin.from("employee_invitations").insert({
          organization_id: orgId,
          employee_id: employeeId,
          email,
          role: data.roles[0] ?? "employee",
          token,
          invited_by: userId,
        });
        inviteLink = redirectTo;
      }
    }

    return { id: employeeId, inviteLink, inviteError };
  });

export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { employeeId: string; origin: string }) => d)
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./authz.server");
    const caller = await requireAdmin(context.supabase, context.userId, "resend invitations");

    const { data: employee } = await context.supabase
      .from("employees")
      .select("email, user_id, first_name, last_name")
      .eq("id", data.employeeId)
      .maybeSingle();
    if (!employee) throw new Error("Person not found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const redirectTo = `${data.origin}/invite`;

    if (employee.user_id) {
      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(employee.email, { redirectTo });
      if (error) throw error;
      return { ok: true, mode: "reset" as const };
    }

    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(employee.email, {
      redirectTo,
      data: {
        first_name: employee.first_name,
        last_name: employee.last_name,
        invited_org: caller.orgId,
      },
    });
    if (error) throw error;
    if (invited?.user) {
      await supabaseAdmin.from("employees").update({ user_id: invited.user.id }).eq("id", data.employeeId);
      await supabaseAdmin
        .from("user_roles")
        .upsert(
          [{ user_id: invited.user.id, organization_id: caller.orgId, role: "employee" as AppRole }],
          { onConflict: "user_id,organization_id,role" },
        );
    }
    return { ok: true, mode: "invite" as const };
  });

export const resetEmployeePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { employeeId: string; origin: string }) => d)
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./authz.server");
    await requireAdmin(context.supabase, context.userId, "reset passwords");
    const { data: employee } = await context.supabase
      .from("employees")
      .select("email")
      .eq("id", data.employeeId)
      .maybeSingle();
    if (!employee) throw new Error("Person not found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(employee.email, {
      redirectTo: `${data.origin}/invite`,
    });
    if (error) throw error;
    return { ok: true };
  });

export const setEmploymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: EmploymentStatus }) => d)
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./authz.server");
    await requireAdmin(context.supabase, context.userId, "change employment status");
    const { error } = await context.supabase
      .from("employees")
      .update({ employment_status: data.status })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./authz.server");
    const caller = await requireAdmin(context.supabase, context.userId, "remove people");

    const { data: employee } = await context.supabase
      .from("employees")
      .select("user_id")
      .eq("id", data.id)
      .maybeSingle();

    if (employee?.user_id) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", employee.user_id)
        .eq("organization_id", caller.orgId);
      if ((roles ?? []).some((r) => r.role === "super_admin"))
        throw new Error("The workspace owner cannot be removed");
    }

    const { error } = await context.supabase
      .from("employees")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* ------------------------------ bulk import ------------------------------ */

export type BulkRow = {
  employee_code?: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  department?: string | null;
  job_title?: string | null;
  manager_email?: string | null;
  employment_status?: string | null;
  date_joined?: string | null;
  role?: string | null;
};

export const bulkImportEmployees = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { rows: BulkRow[]; sendInvites: boolean; origin: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireAdmin } = await import("./authz.server");
    const caller = await requireAdmin(supabase, userId, "import people");
    const orgId = caller.orgId;

    const [{ data: depts }, { data: existing }] = await Promise.all([
      supabase.from("departments").select("id, name").is("deleted_at", null),
      supabase.from("employees").select("id, email").is("deleted_at", null),
    ]);

    const deptByName = new Map((depts ?? []).map((d) => [d.name.toLowerCase(), d.id]));
    const existingEmails = new Set((existing ?? []).map((e) => e.email.toLowerCase()));

    const errors: { row: number; email: string; message: string }[] = [];
    let created = 0;
    let invited = 0;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    for (let i = 0; i < data.rows.length; i++) {
      const r = data.rows[i];
      const email = (r.email ?? "").trim().toLowerCase();
      try {
        if (!r.first_name?.trim() || !r.last_name?.trim() || !email) {
          throw new Error("First name, last name and email are required");
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Invalid email address");
        if (existingEmails.has(email)) throw new Error("Duplicate — already in the directory");

        let departmentId: string | null = null;
        const deptName = r.department?.trim();
        if (deptName) {
          const key = deptName.toLowerCase();
          if (!deptByName.has(key)) {
            const { data: newDept, error } = await supabase
              .from("departments")
              .insert({ name: deptName, organization_id: orgId })
              .select("id")
              .single();
            if (error) throw error;
            deptByName.set(key, newDept.id);
          }
          departmentId = deptByName.get(key)!;
        }

        const status = ["active", "on_leave", "terminated"].includes(
          (r.employment_status ?? "").trim().toLowerCase().replace(/\s+/g, "_"),
        )
          ? ((r.employment_status ?? "").trim().toLowerCase().replace(/\s+/g, "_") as EmploymentStatus)
          : "active";

        const { data: emp, error } = await supabase
          .from("employees")
          .insert({
            organization_id: orgId,
            employee_code: r.employee_code?.trim() || null,
            first_name: r.first_name.trim(),
            last_name: r.last_name.trim(),
            email,
            phone: r.phone?.trim() || null,
            job_title: r.job_title?.trim() || null,
            department_id: departmentId,
            employment_status: status,
            date_joined: r.date_joined?.trim() || new Date().toISOString().slice(0, 10),
          })
          .select("id")
          .single();
        if (error) throw error;

        existingEmails.add(email);
        created++;

        if (data.sendInvites) {
          const { data: inv, error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${data.origin}/invite`,
            data: { first_name: r.first_name, last_name: r.last_name, invited_org: orgId },
          });
          if (invErr) {
            errors.push({ row: i + 1, email, message: `Added, but invite failed: ${invErr.message}` });
          } else if (inv?.user) {
            await supabaseAdmin.from("employees").update({ user_id: inv.user.id }).eq("id", emp.id);
            const wanted: AppRole[] = ["employee"];
            const wantedRole = (r.role ?? "").trim().toLowerCase();
            if (wantedRole === "manager") wanted.push("manager");
            if (wantedRole === "admin" && caller.isOwner) wanted.push("hr_admin");
            await supabaseAdmin
              .from("user_roles")
              .upsert(
                wanted.map((role) => ({ user_id: inv.user!.id, organization_id: orgId, role })),
                { onConflict: "user_id,organization_id,role" },
              );
            invited++;
          }
        }
      } catch (e) {
        errors.push({ row: i + 1, email, message: (e as Error).message });
      }
    }

    // Link managers by email once everyone exists.
    const managerRows = data.rows.filter((r) => r.manager_email?.trim());
    if (managerRows.length) {
      const { data: all } = await supabase
        .from("employees")
        .select("id, email")
        .is("deleted_at", null);
      const byEmail = new Map((all ?? []).map((e) => [e.email.toLowerCase(), e.id]));
      for (const r of managerRows) {
        const self = byEmail.get((r.email ?? "").trim().toLowerCase());
        const mgr = byEmail.get((r.manager_email ?? "").trim().toLowerCase());
        if (self && mgr && self !== mgr) {
          await supabase.from("employees").update({ manager_id: mgr }).eq("id", self);
        }
      }
    }

    return { created, invited, failed: errors.length, errors };
  });

/* -------------------------------- groups --------------------------------- */

export const saveUserGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string; description?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./authz.server");
    const caller = await requireAdmin(context.supabase, context.userId, "manage groups");

    if (data.id) {
      const { error } = await context.supabase
        .from("user_groups")
        .update({ name: data.name.trim(), description: data.description || null })
        .eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: created, error } = await context.supabase
      .from("user_groups")
      .insert({
        organization_id: caller.orgId,
        name: data.name.trim(),
        description: data.description || null,
        created_by: context.userId,
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
    const { requireAdmin } = await import("./authz.server");
    await requireAdmin(context.supabase, context.userId, "manage groups");
    const { error } = await context.supabase.from("user_groups").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const setGroupMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { groupId: string; employeeIds: string[] }) => d)
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("./authz.server");
    const caller = await requireAdmin(context.supabase, context.userId, "manage groups");

    await context.supabase.from("user_group_members").delete().eq("group_id", data.groupId);
    if (data.employeeIds.length) {
      const { error } = await context.supabase.from("user_group_members").insert(
        data.employeeIds.map((e) => ({
          organization_id: caller.orgId,
          group_id: data.groupId,
          employee_id: e,
        })),
      );
      if (error) throw error;
    }
    return { ok: true };
  });
