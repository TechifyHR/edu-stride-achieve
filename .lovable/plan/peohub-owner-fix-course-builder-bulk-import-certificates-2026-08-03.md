# PeoHub — Owner fix, Course Builder, Bulk Import, Certificates

## 1. Workspace creation makes a full Workspace Owner

Verified current state: the signup trigger already creates the organization, the employee record, and grants `super_admin` + `employee`, but it does **not** grant the Admin role — two of the four existing workspaces have no admin row. That is why the owner lands in the Employee-only experience.

- Update the signup trigger so the first user of a workspace receives Workspace Owner + Admin + Employee together.
- Backfill the Admin role for existing workspace owners who are missing it.
- Guard role editing so a Workspace Owner can never drop their own owner role, and regular Admins cannot remove or demote the owner.

## 2. Land in Admin View after creating a workspace

- Sign-up sets a one-time flag so the new owner arrives on the Admin Dashboard instead of the Employee dashboard.
- Normal sign-in keeps the current rule: always start in Employee View.
- The header View Switcher continues to move freely between Employee / Admin / Manager.

## 3. Course Builder (replaces the placeholder Courses page)

- Course list with search, status filter (draft / published / archived), and row actions: edit, publish, archive, duplicate-free delete (soft delete).
- Course editor with basics (title, description, category, difficulty, duration, mandatory, passing score, certificate toggle) plus a lesson list with drag-free up/down reordering.
- Lesson types: YouTube (paste URL, video ID extracted automatically, embedded player that never navigates to YouTube, watch-progress tracking with a required completion percentage before the next lesson unlocks), uploaded MP4, PDF, PowerPoint, rich text, and external link.
- Uploads go to the existing course media storage bucket.
- Only Workspace Owner / Admin can reach these screens or the write actions behind them.

## 4. Course assignment

- Assignment dialog from a course, plus a full Assignments page listing existing assignments.
- Targets: individual employees, departments, groups, or the entire organization.
- Options: start date, due date, mandatory/optional, reminder frequency.
- Assignments feed learner progress and completion counts already tracked in the database.

## 5. Bulk CSV import on the People page

- Download Sample CSV Template with columns: Employee ID, First Name, Last Name, Email, Phone, Department, Job Title, Manager, Employment Status, Date Joined, User Role.
- Upload → parsed preview table before anything is saved.
- Validation of required fields and email format, duplicate-email detection against the CSV and the existing directory, invalid rows skipped and listed in an error report, and a success summary (imported / skipped / failed).
- Imported people are created with their roles and invited by email.

## 6. Certificate PDF generation

- On course completion (all lessons done and quiz passed where required), a certificate row is generated with a unique certificate number, then rendered to PDF and stored in the private certificates bucket.
- Certificate layout: organization logo and name, employee name, course name, completion date, certificate number, authorized signature line, and a QR placeholder for future verification.
- Certificates appear under My Achievements and on the Certificates page with preview and download.

## Technical notes

- Database migration: update `handle_new_user()` to insert the `hr_admin` role alongside `super_admin`/`employee`; backfill missing `hr_admin` rows for existing owners; add any missing lesson/progress columns needed for watch-percentage tracking.
- New/updated server functions in `src/lib/courses.functions.ts`, `admin.functions.ts` (bulk import), and a new `certificates.functions.ts`; all writes re-check permissions via `requireAdmin`/`requireOwner` in `authz.server.ts`, never trusting the client view mode.
- New dependencies: `papaparse` for CSV, `jspdf` + `qrcode` for certificate PDF rendering (generated server-side and uploaded to storage).
- Pages rebuilt from placeholders: `courses.tsx`, `assignments.tsx`, `certificates.tsx`; `employees.tsx` gains the import flow; `my-learning.tsx` gains the lesson player.
- Storage: signed URLs for private course media and certificate downloads.
