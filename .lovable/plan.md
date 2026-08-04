# Fix Role Permissions & Access Control (RBAC)

## The bug, confirmed

Saving a course runs a check that reads the signed-in user's role with a query expecting **exactly one row** (`src/lib/courses.functions.ts`, lines 57-63). A Workspace Owner or Admin has three role rows (owner + admin + employee), so that query returns nothing, the check fails, and the app shows "Only HR admins can manage courses" even though the person is an Admin. Every other admin action uses a different helper that reads all roles correctly, which is why only course creation breaks.

## What will change

### 1. One permission layer, no hard-coded role strings

Add a single permissions module used by both the interface and the server:

```text
canManageOrganization   owner only
canManagePeople         owner, admin
canBulkImport           owner, admin
canManageGroups         owner, admin
canManageDepartments    owner, admin
canManageRoles          owner, admin (admins cannot touch the owner)
canCreateCourse         owner, admin
canEditCourse           owner, admin
canDeleteCourse         owner, admin
canPublishCourse        owner, admin
canManageQuiz           owner, admin
canAssignCourse         owner, admin, manager
canViewReports          owner, admin, manager (manager sees own team only)
canLearn                everyone
```

Server functions stop asking "is this person an HR admin" and start asking "does this person have this permission". The broken single-row role query is replaced with the all-roles lookup, which fixes the reported message immediately.

### 2. Course management opened to every Admin

Create, edit, publish, archive and delete courses, lessons and quizzes all move to `canCreateCourse` / `canEditCourse` / `canPublishCourse`. Workspace Owner and Admin pass these; Manager and Employee do not.

### 3. Managers get assignment rights

Managers can assign already-published courses to people in their department or their direct reports, view their team's progress and certificates, and send reminders. They cannot create, edit or delete courses, manage people, departments, groups, or import users. Assignment targets offered to a manager are limited to their own team and department.

### 4. Owner protections

The Workspace Owner role can never be removed by anyone, including the owner. Admins cannot delete, demote or impersonate the owner, transfer ownership, or delete the organization.

### 5. Interface follows permissions

Sidebar entries, buttons and page actions render from the permission flags rather than role names, so an Admin sees the full Course Builder, a Manager sees Course Library plus assignment and reporting, and an Employee sees learner screens only. Blocked pages show a clear "you don't have access" state instead of a broken screen.

### 6. Database rules updated to match

A migration adds a manager check function and extends the access rules so:

- Managers can create and remove course assignments within their organization for their team/department.
- Managers can read employee and progress rows for their team.
- Course, lesson and quiz write rules stay owner/admin only.
- A safeguard prevents deleting the last Workspace Owner role row of an organization.

## Technical notes

- New `src/lib/permissions.ts` (client-safe): `AppRole[] -> Permissions` derivation plus a `can()` helper; `src/lib/roles.ts` keeps labels and view modes and re-exports from it.
- `src/lib/authz.server.ts`: `getCaller` gains a `permissions` object; add `requirePermission(supabase, userId, key, action)`; keep `requireAdmin`/`requireOwner` as thin wrappers.
- `src/lib/courses.functions.ts`: remove the `maybeSingle()` role lookup in `saveCourse` and gate `saveCourse`, `deleteCourse`, `saveLesson`, `deleteLesson`, `reorderLessons`, `setCourseStatus` with `requirePermission`; `assignCourse`/`removeAssignment` use `canAssignCourse` with manager scope validation on the target ids.
- `src/lib/admin.functions.ts`: swap each `requireAdmin` call for the matching `requirePermission`; role-mutating functions reject any change to a `super_admin` row.
- `src/lib/me.functions.ts` returns the derived permissions so the interface reads one source of truth; `AppShell`, `courses.tsx`, `assignments.tsx`, `employees.tsx`, `departments.tsx`, `user-groups.tsx`, `reports.tsx` consume it.
- Migration: `public.is_manager()` security-definer helper, manager insert/delete/select policies on `course_assignments`, manager select scope on `employees` and `lesson_progress`, and a trigger blocking removal of an organization's last `super_admin` role.
