import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe } from "@/lib/me.functions";
import { getHrDashboard, getEmployeeDashboard } from "@/lib/dashboard.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, CheckCircle2, AlertCircle, Award, Users, GraduationCap } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — TechifyHR LMS" },
      { name: "description", content: "Your learning at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const getMeFn = useServerFn(getMe);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => getMeFn() });
  const { view } = useViewMode();
  const isHr = view === "admin" && !!me?.isAdmin;
  return isHr ? <HrDashboard name={me?.employee?.first_name} /> : <EmployeeDashboard name={me?.employee?.first_name} />;
}


function StatCard({ label, value, icon: Icon, tone = "default" }: { label: string; value: number | string; icon: React.ComponentType<{ className?: string }>; tone?: "default" | "success" | "warning" }) {
  const toneCls =
    tone === "success" ? "bg-primary-soft text-primary" :
    tone === "warning" ? "bg-orange-100 text-orange-700" :
    "bg-muted text-foreground";
  return (
    <Card className="shadow-card">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${toneCls}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
          <p className="text-2xl font-semibold mt-0.5">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function HrDashboard({ name }: { name?: string }) {
  const fn = useServerFn(getHrDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["hr-dashboard"], queryFn: () => fn() });

  const chartData = [
    { day: "Mon", completions: 0 }, { day: "Tue", completions: 0 }, { day: "Wed", completions: 0 },
    { day: "Thu", completions: 0 }, { day: "Fri", completions: 0 }, { day: "Sat", completions: 0 }, { day: "Sun", completions: 0 },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back{name ? `, ${name}` : ""}</h1>
        <p className="text-muted-foreground text-sm mt-1">Here's what's happening in your learning program.</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</>
        ) : (
          <>
            <StatCard label="Assignments" value={data?.assigned ?? 0} icon={BookOpen} />
            <StatCard label="Overdue" value={data?.overdue ?? 0} icon={AlertCircle} tone="warning" />
            <StatCard label="Certificates" value={data?.certificatesCount ?? 0} icon={Award} tone="success" />
            <StatCard label="Employees" value={data?.employees ?? 0} icon={Users} />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Completion trend</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="completions" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Recent certificates</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentCertificates?.length ? (
              <ul className="space-y-3">
                {data.recentCertificates.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 text-sm">
                    <Award className="h-4 w-4 text-primary" />
                    <span className="truncate">Certificate #{c.id.slice(0, 8)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Award} title="No certificates yet" hint="Certificates will appear here once employees complete courses." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmployeeDashboard({ name }: { name?: string }) {
  const fn = useServerFn(getEmployeeDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["emp-dashboard"], queryFn: () => fn() });

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back{name ? `, ${name}` : ""}</h1>
        <p className="text-muted-foreground text-sm mt-1">Keep the momentum — pick up where you left off.</p>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</>
        ) : (
          <>
            <StatCard label="Assigned" value={data?.assigned ?? 0} icon={BookOpen} />
            <StatCard label="In progress" value={data?.inProgress ?? 0} icon={GraduationCap} />
            <StatCard label="Completed" value={data?.completed ?? 0} icon={CheckCircle2} tone="success" />
            <StatCard label="Certificates" value={data?.certificates ?? 0} icon={Award} tone="success" />
          </>
        )}
      </div>
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Continue learning</CardTitle></CardHeader>
        <CardContent>
          <EmptyState icon={GraduationCap} title="No active courses" hint="Courses your HR team assigns will show up here." />
        </CardContent>
      </Card>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint }: { icon: React.ComponentType<{ className?: string }>; title: string; hint: string }) {
  return (
    <div className="text-center py-10">
      <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">{hint}</p>
    </div>
  );
}
