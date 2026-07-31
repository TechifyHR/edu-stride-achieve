import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/lib/profile.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — PeoHub by TechifyHR" },
      { name: "description", content: "View your employee record: department, job title, manager and start date." },
      { property: "og:title", content: "My Profile — PeoHub by TechifyHR" },
      { property: "og:description", content: "Your employee record in PeoHub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const fn = useServerFn(getProfile);
  const { data } = useQuery({ queryKey: ["profile"], queryFn: () => fn() });
  const e = data?.employee;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          These details are maintained by your HR team. Only your profile picture is editable.
        </p>
      </div>
      <Card className="shadow-card">
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <Avatar className="h-16 w-16">
            {e?.avatar_url && <AvatarImage src={e.avatar_url} alt="" />}
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
              {(e?.first_name?.[0] ?? "").toUpperCase()}
              {(e?.last_name?.[0] ?? "").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-base">
            {e ? `${e.first_name} ${e.last_name}` : "—"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <Row label="Employee ID" value={e?.employee_code ?? "—"} />
          <Row label="First name" value={e?.first_name ?? "—"} />
          <Row label="Last name" value={e?.last_name ?? "—"} />
          <Row label="Email" value={e?.email ?? "—"} />
          <Row label="Phone" value={e?.phone ?? "—"} />
          <Row label="Department" value={data?.department ?? "—"} />
          <Row label="Job title" value={e?.job_title ?? "—"} />
          <Row label="Manager" value={data?.manager ?? "—"} />
          <Row label="Employment status" value={e?.employment_status?.replace("_", " ") ?? "—"} />
          <Row label="Date joined" value={e?.date_joined ?? "—"} />
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
