import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyLearning,
  saveLessonProgress,
  getLessonMediaUrl,
  claimCertificate,
} from "@/lib/learning.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Award, CheckCircle2, Lock, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/my-learning")({
  head: () => ({
    meta: [
      { title: "My Learning — PeoHub by TechifyHR" },
      { name: "description", content: "Your assigned courses, lesson progress and due dates." },
      { property: "og:title", content: "My Learning — PeoHub by TechifyHR" },
      { property: "og:description", content: "Pick up where you left off in your assigned courses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyLearningPage,
});

type Learning = Awaited<ReturnType<typeof getMyLearning>>;
type LCourse = NonNullable<Learning["courses"]>[number];

function MyLearningPage() {
  const fn = useServerFn(getMyLearning);
  const { data } = useQuery({ queryKey: ["my-learning"], queryFn: () => fn() });
  const [open, setOpen] = useState<LCourse | null>(null);

  const progressByLesson = useMemo(
    () => new Map<string, any>(((data as any)?.progress ?? []).map((p: any) => [p.lesson_id as string, p])),
    [data],
  );

  const courses = data?.courses ?? [];

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Learning</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Courses assigned to you — track progress and earn certificates.
        </p>
      </div>

      {courses.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const total = c.lessons.length || 1;
            const done = c.lessons.filter(
              (l: any) => (progressByLesson.get(l.id) as any)?.completed_at,
            ).length;
            const pct = Math.round((done / total) * 100);
            return (
              <Card key={c.id} className="shadow-card flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{c.title}</CardTitle>
                    {c.assignment?.mandatory && <Badge>Mandatory</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {c.description || "—"}
                  </p>
                </CardHeader>
                <CardContent className="mt-auto space-y-3">
                  <Progress value={pct} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {done}/{c.lessons.length} lessons
                    </span>
                    {c.assignment?.due_date && <span>Due {c.assignment.due_date}</span>}
                  </div>
                  <Button className="w-full" onClick={() => setOpen(c)}>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    {pct === 0 ? "Start course" : pct === 100 ? "Review" : "Continue"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No courses assigned to you yet.
          </CardContent>
        </Card>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {open && <CoursePlayer course={open} progressByLesson={progressByLesson} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CoursePlayer({
  course,
  progressByLesson,
}: {
  course: LCourse;
  progressByLesson: Map<string, any>;
}) {
  const qc = useQueryClient();
  const claimFn = useServerFn(claimCertificate);
  const lessons = [...course.lessons].sort((a: any, b: any) => a.order_index - b.order_index);
  const firstIncomplete = Math.max(
    0,
    lessons.findIndex((l: any) => !progressByLesson.get(l.id)?.completed_at),
  );
  const [index, setIndex] = useState(firstIncomplete === -1 ? 0 : firstIncomplete);
  const lesson: any = lessons[index];

  const unlocked = (i: number) => {
    if (i === 0) return true;
    const prev: any = lessons[i - 1];
    const p = progressByLesson.get(prev.id);
    const required = prev.min_watch_pct ?? 100;
    return (p?.completion_pct ?? 0) >= required || !!p?.completed_at;
  };

  const allDone = lessons.every((l: any) => progressByLesson.get(l.id)?.completed_at);

  const claim = useMutation({
    mutationFn: () => claimFn({ data: { course_id: course.id } }),
    onSuccess: () => {
      toast.success("Certificate issued — find it in My Achievements");
      qc.invalidateQueries({ queryKey: ["my-learning"] });
      qc.invalidateQueries({ queryKey: ["achievements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{course.title}</DialogTitle>
      </DialogHeader>

      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          {lessons.map((l: any, i: number) => {
            const p = progressByLesson.get(l.id);
            const locked = !unlocked(i);
            return (
              <button
                key={l.id}
                disabled={locked}
                onClick={() => setIndex(i)}
                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                  i === index ? "bg-primary-soft text-primary" : "hover:bg-muted"
                } ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {p?.completed_at ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                ) : locked ? (
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <PlayCircle className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{l.title}</span>
              </button>
            );
          })}
        </aside>

        <div className="space-y-3 min-w-0">
          {lesson ? (
            <LessonView key={lesson.id} lesson={lesson} />
          ) : (
            <p className="text-sm text-muted-foreground">This course has no lessons yet.</p>
          )}

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              disabled={index >= lessons.length - 1 || !unlocked(index + 1)}
              onClick={() => setIndex((i) => i + 1)}
            >
              Next lesson
            </Button>
          </div>

          {course.certificate_enabled && (
            <Button
              className="w-full"
              variant={allDone ? "default" : "outline"}
              disabled={!allDone || claim.isPending || course.hasCertificate}
              onClick={() => claim.mutate()}
            >
              <Award className="h-4 w-4 mr-2" />
              {course.hasCertificate
                ? "Certificate earned"
                : allDone
                  ? "Claim certificate"
                  : "Finish all lessons to unlock your certificate"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function LessonView({ lesson }: { lesson: any }) {
  const qc = useQueryClient();
  const saveFn = useServerFn(saveLessonProgress);
  const mediaFn = useServerFn(getLessonMediaUrl);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const lastSaved = useRef(0);

  const report = async (pct: number, position?: number) => {
    if (pct - lastSaved.current < 5 && pct < 100) return;
    lastSaved.current = pct;
    await saveFn({ data: { lesson_id: lesson.id, completion_pct: pct, position } });
    if (pct >= 100) qc.invalidateQueries({ queryKey: ["my-learning"] });
  };

  useEffect(() => {
    let active = true;
    if (["video", "pdf", "pptx"].includes(lesson.type) && lesson.content_url) {
      mediaFn({ data: { path: lesson.content_url } }).then((r) => {
        if (active) setMediaUrl(r.url);
      });
    }
    return () => {
      active = false;
    };
  }, [lesson.id]);

  if (lesson.type === "youtube")
    return <YouTubeLesson videoId={lesson.youtube_video_id} onProgress={report} />;

  if (lesson.type === "video")
    return mediaUrl ? (
      <video
        src={mediaUrl}
        controls
        className="w-full rounded-lg bg-black"
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration)
            report(Math.round((el.currentTime / el.duration) * 100), Math.floor(el.currentTime));
        }}
        onEnded={() => report(100)}
      />
    ) : (
      <p className="text-sm text-muted-foreground">Loading video…</p>
    );

  if (lesson.type === "pdf" || lesson.type === "pptx")
    return mediaUrl ? (
      <div className="space-y-2">
        <iframe src={mediaUrl} title={lesson.title} className="w-full h-[480px] rounded-lg border" />
        <Button size="sm" variant="outline" onClick={() => report(100)}>
          Mark as read
        </Button>
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">Loading document…</p>
    );

  if (lesson.type === "text")
    return (
      <div className="space-y-3">
        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
          {lesson.text_body}
        </div>
        <Button size="sm" variant="outline" onClick={() => report(100)}>
          Mark as complete
        </Button>
      </div>
    );

  return (
    <div className="space-y-3">
      <a
        href={lesson.content_url ?? "#"}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-primary underline"
      >
        Open resource
      </a>
      <Button size="sm" variant="outline" onClick={() => report(100)}>
        Mark as complete
      </Button>
    </div>
  );
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function YouTubeLesson({
  videoId,
  onProgress,
}: {
  videoId: string;
  onProgress: (pct: number, position?: number) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    const build = () => {
      if (!hostRef.current || !window.YT?.Player) return;
      playerRef.current = new window.YT.Player(hostRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
      });
      timer = setInterval(() => {
        const p = playerRef.current;
        if (!p?.getDuration) return;
        const duration = p.getDuration();
        const current = p.getCurrentTime?.() ?? 0;
        if (duration > 0)
          onProgress(Math.min(100, Math.round((current / duration) * 100)), Math.floor(current));
      }, 5000);
    };

    if (window.YT?.Player) build();
    else {
      const existing = document.getElementById("yt-iframe-api");
      if (!existing) {
        const s = document.createElement("script");
        s.id = "yt-iframe-api";
        s.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(s);
      }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        build();
      };
    }

    return () => {
      clearInterval(timer);
      playerRef.current?.destroy?.();
    };
  }, [videoId]);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <div ref={hostRef} className="h-full w-full" />
    </div>
  );
}
