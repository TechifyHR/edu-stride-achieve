
# PeoHub by TechifyHR — Roles, Auth, Navigation & Phase 2

Built on the existing app. No redesign: same green/white SaaS system, same routes and components, extended.

## Current state (verified)

- Roles are single-valued per user: `user_roles` holds one row read via `getMe()` as one `role`, and the whole UI gates on `role === 'hr_admin' | 'super_admin'`. There is no owner concept and no multi-role support.
- Invites use `supabaseAdmin.auth.admin.inviteUserByEmail` with `redirectTo = ${origin}/invite`; `/invite` only reads an existing session and calls `updateUser({ password })`. The email itself is the default backend template, which is why recipients land on a non-branded page.
- `employees` has `employee_code, first_name, last_name, email, job_title, department_id, manager_id, employment_status, date_joined` — no `phone`, no `avatar_url`.
- No tables for badges, notification preferences, course categories, or certificate numbering beyond the existing `certificates` table.
- Header currently has a centered/left search bar; sidebar Learning is a flat section; Certificates is a top-level item.

---

## Phase A — Roles & permissions (foundation)

**Data**
- Add `workspace_owner` to the `app_role` enum; keep `user_roles` as the multi-row source of truth (unique on user+role) so one user holds several roles at once.
- Workspace creation grants the creator **both** `workspace_owner` and `employee` rows, plus an `employees` record, in one transaction. Backfill existing org creators as owner + employee.
- Security-definer helpers: `has_role()`, `is_admin()` (owner or admin), `is_owner()`. RLS policies switch from "hr_admin" checks to `is_admin()`; owner rows are protected — admins cannot delete or demote the owner, only the owner can grant/revoke Admin and transfer nothing.
- `GRANT` statements included for every new/changed table.

**App**
- `getMe()` returns `roles: string[]` plus derived `isOwner / isAdmin / isManager / isEmployee`.
- Owner immediately has departments, groups, people, bulk import, courses, assignments, reports, settings, invites.

## Phase B — Native invitation & auth flow

- Branded invite email template (PeoHub by TechifyHR) configured on the backend, linking to the app's own `/invite` URL — never a third-party or Lovable page.
- `/invite` handles the token in the URL hash/query, exchanges it for a session, shows Set Password, then signs in and lands on the **Employee Dashboard**.
- Already-registered users hitting an invite link go to the app's `/auth` sign-in.
- After any login, land on the Employee Dashboard — never Admin View automatically.

## Phase C — Shell: view switcher, header, navigation, rebrand

- **View switcher** (only when the user has >1 role): a dropdown at the far right of the header, before Notifications — Employee View / Admin View / Manager View. Stores the active view in a context + localStorage; switching swaps sidebar and dashboard without signing out.
- **Header**: all controls right-aligned in order View Switcher → Notifications → Avatar. Search moves into the left of the content area (nothing centered).
- **User dropdown**: Profile, My Achievements, Settings, Logout.
- **Sidebar**: collapsible "Learning" group (My Learning, Course Library, My Achievements); Certificates is folded into Achievements; other HR modules stay as "Coming Soon". Admin View sidebar: Dashboard, People, Departments, Groups, Courses, Assignments, Reports, Certificates, Settings.
- **Rebrand** to "PeoHub by TechifyHR" across logo, titles, meta descriptions and emails; Learning is presented as one module of the platform.

## Phase D — Profile, Settings, Achievements

- Add `phone` and `avatar_url` to `employees`; create a public `avatars` storage bucket with owner-scoped write policies.
- **Profile** page: profile image (editable, upload) plus read-only Employee ID, name, email, phone, department, job title, manager, employment status, date joined.
- **Settings**: change password; notification preferences table (`notification_preferences`) with the 8 toggles (new course, reminder, due date, overdue, completed, certificate ready, badge earned, announcements) all defaulting ON.
- **My Achievements**: KPI cards (certificates, badges, courses completed), filters All / Certificates / Badges with optional completion-date and course filters, medium cards; certificate cards show preview, course, completion date and Download PDF. New `badges` + `employee_badges` tables.

## Phase E — People module

- KPI cards: Total Employees, Total Departments, Total Groups.
- Table with search, filters, sorting, pagination; row actions View, Edit, Reset Password, Resend Invitation, Activate/Deactivate, Delete.
- Dedicated Departments and Groups admin pages (groups already exist; departments get their own screen).
- **Bulk Import**: CSV upload, downloadable sample template with columns Employee ID, First Name, Last Name, Email, Phone, Department, Job Title, Manager, Employment Status, Date Joined, User Role; parse + validate client-side, preview table, duplicate detection by email, per-row error report, then server-side batch insert with a success summary and optional invite send.

## Phase F — Phase 2: Course authoring & assignment

- **Course Library admin**: create, edit, archive, delete, categories (`course_categories`), search and filter. Admin/Owner only.
- **Course Builder**: ordered lessons of type YouTube, uploaded MP4, PDF, PowerPoint, rich text, external link. Uploads go to a private `course-media` bucket with signed URLs. YouTube: paste URL → extract video ID → embed with the IFrame API inside the app (never redirect), track watch percentage into `lesson_progress`, gate the next lesson on the required completion percentage.
- **Assessments**: quiz builder on existing `quizzes`/`quiz_questions`/`quiz_answers`, passing score, attempt limit, lesson completion rules, certificate on/off, badge award.
- **Assignments**: target individuals, departments, groups, job titles, or everyone; due date, mandatory/optional, reminder notifications, progress and completion tracking.
- **Certificates**: auto-issued on completion with employee name, course, completion date, sequential certificate number, org logo, authorized signature and a QR verification placeholder; downloadable as PDF from the certificate card.

---

## Technical notes

- Backend logic stays in `createServerFn` modules under `src/lib/*.functions.ts` with `requireSupabaseAuth`; privileged operations (invites, resets, bulk import) load the admin client inside the handler after verifying the caller is Owner/Admin. No role decisions are made from client state.
- Every migration that creates a table includes GRANTs, RLS enable and org-scoped policies.
- Generated database types are refreshed after each migration; a typecheck runs at the end of each phase.
- PDF generation and CSV parsing use edge-compatible JS libraries (no native binaries).

## Suggested order

Phases A → B → C ship first (they unblock everything and fix the two critical bugs), then D → E, then F. Each phase is independently usable.
