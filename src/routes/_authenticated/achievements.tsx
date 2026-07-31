import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAchievements } from "@/lib/achievements.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, BadgeCheck, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/achievements")({
  head: () => ({
    meta: [
      { title: "My Achievements — PeoHub by TechifyHR" },
      { name: "description", content: "Certificates, badges and completed courses you have earned." },
      { property: "og:title", content: "My Achievements — PeoHub by TechifyHR" },
      { property: "og:description", content: "Certificates, badges and completed courses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AchievementsPage,
});

type Filter = "all" | "certificates" | "badges";

function AchievementsPage() {
  const fn = useServerFn(getMyAchievements);
  const { data } = useQuery({ queryKey: ["achievements"], queryFn: () => fn() });
  const [filter, setFilter] = useState<Filter>("all");

  const certs = data?.certificates ?? [];
  const badges = data?.badges ?? [];

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Achievements</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Everything you have earned across your learning journey.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Certificates earned" value={certs.length} icon={Award} />
        <Kpi label="Badges earned" value={badges.length} icon={BadgeCheck} />
        <Kpi label="Courses completed" value={data?.coursesCompleted ?? 0} icon={GraduationCap} />
      </div>

      <div className="flex gap-2">
        {(["all", "certificates", "badges"] as Filter[]).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
      </div>

      {(filter === "all" || filter === "certificates") && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Certificates</h2>
          {certs.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {certs.map((c) => (
                <Card key={c.id} className="shadow-card overflow-hidden">
                  <div className="h-24 bg-primary-soft flex items-center justify-center">
                    <Award className="h-8 w-8 text-primary" />
                  </div>
                  <CardContent className="pt-4 space-y-1">
                    <p className="text-sm font-medium">{c.course_title}</p>
                    <p className="text-xs text-muted-foreground">
                      Completed {new Date(c.issued_at).toLocaleDateString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">#{c.certificate_number}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 w-full"
                      disabled={!c.pdf_url}
                      onClick={() => c.pdf_url && window.open(c.pdf_url, "_blank")}
                    >
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No certificates yet — complete a course to earn your first one.
            </p>
          )}
        </section>
      )}

      {(filter === "all" || filter === "badges") && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Badges</h2>
          {badges.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {badges.map((b) => (
                <Card key={b.id} className="shadow-card">
                  <CardContent className="pt-6 text-center space-y-1">
                    <BadgeCheck className="h-8 w-8 mx-auto text-primary" />
                    <p className="text-sm font-medium">{b.name}</p>
                    {b.course_title && (
                      <p className="text-xs text-muted-foreground">{b.course_title}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(b.earned_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No badges earned yet.</p>
          )}
        </section>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="shadow-card">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
