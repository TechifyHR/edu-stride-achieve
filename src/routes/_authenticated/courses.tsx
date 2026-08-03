import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listCourses,
  saveCourse,
  deleteCourse,
  saveLesson,
  deleteLesson,
  reorderLessons,
  setCourseStatus,
  type CourseStatus,
  type Difficulty,
  type LessonType,
} from "@/lib/courses.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  FileText,
  Film,
  Link2,
  Pencil,
  Plus,
  Presentation,
  Trash2,
  Youtube,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/courses")({
  head: () => ({
    meta: [
      { title: "Course Builder — PeoHub by TechifyHR" },
      {
        name: "description",
        content: "Create courses with YouTube, video, PDF, slides, text and link lessons.",
      },
      { property: "og:title", content: "Course Builder — PeoHub by TechifyHR" },
      { property: "og:description", content: "Author and publish learning content for your team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoursesPage,
});

export function youtubeId(url: string) {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([A-Za-z0-9_-]{6,})/,
  );
  return m ? m[1] : url.trim().length === 11 ? url.trim() : null;
}

const LESSON_ICON: Record<LessonType, React.ComponentType<{ className?: string }>> = {
  youtube: Youtube,
  video: Film,
  pdf: FileText,
  pptx: Presentation,
  text: FileText,
  link: Link2,
};

type Course = Awaited<ReturnType<typeof listCourses>>["courses"][number];
type Lesson = Awaited<ReturnType<typeof listCourses>>["lessons"][number];

function CoursesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCourses);
  const { data } = useQuery({ queryKey: ["courses"], queryFn: () => listFn() });
  const [selected, setSelected] = useState<string | null>(null);

  const courses = data?.courses ?? [];
  const lessons = data?.lessons ?? [];
  const active = courses.find((c) => c.id === selected) ?? null;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["courses"] });

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Author courses, add lessons and publish them to your people.
          </p>
        </div>
        <CourseDialog onSaved={invalidate}>
          <Button>
            <Plus className="h-4 w-4 mr-2" /> New course
          </Button>
        </CourseDialog>
      </div>

      {courses.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No courses yet. Create your first course to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              lessonCount={lessons.filter((l) => l.course_id === c.id).length}
              onOpen={() => setSelected(c.id)}
              onChanged={invalidate}
            />
          ))}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {active && (
            <LessonManager
              course={active}
              lessons={lessons.filter((l) => l.course_id === active.id)}
              onChanged={invalidate}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CourseCard({
  course,
  lessonCount,
  onOpen,
  onChanged,
}: {
  course: Course;
  lessonCount: number;
  onOpen: () => void;
  onChanged: () => void;
}) {
  const statusFn = useServerFn(setCourseStatus);
  const delFn = useServerFn(deleteCourse);

  const publish = useMutation({
    mutationFn: (status: CourseStatus) => statusFn({ data: { id: course.id, status } }),
    onSuccess: () => {
      toast.success("Course updated");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => delFn({ data: { id: course.id } }),
    onSuccess: () => {
      toast.success("Course deleted");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="shadow-card flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{course.title}</CardTitle>
          <Badge variant={course.status === "published" ? "default" : "secondary"}>
            {course.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{course.description || "—"}</p>
      </CardHeader>
      <CardContent className="mt-auto space-y-3">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{lessonCount} lessons</span>
          {course.category && <span>• {course.category}</span>}
          {course.mandatory && <span>• Mandatory</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onOpen}>
            Lessons
          </Button>
          <CourseDialog course={course} onSaved={onChanged}>
            <Button size="sm" variant="outline">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </CourseDialog>
          <Button
            size="sm"
            variant={course.status === "published" ? "secondary" : "default"}
            onClick={() => publish.mutate(course.status === "published" ? "draft" : "published")}
            disabled={publish.isPending}
          >
            {course.status === "published" ? "Unpublish" : "Publish"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CourseDialog({
  course,
  onSaved,
  children,
}: {
  course?: Course;
  onSaved: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const saveFn = useServerFn(saveCourse);
  const [form, setForm] = useState({
    title: course?.title ?? "",
    description: course?.description ?? "",
    category: course?.category ?? "",
    difficulty: (course?.difficulty ?? "beginner") as Difficulty,
    status: (course?.status ?? "draft") as CourseStatus,
    mandatory: course?.mandatory ?? false,
    quiz_enabled: course?.quiz_enabled ?? false,
    passing_score: course?.passing_score ?? 70,
    certificate_enabled: course?.certificate_enabled ?? true,
    duration_minutes: course?.duration_minutes ?? 30,
  });

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          id: course?.id,
          title: form.title,
          description: form.description || null,
          category: form.category || null,
          difficulty: form.difficulty,
          status: form.status,
          mandatory: form.mandatory,
          quiz_enabled: form.quiz_enabled,
          passing_score: form.quiz_enabled ? Number(form.passing_score) : null,
          certificate_enabled: form.certificate_enabled,
          duration_minutes: Number(form.duration_minutes) || null,
        },
      }),
    onSuccess: () => {
      toast.success(course ? "Course saved" : "Course created");
      setOpen(false);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{course ? "Edit course" : "New course"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Workplace Safety Essentials"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={form.category ?? ""}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Compliance"
              />
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select
                value={form.difficulty}
                onValueChange={(v) => setForm({ ...form, difficulty: v as Difficulty })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={form.duration_minutes ?? 0}
                onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as CourseStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Toggle
            label="Mandatory course"
            checked={form.mandatory}
            onChange={(v) => setForm({ ...form, mandatory: v })}
          />
          <Toggle
            label="Enable assessment quiz"
            checked={form.quiz_enabled}
            onChange={(v) => setForm({ ...form, quiz_enabled: v })}
          />
          {form.quiz_enabled && (
            <div className="space-y-2">
              <Label>Passing score (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.passing_score ?? 70}
                onChange={(e) => setForm({ ...form, passing_score: Number(e.target.value) })}
              />
            </div>
          )}
          <Toggle
            label="Issue certificate on completion"
            checked={form.certificate_enabled}
            onChange={(v) => setForm({ ...form, certificate_enabled: v })}
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() => save.mutate()}
            disabled={!form.title.trim() || save.isPending}
          >
            {save.isPending ? "Saving…" : "Save course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function LessonManager({
  course,
  lessons,
  onChanged,
}: {
  course: Course;
  lessons: Lesson[];
  onChanged: () => void;
}) {
  const delFn = useServerFn(deleteLesson);
  const reorderFn = useServerFn(reorderLessons);
  const ordered = useMemo(
    () => [...lessons].sort((a, b) => a.order_index - b.order_index),
    [lessons],
  );

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...ordered];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    await reorderFn({ data: { ids: next.map((l) => l.id) } });
    onChanged();
  };

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{course.title} — lessons</DialogTitle>
      </DialogHeader>

      <div className="space-y-2">
        {ordered.map((l, i) => {
          const Icon = LESSON_ICON[l.type as LessonType] ?? FileText;
          return (
            <div
              key={l.id}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
            >
              <Icon className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{l.title}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {l.type}
                  {l.min_watch_pct ? ` • unlock at ${l.min_watch_pct}%` : ""}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => move(i, -1)}>
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => move(i, 1)}>
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <LessonDialog courseId={course.id} lesson={l} nextIndex={i} onSaved={onChanged}>
                <Button size="icon" variant="ghost">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </LessonDialog>
              <Button
                size="icon"
                variant="ghost"
                onClick={async () => {
                  await delFn({ data: { id: l.id } });
                  toast.success("Lesson removed");
                  onChanged();
                }}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          );
        })}
        {!ordered.length && (
          <p className="text-sm text-muted-foreground">No lessons yet — add the first one.</p>
        )}
      </div>

      <LessonDialog courseId={course.id} nextIndex={ordered.length} onSaved={onChanged}>
        <Button variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" /> Add lesson
        </Button>
      </LessonDialog>
    </div>
  );
}

function LessonDialog({
  courseId,
  lesson,
  nextIndex,
  onSaved,
  children,
}: {
  courseId: string;
  lesson?: Lesson;
  nextIndex: number;
  onSaved: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const saveFn = useServerFn(saveLesson);
  const [form, setForm] = useState({
    title: lesson?.title ?? "",
    type: (lesson?.type ?? "youtube") as LessonType,
    content_url: lesson?.content_url ?? "",
    youtube_url: lesson?.youtube_video_id ?? "",
    text_body: lesson?.text_body ?? "",
    min_watch_pct: lesson?.min_watch_pct ?? 90,
    duration_seconds: lesson?.duration_seconds ?? 0,
  });

  const upload = async (file: File) => {
    setUploading(true);
    const path = `${courseId}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
    const { error } = await supabase.storage.from("course-media").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    setForm((f) => ({ ...f, content_url: path }));
    toast.success("File uploaded");
  };

  const save = useMutation({
    mutationFn: () => {
      const ytId = form.type === "youtube" ? youtubeId(form.youtube_url) : null;
      if (form.type === "youtube" && !ytId) throw new Error("Enter a valid YouTube URL");
      return saveFn({
        data: {
          id: lesson?.id,
          course_id: courseId,
          title: form.title,
          type: form.type,
          content_url: form.type === "youtube" ? null : form.content_url || null,
          youtube_video_id: ytId,
          text_body: form.type === "text" ? form.text_body : null,
          min_watch_pct:
            form.type === "youtube" || form.type === "video" ? Number(form.min_watch_pct) : null,
          duration_seconds: Number(form.duration_seconds) || null,
          order_index: lesson ? lesson.order_index : nextIndex,
        },
      });
    },
    onSuccess: () => {
      toast.success("Lesson saved");
      setOpen(false);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isUpload = form.type === "video" || form.type === "pdf" || form.type === "pptx";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lesson ? "Edit lesson" : "Add lesson"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Lesson title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Content type</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v as LessonType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube video</SelectItem>
                <SelectItem value="video">Uploaded MP4</SelectItem>
                <SelectItem value="pdf">PDF document</SelectItem>
                <SelectItem value="pptx">PowerPoint</SelectItem>
                <SelectItem value="text">Rich text</SelectItem>
                <SelectItem value="link">External link</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.type === "youtube" && (
            <div className="space-y-2">
              <Label>YouTube URL</Label>
              <Input
                value={form.youtube_url ?? ""}
                onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=…"
              />
              <p className="text-xs text-muted-foreground">
                Plays embedded inside PeoHub — learners are never sent to YouTube.
              </p>
            </div>
          )}

          {isUpload && (
            <div className="space-y-2">
              <Label>Upload file</Label>
              <Input
                type="file"
                accept={
                  form.type === "video"
                    ? "video/mp4"
                    : form.type === "pdf"
                      ? "application/pdf"
                      : ".ppt,.pptx"
                }
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
              />
              {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
              {form.content_url && (
                <p className="text-xs text-muted-foreground truncate">Stored: {form.content_url}</p>
              )}
            </div>
          )}

          {form.type === "link" && (
            <div className="space-y-2">
              <Label>External URL</Label>
              <Input
                value={form.content_url ?? ""}
                onChange={(e) => setForm({ ...form, content_url: e.target.value })}
                placeholder="https://…"
              />
            </div>
          )}

          {form.type === "text" && (
            <div className="space-y-2">
              <Label>Lesson content</Label>
              <Textarea
                rows={8}
                value={form.text_body ?? ""}
                onChange={(e) => setForm({ ...form, text_body: e.target.value })}
              />
            </div>
          )}

          {(form.type === "youtube" || form.type === "video") && (
            <div className="space-y-2">
              <Label>Required completion to unlock next lesson (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.min_watch_pct ?? 90}
                onChange={(e) => setForm({ ...form, min_watch_pct: Number(e.target.value) })}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={!form.title.trim() || save.isPending}>
            {save.isPending ? "Saving…" : "Save lesson"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
