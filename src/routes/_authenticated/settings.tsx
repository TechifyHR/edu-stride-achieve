import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe } from "@/lib/me.functions";
import { ROLE_LABELS } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — TechifyHR LMS" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const fn = useServerFn(getMe);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => fn() });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your workspace details.</p>
      </div>
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Organization</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Name" value={me?.organization?.name ?? "—"} />
          <Row label="Your roles" value={(me?.roles ?? []).map((r) => ROLE_LABELS[r]).join(", ") || "—"} />
          <Row label="Signed in as" value={me?.employee?.email ?? "—"} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}
