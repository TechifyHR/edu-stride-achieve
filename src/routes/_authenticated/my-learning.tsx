import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/my-learning")({
  head: () => ({ meta: [{ title: "My Learning — TechifyHR LMS" }] }),
  component: () => (
    <PagePlaceholder
      title="My Learning"
      description="Track your assigned courses and pick up where you left off."
      icon={GraduationCap}
      hint="The learning player and progress tracking ship in Phase 2."
    />
  ),
});
