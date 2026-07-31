import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getAdminDirectory, createDepartment, deleteDepartment } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/departments")({
  head: () => ({
    meta: [
      { title: "Departments — PeoHub by TechifyHR" },
      { name: "description", content: "Create and manage the departments in your workspace." },
      { property: "og:title", content: "Departments — PeoHub by TechifyHR" },
      { property: "og:description", content: "Create and manage departments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DepartmentsPage,
});

function DepartmentsPage() {
  const qc = useQueryClient();
  const dirFn = useServerFn(getAdminDirectory);
  const saveFn = useServerFn(createDepartment);
  const delFn = useServerFn(deleteDepartment);
  const [name, setName] = useState("");

  const { data } = useQuery({ queryKey: ["directory"], queryFn: () => dirFn() });

  const save = useMutation({
    mutationFn: (n: string) => saveFn({ data: { name: n } }),
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["directory"] });
      toast.success("Department added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["directory"] });
      toast.success("Department removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const counts = new Map<string, number>();
  (data?.employees ?? []).forEach((e) => {
    if (e.department_id) counts.set(e.department_id, (counts.get(e.department_id) ?? 0) + 1);
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Departments</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Group your people by department to target courses and reporting.
        </p>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Add a department</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="e.g. Operations"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-sm"
          />
          <Button disabled={!name.trim() || save.isPending} onClick={() => save.mutate(name)}>
            <Plus className="h-4 w-4 mr-2" /> Add
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">All departments</CardTitle></CardHeader>
        <CardContent>
          {(data?.departments ?? []).length ? (
            <div className="divide-y divide-border">
              {(data?.departments ?? []).map((d) => (
                <div key={d.id} className="flex items-center gap-3 py-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-sm font-medium">{d.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {counts.get(d.id) ?? 0} people
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${d.name}`}
                    onClick={() => remove.mutate(d.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No departments yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
