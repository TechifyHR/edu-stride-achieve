import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCourses, assignCourse, removeAssignment, type AssigneeType } from "@/lib/courses.functions";
import { getAdminDirectory } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ClipboardList, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/assignments")({
  head: () => ({
    meta: [
      { title: "Assignments — PeoHub by TechifyHR" },
      {
        name: "description",
        content: "Assign courses to people, departments, groups or the whole company.",
      },
      { property: "og:title", content: "Assignments — PeoHub by TechifyHR" },
      { property: "og:description", content: "Assign courses with start dates, due dates and reminders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const qc = useQueryClient();
  const coursesFn = useServerFn(listCourses);
  const dirFn = useServerFn(getAdminDirectory);
  const removeFn = useServerFn(removeAssignment);

  const { data } = useQuery({ queryKey: ["courses"], queryFn: () => coursesFn() });
  const { data: dir } = useQuery({ queryKey: ["admin-directory"], queryFn: () => dirFn() });

  const courses = data?.courses ?? [];
  const assignments = data?.assignments ?? [];

  const label = (type: string, id: string | null) => {
    if (type === "company") return "Everyone in the company";
    if (type === "employee") {
      const e = dir?.employees.find((x) => x.id === id);
      return e ? `${e.first_name} ${e.last_name}` : "Employee";
    }
    if (type === "department")
      return dir?.departments.find((d) => d.id === id)?.name ?? "Department";
    if (type === "group") return dir?.groups.find((g) => g.id === id)?.name ?? "Group";
    return id ?? "—";
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Send courses to individuals, departments, groups or everyone — with timelines.
          </p>
        </div>
        <AssignDialog onSaved={() => qc.invalidateQueries({ queryKey: ["courses"] })}>
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Assign course
          </Button>
        </AssignDialog>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" /> Active assignments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {assignments.length ? (
            assignments.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {courses.find((c) => c.id === a.course_id)?.title ?? "Course"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {label(a.assignee_type, a.assignee_id)}
                    {a.start_date ? ` • starts ${a.start_date}` : ""}
                    {a.due_date ? ` • due ${a.due_date}` : ""}
                  </p>
                </div>
                {a.mandatory && <Badge>Mandatory</Badge>}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={async () => {
                    await removeFn({ data: { id: a.id } });
                    toast.success("Assignment removed");
                    qc.invalidateQueries({ queryKey: ["courses"] });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing assigned yet — assign your first course.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AssignDialog({
  onSaved,
  children,
}: {
  onSaved: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const coursesFn = useServerFn(listCourses);
  const dirFn = useServerFn(getAdminDirectory);
  const assignFn = useServerFn(assignCourse);

  const { data } = useQuery({ queryKey: ["courses"], queryFn: () => coursesFn() });
  const { data: dir } = useQuery({ queryKey: ["admin-directory"], queryFn: () => dirFn() });

  const [courseId, setCourseId] = useState("");
  const [type, setType] = useState<AssigneeType>("employee");
  const [ids, setIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [mandatory, setMandatory] = useState(false);
  const [reminder, setReminder] = useState("weekly");

  const targets =
    type === "employee"
      ? (dir?.employees ?? []).map((e) => ({ id: e.id, name: `${e.first_name} ${e.last_name}` }))
      : type === "department"
        ? (dir?.departments ?? []).map((d) => ({ id: d.id, name: d.name }))
        : type === "group"
          ? (dir?.groups ?? []).map((g) => ({ id: g.id, name: g.name }))
          : [];

  const save = useMutation({
    mutationFn: () =>
      assignFn({
        data: {
          course_id: courseId,
          assignee_type: type,
          assignee_ids: ids,
          start_date: startDate || null,
          due_date: dueDate || null,
          mandatory,
          reminder_frequency: reminder,
        },
      }),
    onSuccess: (r) => {
      toast.success(`Assigned to ${r.count} target${r.count === 1 ? "" : "s"}`);
      setOpen(false);
      setIds([]);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign a course</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a course" />
              </SelectTrigger>
              <SelectContent>
                {(data?.courses ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                    {c.status !== "published" ? " (draft)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assign to</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as AssigneeType);
                setIds([]);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Individual people</SelectItem>
                <SelectItem value="department">Departments</SelectItem>
                <SelectItem value="group">User groups</SelectItem>
                <SelectItem value="company">Everyone in the company</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type !== "company" && (
            <div className="space-y-2 max-h-52 overflow-y-auto rounded-lg border border-border p-3">
              {targets.length ? (
                targets.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={ids.includes(t.id)}
                      onCheckedChange={(c) =>
                        setIds((prev) => (c ? [...prev, t.id] : prev.filter((i) => i !== t.id)))
                      }
                    />
                    {t.name}
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nothing to pick yet.</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reminder frequency</Label>
            <Select value={reminder} onValueChange={setReminder}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No reminders</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <span className="text-sm">Mandatory for the assignee</span>
            <Switch checked={mandatory} onCheckedChange={setMandatory} />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => save.mutate()}
            disabled={!courseId || (type !== "company" && !ids.length) || save.isPending}
          >
            {save.isPending ? "Assigning…" : "Assign course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
