import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
import { ClipboardList } from "lucide-react";

export const Route = createFileRoute("/_authenticated/assignments")({
  head: () => ({
    meta: [
      { title: "Assignments — PeoHub by TechifyHR" },
      { name: "description", content: "Assign courses to people, departments, groups or the whole company." },
      { property: "og:title", content: "Assignments — PeoHub by TechifyHR" },
      { property: "og:description", content: "Assign courses with due dates and reminders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="Assignments"
      description="Assign courses to individuals, departments, groups or everyone, with start and due dates."
      icon={ClipboardList}
      hint="Course assignment lands with the Course Builder in the next Phase 2 drop."
      ctaLabel="Assign a course"
    />
  ),
});
