import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
import { Award } from "lucide-react";

export const Route = createFileRoute("/_authenticated/certificates")({
  head: () => ({ meta: [{ title: "Certificates — TechifyHR LMS" }] }),
  component: () => (
    <PagePlaceholder
      title="Certificates"
      description="Download and share the certificates you've earned."
      icon={Award}
      hint="Certificate generation arrives with the quiz engine in Phase 3."
    />
  ),
});
