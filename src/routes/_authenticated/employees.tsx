import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listEmployees } from "@/lib/employees.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/employees")({
  head: () => ({ meta: [{ title: "Employees — TechifyHR LMS" }] }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const fn = useServerFn(listEmployees);
  const { data, isLoading } = useQuery({ queryKey: ["employees"], queryFn: () => fn() });

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
        <p className="text-muted-foreground text-sm mt-1">Everyone with access to your learning workspace.</p>
      </div>
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Directory</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[0,1,2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : data && data.length > 0 ? (
            <div className="divide-y divide-border">
              {data.map((e) => (
                <div key={e.id} className="flex items-center gap-4 py-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary-soft text-primary text-xs font-semibold">
                      {(e.first_name?.[0] ?? "").toUpperCase()}{(e.last_name?.[0] ?? "").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.first_name} {e.last_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{e.email}{e.job_title ? ` · ${e.job_title}` : ""}</p>
                  </div>
                  <Badge variant={e.employment_status === "active" ? "secondary" : "outline"} className="capitalize">
                    {e.employment_status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No employees yet</p>
              <p className="text-xs text-muted-foreground mt-1">Bulk import and invite flows arrive in Phase 2.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
