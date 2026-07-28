import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
import { FolderKanban } from "lucide-react";

export const Route = createFileRoute("/_authenticated/courses")({
  head: () => ({ meta: [{ title: "Courses — TechifyHR LMS" }] }),
  component: () => (
    <PagePlaceholder
      title="Courses"
      description="Author courses, add lessons, and publish learning content."
      icon={FolderKanban}
      hint="The 5-step course builder (basic info → lessons → quiz → certificate → assignment) is coming in Phase 2."
      ctaLabel="Create course"
    />
  ),
});
