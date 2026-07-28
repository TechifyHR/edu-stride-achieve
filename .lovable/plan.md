
# TechifyHR LMS — Foundation Build (v1 Phase 1)

The full spec is ~5 modules of work. This plan is **Phase 1**: enable Lovable Cloud, ship the multi-tenant schema, auth, role system, and the app shell with placeholder screens. Subsequent phases (course builder, learning player, quizzes/certificates, assignments/reports) each get their own plan on approval.

## Phase 1 deliverables

1. **Lovable Cloud + auth**
   - Enable Cloud (Supabase under the hood).
   - Email/password auth via Supabase Auth. `/auth` page (sign in / sign up). On first sign-up, create an `organizations` row and make the user its HR Administrator (Super Admin bootstrap done via SQL for the first account).
   - `_authenticated` layout gates the app.

2. **Multi-tenant schema (migration)**
   All tables carry `organization_id`. RLS policies scope every read/write to the caller's org via a `security definer` helper `current_org_id()`. Roles in a separate `user_roles` table + `has_role()` helper (per platform rules).

   Tables:
   - `organizations` (id, name, logo_url, primary_color, created_at, deleted_at)
   - `app_role` enum: `super_admin | hr_admin | manager | employee`
   - `user_roles` (user_id, organization_id, role) + `has_role(user, org, role)`
   - `departments` (id, org_id, name)
   - `employees` (id, org_id, user_id nullable, employee_code, first_name, last_name, email, department_id, job_title, manager_id, employment_status, date_joined)
   - `courses` (id, org_id, title, description, category, thumbnail_url, duration_minutes, difficulty, status [draft/published/archived], mandatory, due_date, certificate_enabled, quiz_enabled, passing_score, min_video_completion_pct, created_by)
   - `course_lessons` (id, course_id, order_index, type [youtube/video/pdf/pptx/text/link], title, content_url, youtube_video_id, text_body, min_watch_pct)
   - `lesson_progress` (id, employee_id, lesson_id, current_position, highest_position, total_watch_time, completion_pct, started_at, completed_at, paused_at, last_position)
   - `course_assignments` (id, course_id, assignee_type [employee/department/role/company], assignee_id nullable, due_date, reminder_frequency, assigned_by, assigned_at)
   - `quizzes` (id, course_id, time_limit_seconds, max_attempts, pass_mark, random_order)
   - `quiz_questions` (id, quiz_id, order_index, type [mcq/tf/multi], prompt)
   - `quiz_answers` (id, question_id, text, is_correct)
   - `quiz_attempts` (id, quiz_id, employee_id, score, passed, started_at, submitted_at, answers_json)
   - `certificates` (id, course_id, employee_id, certificate_number, issued_at, pdf_url)
   - `notifications` (id, org_id, user_id, type, title, body, link, read_at, created_at)
   - `activity_logs` (id, org_id, user_id, action, entity_type, entity_id, metadata, created_at)

   Every table: `created_at`, `updated_at`, `deleted_at` (soft delete) where appropriate. FKs with `on delete` chosen per relationship. Public-schema `GRANT`s to `authenticated` and `service_role` per platform rules.

3. **App shell (routes + sidebar)**
   - `src/routes/_authenticated/route.tsx` — session gate.
   - Sidebar layout with sections: Dashboard, Learning (My Learning, Course Library, Certificates), Administration (Courses, Employees, Reports — HR-only via `has_role`), Coming Soon (People, Leave, Attendance, Payroll, Performance, Recruitment — disabled chips), Settings.
   - Topbar with global search input (wired to a stub `useSearch` — real search in later phase), notification bell (opens in-app list), user menu.
   - Role-aware navigation: employees don't see Administration.

4. **Dashboards (data-wired shells)**
   - HR Dashboard: 4 KPI cards (Assigned / Completed / Overdue / Certificates — real counts via server fns), Progress chart placeholder (Recharts), Recent Certificates list.
   - Employee Dashboard: Assigned / In Progress / Completed / Certificates, Continue Learning list, Upcoming Deadlines.
   - Empty states styled and copywritten.

5. **Placeholder pages** for Courses, Course Library, My Learning, Certificates, Employees, Reports, Settings — routed and in the nav, with "coming next" empty state. Wired to real data where trivial (e.g. Employees list from `employees` table).

6. **Design system**
   - Update `src/styles.css`: primary green `#1D7A3E` in oklch, neutral white surfaces, soft radius (0.75rem), subtle shadow tokens. Light mode only for v1.
   - Inter font via `<link>` in `__root.tsx` head.
   - Update root `head()` with real title/description/OG tags ("TechifyHR LMS — Learning Management for modern teams").

## Technical notes

- **Server fns** in `src/lib/*.functions.ts` using `.middleware([requireSupabaseAuth])`. Context supplies `supabase` + `userId`. All list/detail reads for authenticated data go through these; RLS enforces org isolation as belt-and-suspenders.
- **Org resolution**: on sign-in the client reads `user_roles` for the user to determine `organization_id` + role, cached in React Query (`['me']`). A `security definer` SQL `current_org_id()` returns the single org for the caller (users belong to one org in v1) and is used in every RLS policy.
- **First-user bootstrap**: sign-up form asks for Organization Name; a `handle_new_user` trigger (or explicit server fn on first sign-up) creates the `organizations` row + `user_roles` row (`hr_admin`).
- **Super Admin**: minimal — table exists, role exists, but the Super Admin org-management UI is a Phase-5 item. Not built in Phase 1.
- **Reusability**: `employees`, `departments`, `notifications`, `user_roles`, `activity_logs` live in a shared/core namespace conceptually — no LMS-specific FKs on them — so future HR modules attach cleanly.

## Explicitly out of scope for Phase 1

- Course builder wizard, lesson players, YouTube progress tracking
- Quiz engine and certificate PDF generation
- Assignments wizard and reminders
- Reports dashboards + exports
- Global search implementation (input present, results in later phase)
- Email notifications (in-app only per your answer; still Phase 3+)

Approve this and I'll build it, then propose Phase 2 (Course Builder + Lesson Players).
