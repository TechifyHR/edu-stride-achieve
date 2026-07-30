import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getAdminDirectory,
  saveUserGroup,
  deleteUserGroup,
  setGroupMembers,
} from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users2, Plus, Trash2, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/user-groups")({
  head: () => ({
    meta: [
      { title: "User Groups — TechifyHR LMS" },
      { name: "description", content: "Group people so you can assign courses to a whole group." },
    ],
  }),
  component: UserGroupsPage,
});

function UserGroupsPage() {
  const qc = useQueryClient();
  const dirFn = useServerFn(getAdminDirectory);
  const saveFn = useServerFn(saveUserGroup);
  const delFn = useServerFn(deleteUserGroup);
  const membersFn = useServerFn(setGroupMembers);

  const { data, isLoading } = useQuery({ queryKey: ["directory"], queryFn: () => dirFn() });

  const [editOpen, setEditOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [current, setCurrent] = useState<{ id?: string; name: string; description: string }>({
    name: "",
    description: "",
  });
  const [selected, setSelected] = useState<string[]>([]);

  const countByGroup = useMemo(() => {
    const m = new Map<string, number>();
    (data?.members ?? []).forEach((r) => m.set(r.group_id, (m.get(r.group_id) ?? 0) + 1));
    return m;
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      saveFn({ data: { id: current.id, name: current.name, description: current.description } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["directory"] });
      setEditOpen(false);
      toast.success("Group saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["directory"] });
      toast.success("Group deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMembers = useMutation({
    mutationFn: () => membersFn({ data: { groupId: current.id!, employeeIds: selected } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["directory"] });
      setMembersOpen(false);
      toast.success("Members updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User Groups</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Group people by team, location or cohort, then assign courses to the whole group.
          </p>
        </div>
        <Button
          onClick={() => {
            setCurrent({ name: "", description: "" });
            setEditOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> New group
        </Button>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Groups</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : data?.groups.length ? (
            <div className="divide-y divide-border">
              {data.groups.map((g) => (
                <div key={g.id} className="flex items-center gap-4 py-3">
                  <div className="h-9 w-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
                    <Users2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{g.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{g.description || "No description"}</p>
                  </div>
                  <Badge variant="secondary">{countByGroup.get(g.id) ?? 0} members</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrent({ id: g.id, name: g.name, description: g.description ?? "" });
                      setSelected(
                        (data.members ?? []).filter((m) => m.group_id === g.id).map((m) => m.employee_id),
                      );
                      setMembersOpen(true);
                    }}
                  >
                    Members
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit group"
                    onClick={() => {
                      setCurrent({ id: g.id, name: g.name, description: g.description ?? "" });
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Delete group" onClick={() => remove.mutate(g.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Users2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No user groups yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create one to assign learning in bulk.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{current.id ? "Edit group" : "New group"}</DialogTitle>
            <DialogDescription>Give the group a clear, recognisable name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={current.name} onChange={(e) => setCurrent({ ...current, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={current.description}
                onChange={(e) => setCurrent({ ...current, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button disabled={!current.name.trim() || save.isPending} onClick={() => save.mutate()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Members of {current.name}</DialogTitle>
            <DialogDescription>Pick who belongs to this group.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {(data?.employees ?? []).map((e) => (
              <label key={e.id} className="flex items-center gap-3 text-sm py-1">
                <Checkbox
                  checked={selected.includes(e.id)}
                  onCheckedChange={(c) =>
                    setSelected(c ? [...selected, e.id] : selected.filter((x) => x !== e.id))
                  }
                />
                <span>{e.first_name} {e.last_name}</span>
                <span className="text-xs text-muted-foreground truncate">{e.email}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMembersOpen(false)}>Cancel</Button>
            <Button disabled={saveMembers.isPending} onClick={() => saveMembers.mutate()}>Save members</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
