import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PagePlaceholder({
  title,
  description,
  icon: Icon,
  hint,
  ctaLabel,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{description}</p>
        </div>
        {ctaLabel && <Button disabled>{ctaLabel}</Button>}
      </div>
      <Card className="shadow-card">
        <CardContent className="py-16 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-4">
            <Icon className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium">Coming next</p>
          {hint && <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">{hint}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
