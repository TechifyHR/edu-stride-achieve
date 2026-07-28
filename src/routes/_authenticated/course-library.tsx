import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/course-library")({
  head: () => ({ meta: [{ title: "Course Library — TechifyHR LMS" }] }),
  component: () => (
    <PagePlaceholder
      title="Course Library"
      description="Browse every course published in your organization."
      icon={BookOpen}
      hint="Once HR publishes courses, they'll appear here."
    />
  ),
});
