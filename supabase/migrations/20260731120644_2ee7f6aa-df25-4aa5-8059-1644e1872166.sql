-- 1. Gender enum + employee profile fields
DO $$ BEGIN
  CREATE TYPE public.gender_type AS ENUM ('male','female','other','undisclosed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS gender public.gender_type,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Role helpers (super_admin == Workspace Owner)
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','hr_admin'));
$$;

GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hr_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated;

-- 3. Workspace creator becomes owner + employee
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id UUID; v_org_name TEXT; v_first TEXT; v_last TEXT;
BEGIN
  IF NEW.raw_user_meta_data->>'invited_org' IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization');
  v_first := COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1));
  v_last  := COALESCE(NEW.raw_user_meta_data->>'last_name', '');

  INSERT INTO public.organizations (name) VALUES (v_org_name) RETURNING id INTO v_org_id;
  INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (NEW.id, v_org_id, 'super_admin'), (NEW.id, v_org_id, 'employee')
    ON CONFLICT DO NOTHING;
  INSERT INTO public.employees (organization_id, user_id, first_name, last_name, email, employment_status, date_joined)
    VALUES (v_org_id, NEW.id, v_first, v_last, NEW.email, 'active', CURRENT_DATE);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill: earliest role holder per org becomes owner + employee
WITH firsts AS (
  SELECT DISTINCT ON (organization_id) organization_id, user_id
  FROM public.user_roles ORDER BY organization_id, created_at NULLS LAST, id
)
INSERT INTO public.user_roles (user_id, organization_id, role)
SELECT f.user_id, f.organization_id, r.role
FROM firsts f CROSS JOIN (VALUES ('super_admin'::public.app_role), ('employee'::public.app_role)) AS r(role)
ON CONFLICT (user_id, organization_id, role) DO NOTHING;

-- 5. User groups
CREATE TABLE IF NOT EXISTS public.user_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_groups TO authenticated;
GRANT ALL ON public.user_groups TO service_role;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org reads groups" ON public.user_groups FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY "admins manage groups" ON public.user_groups FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_admin())
  WITH CHECK (organization_id = public.current_org_id() AND public.is_admin());
CREATE TRIGGER trg_groups_updated BEFORE UPDATE ON public.user_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.user_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, employee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_group_members TO authenticated;
GRANT ALL ON public.user_group_members TO service_role;
ALTER TABLE public.user_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org reads group members" ON public.user_group_members FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY "admins manage group members" ON public.user_group_members FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_admin())
  WITH CHECK (organization_id = public.current_org_id() AND public.is_admin());

-- 6. Invitations
CREATE TABLE IF NOT EXISTS public.employee_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'employee',
  token text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_invitations TO authenticated;
GRANT ALL ON public.employee_invitations TO service_role;
ALTER TABLE public.employee_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage invitations" ON public.employee_invitations FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_admin())
  WITH CHECK (organization_id = public.current_org_id() AND public.is_admin());

-- 7. Notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  new_course boolean NOT NULL DEFAULT true,
  course_reminder boolean NOT NULL DEFAULT true,
  due_date boolean NOT NULL DEFAULT true,
  overdue_course boolean NOT NULL DEFAULT true,
  course_completed boolean NOT NULL DEFAULT true,
  certificate_ready boolean NOT NULL DEFAULT true,
  badge_earned boolean NOT NULL DEFAULT true,
  announcements boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notification prefs" ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_notif_prefs_updated BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. Badges
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'award',
  color text NOT NULL DEFAULT '#1D7A3E',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org reads badges" ON public.badges FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY "admins manage badges" ON public.badges FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_admin())
  WITH CHECK (organization_id = public.current_org_id() AND public.is_admin());

CREATE TABLE IF NOT EXISTS public.employee_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (badge_id, employee_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_badges TO authenticated;
GRANT ALL ON public.employee_badges TO service_role;
ALTER TABLE public.employee_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own or admin badges" ON public.employee_badges FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id() AND (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.employees e WHERE e.id = employee_badges.employee_id AND e.user_id = auth.uid())));
CREATE POLICY "admins manage employee badges" ON public.employee_badges FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_admin())
  WITH CHECK (organization_id = public.current_org_id() AND public.is_admin());

-- 9. Course categories + assignment fields
CREATE TABLE IF NOT EXISTS public.course_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_categories TO authenticated;
GRANT ALL ON public.course_categories TO service_role;
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org reads categories" ON public.course_categories FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY "admins manage categories" ON public.course_categories FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_admin())
  WITH CHECK (organization_id = public.current_org_id() AND public.is_admin());

ALTER TABLE public.course_assignments
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS mandatory boolean NOT NULL DEFAULT false;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.course_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;