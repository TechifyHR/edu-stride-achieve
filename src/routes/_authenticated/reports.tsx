import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — TechifyHR LMS" }] }),
  component: () => (
    <PagePlaceholder
      title="Reports"
      description="Track completion rate, average scores, learning hours, and overdue learning."
      icon={BarChart3}
      hint="Reports with Excel / PDF / CSV export land in Phase 4."
    />
  ),
});
