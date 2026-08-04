import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getAdminDirectory,
  upsertPerson,
  createDepartment,
  resendInvite,
  setEmploymentStatus,
  type AppRole,
  type Gender,
} from "@/lib/admin.functions";
import { getMe } from "@/lib/me.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, UserPlus, MoreHorizontal, Mail, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/employees")({
  head: () => ({
    meta: [
      { title: "People — TechifyHR LMS" },
      { name: "description", content: "Add people, set their role, department and user groups." },
    ],
  }),
  component: EmployeesPage,
});

const ROLES: { value: AppRole; label: string }[] = [
  { value: "hr_admin", label: "HR Admin" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
];
const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "undisclosed", label: "Prefer not to say" },
];

type PersonForm = {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  gender: Gender | "";
  job_title: string;
  department_id: string;
  role: AppRole;
  group_ids: string[];
};

const emptyForm: PersonForm = {
  first_name: "",
  last_name: "",
  email: "",
  gender: "",
  job_title: "",
  department_id: "",
  role: "employee",
  group_ids: [],
};

function EmployeesPage() {
  const qc = useQueryClient();
  const dirFn = useServerFn(getAdminDirectory);
  const meFn = useServerFn(getMe);
  const saveFn = useServerFn(upsertPerson);
  const deptFn = useServerFn(createDepartment);
  const resendFn = useServerFn(resendInvite);
  const statusFn = useServerFn(setEmploymentStatus);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const isHr = !!(me?.permissions as { canManagePeople?: boolean } | undefined)?.canManagePeople;
  const { data, isLoading } = useQuery({ queryKey: ["directory"], queryFn: () => dirFn() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PersonForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [newDept, setNewDept] = useState("");

  const memberMap = useMemo(() => {
    const m = new Map<string, string[]>();
    (data?.members ?? []).forEach((r) => {
      m.set(r.employee_id, [...(m.get(r.employee_id) ?? []), r.group_id]);
    });
    return m;
  }, [data]);

  const roleMap = useMemo(() => {
    const m = new Map<string, string>();
    (data?.roles ?? []).forEach((r) => m.set(r.user_id, r.role));
    return m;
  }, [data]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.employees ?? []).filter((e) => {
      const matchQ =
        !q ||
        `${e.first_name} ${e.last_name} ${e.email}`.toLowerCase().includes(q);
      const matchD = deptFilter === "all" || e.department_id === deptFilter;
      const matchG =
        groupFilter === "all" || (memberMap.get(e.id) ?? []).includes(groupFilter);
      return matchQ && matchD && matchG;
    });
  }, [data, search, deptFilter, groupFilter, memberMap]);

  const save = useMutation({
    mutationFn: (f: PersonForm) =>
      saveFn({
        data: {
          id: f.id,
          first_name: f.first_name,
          last_name: f.last_name,
          email: f.email,
          gender: f.gender || null,
          job_title: f.job_title,
          department_id: f.department_id || null,
          roles: [f.role],
          group_ids: f.group_ids,
          sendInvite: !f.id,
          origin: window.location.origin,
        },
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["directory"] });
      setOpen(false);
      if (res.inviteError) toast.warning(`Saved, but the invite email failed: ${res.inviteError}`);
      else if (res.inviteLink) toast.success("Person added — invitation email sent");
      else toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addDept = useMutation({
    mutationFn: (name: string) => deptFn({ data: { name } }),
    onSuccess: (d) => {
      setNewDept("");
      setForm((f) => ({ ...f, department_id: d.id }));
      qc.invalidateQueries({ queryKey: ["directory"] });
      toast.success("Department added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resend = useMutation({
    mutationFn: (id: string) => resendFn({ data: { employeeId: id, origin: window.location.origin } }),
    onSuccess: () => toast.success("Invitation email resent"),
    onError: (e: Error) => toast.error(e.message),
  });

  const changeStatus = useMutation({
    mutationFn: (v: { id: string; status: "active" | "on_leave" | "terminated" }) =>
      statusFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["directory"] });
      toast.success("Status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => {
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (id: string) => {
    const e = data?.employees.find((x) => x.id === id);
    if (!e) return;
    setForm({
      id: e.id,
      first_name: e.first_name,
      last_name: e.last_name,
      email: e.email,
      gender: (e.gender as Gender) ?? "",
      job_title: e.job_title ?? "",
      department_id: e.department_id ?? "",
      role: (e.user_id ? (roleMap.get(e.user_id) as AppRole) : "employee") ?? "employee",
      group_ids: memberMap.get(e.id) ?? [],
    });
    setOpen(true);
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">People</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Add teammates, set their platform role and organise them into user groups.
          </p>
        </div>
        {isHr && (
          <Button onClick={openNew}>
            <UserPlus className="h-4 w-4 mr-2" /> Add person
          </Button>
        )}
      </div>

      <Card className="shadow-card">
        <CardHeader className="gap-3">
          <CardTitle className="text-base">Directory</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {(data?.departments ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="User group" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All groups</SelectItem>
                {(data?.groups ?? []).map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : rows.length ? (
            <div className="divide-y divide-border">
              {rows.map((e) => {
                const groups = (memberMap.get(e.id) ?? [])
                  .map((gid) => data?.groups.find((g) => g.id === gid)?.name)
                  .filter(Boolean) as string[];
                const role = e.user_id ? roleMap.get(e.user_id) : undefined;
                return (
                  <div key={e.id} className="flex items-center gap-4 py-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary-soft text-primary text-xs font-semibold">
                        {(e.first_name?.[0] ?? "").toUpperCase()}{(e.last_name?.[0] ?? "").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {e.first_name} {e.last_name}
                        {!e.user_id && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                            no login
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {e.email}
                        {e.job_title ? ` · ${e.job_title}` : ""}
                        {groups.length ? ` · ${groups.join(", ")}` : ""}
                      </p>
                    </div>
                    {role && (
                      <Badge variant="outline" className="capitalize hidden sm:inline-flex">
                        {role.replace("_", " ")}
                      </Badge>
                    )}
                    <Badge variant={e.employment_status === "active" ? "secondary" : "outline"} className="capitalize">
                      {e.employment_status.replace("_", " ")}
                    </Badge>
                    {isHr && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(e.id)}>Edit details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => resend.mutate(e.id)}>
                            <Mail className="h-4 w-4 mr-2" /> Resend invite
                          </DropdownMenuItem>
                          {e.employment_status === "active" ? (
                            <DropdownMenuItem
                              onClick={() => changeStatus.mutate({ id: e.id, status: "terminated" })}
                            >
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => changeStatus.mutate({ id: e.id, status: "active" })}
                            >
                              Reactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No people match</p>
              <p className="text-xs text-muted-foreground mt-1">Add your first teammate to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit person" : "Add person"}</DialogTitle>
            <DialogDescription>
              {form.id
                ? "Update their details, role and groups."
                : "They will receive an email invitation to set their own password."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First name</Label>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Last name</Label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={!!form.id}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as Gender })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Job title</Label>
                <Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select
                value={form.department_id}
                onValueChange={(v) => setForm({ ...form, department_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {(data?.departments ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2 pt-1">
                <Input
                  placeholder="New department name"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!newDept.trim() || addDept.isPending}
                  onClick={() => addDept.mutate(newDept)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Platform role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>User groups</Label>
              {(data?.groups ?? []).length ? (
                <div className="grid grid-cols-2 gap-2">
                  {(data?.groups ?? []).map((g) => (
                    <label key={g.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.group_ids.includes(g.id)}
                        onCheckedChange={(c) =>
                          setForm({
                            ...form,
                            group_ids: c
                              ? [...form.group_ids, g.id]
                              : form.group_ids.filter((x) => x !== g.id),
                          })
                        }
                      />
                      {g.name}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No user groups yet — create them on the User Groups page.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.first_name || !form.last_name || !form.email || save.isPending}
              onClick={() => save.mutate(form)}
            >
              {form.id ? "Save changes" : "Add & send invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
