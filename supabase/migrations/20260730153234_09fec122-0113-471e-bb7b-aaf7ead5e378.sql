-- 1. gender on employees
DO $$ BEGIN
  CREATE TYPE public.gender_type AS ENUM ('male','female','other','undisclosed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS gender public.gender_type;

-- 2. assignment target: group + start_date
ALTER TYPE public.assignee_type ADD VALUE IF NOT EXISTS 'group';
ALTER TABLE public.course_assignments ADD COLUMN IF NOT EXISTS start_date DATE;

-- 3. user_groups
CREATE TABLE IF NOT EXISTS public.user_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_groups TO authenticated;
GRANT ALL ON public.user_groups TO service_role;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read groups" ON public.user_groups
  FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "hr manage groups insert" ON public.user_groups
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_org_id() AND public.is_hr_admin());
CREATE POLICY "hr manage groups update" ON public.user_groups
  FOR UPDATE TO authenticated USING (organization_id = public.current_org_id() AND public.is_hr_admin())
  WITH CHECK (organization_id = public.current_org_id() AND public.is_hr_admin());
CREATE POLICY "hr manage groups delete" ON public.user_groups
  FOR DELETE TO authenticated USING (organization_id = public.current_org_id() AND public.is_hr_admin());

CREATE TRIGGER user_groups_set_updated_at BEFORE UPDATE ON public.user_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. user_group_members
CREATE TABLE IF NOT EXISTS public.user_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, employee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_group_members TO authenticated;
GRANT ALL ON public.user_group_members TO service_role;
ALTER TABLE public.user_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read group members" ON public.user_group_members
  FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY "hr manage group members insert" ON public.user_group_members
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_org_id() AND public.is_hr_admin());
CREATE POLICY "hr manage group members delete" ON public.user_group_members
  FOR DELETE TO authenticated USING (organization_id = public.current_org_id() AND public.is_hr_admin());

-- 5. employee_invitations
CREATE TABLE IF NOT EXISTS public.employee_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'employee',
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_invitations TO authenticated;
GRANT ALL ON public.employee_invitations TO service_role;
ALTER TABLE public.employee_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr read invitations" ON public.employee_invitations
  FOR SELECT TO authenticated USING (organization_id = public.current_org_id() AND public.is_hr_admin());
CREATE POLICY "hr insert invitations" ON public.employee_invitations
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_org_id() AND public.is_hr_admin());
CREATE POLICY "hr update invitations" ON public.employee_invitations
  FOR UPDATE TO authenticated USING (organization_id = public.current_org_id() AND public.is_hr_admin())
  WITH CHECK (organization_id = public.current_org_id() AND public.is_hr_admin());
CREATE POLICY "hr delete invitations" ON public.employee_invitations
  FOR DELETE TO authenticated USING (organization_id = public.current_org_id() AND public.is_hr_admin());

CREATE TRIGGER employee_invitations_set_updated_at BEFORE UPDATE ON public.employee_invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.employee_invitations(token);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.user_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_employee ON public.user_group_members(employee_id);