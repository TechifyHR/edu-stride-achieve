## Goal

Give the HR Admin real admin power: add people (with invite emails), organise them into user groups, build courses with lessons, and assign courses to individuals/departments/groups with start and due dates.

## 1. Database additions

- Add `gender` to employees (male / female / other / prefer not to say, optional).
- New `user_groups` table (name, description, org).
- New `user_group_members` join table (group + employee).
- New `employee_invitations` table (email, token, role, expiry, status) so invited people can set a password.
- Extend the assignment target type with `group`, and add a `start_date` to assignments (due date already exists).
- All new tables get org-scoped access rules: HR Admins manage, employees read what concerns them.

## 2. Add People (Employees page)

Replace the read-only directory with a full management screen:
- "Add person" dialog: first name, last name, gender, email, department, job title, platform role (HR Admin / Manager / Employee), and user groups.
- Saving creates the employee record and sends an invite email with a link to set a password.
- Row actions: edit details, resend invite, deactivate.
- Filters by department, group, status; search by name/email.
- Departments manageable inline (create on the fly).

## 3. Invite acceptance

New public page `/invite` — the invited person opens the emailed link, sets a password, and is linked to their existing employee record with the role the admin chose. Expired/used links show a clear message.

## 4. User Groups page

New "User Groups" item under Administration:
- List groups with member counts.
- Create/rename/delete a group.
- Add or remove members from the directory.
- Groups become an assignment target.

## 5. Course Builder

Upgrade the Courses page for HR Admins:
- Create/edit course: title, description, category, difficulty, thumbnail, mandatory flag, pass score, certificate toggle, status (draft/published).
- Lesson builder inside a course: ordered list, drag to reorder, lesson types YouTube, uploaded video, PDF, PPT, text, link; per-lesson minimum watch percentage.
- Publish/archive control.

## 6. Assign courses with timeline

From a course (or the Assignments tab):
- Choose targets: individual employees, departments, user groups, a platform role, or the whole company.
- Set start date, due date, reminder frequency.
- See who is assigned and their progress state.
- Assigned courses show up on the employee's My Learning and feed the Dashboard "Overdue" KPI.

## Technical notes

- New tables via one migration with grants + RLS scoped by `current_org_id()` and `is_hr_admin()`.
- Admin actions go through `createServerFn` with `requireSupabaseAuth`; role is verified server-side, never from the client.
- Invites: server function creates the invited auth user and mails a set-password link; account creation uses the privileged server client only after the caller is confirmed HR Admin.
- File uploads (thumbnails, videos, PDFs, PPT) use a new storage bucket with org-scoped paths.
- Reordering lessons writes `order_index` in a single batched update.
