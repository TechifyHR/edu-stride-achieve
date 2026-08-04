CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'manager');
$$;

GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;

DROP POLICY IF EXISTS "hr manages assignments" ON public.course_assignments;
CREATE POLICY "admins and managers manage assignments"
ON public.course_assignments
FOR ALL
TO authenticated
USING (organization_id = public.current_org_id() AND (public.is_hr_admin() OR public.is_manager()))
WITH CHECK (organization_id = public.current_org_id() AND (public.is_hr_admin() OR public.is_manager()));

DROP POLICY IF EXISTS "employee reads own progress" ON public.lesson_progress;
CREATE POLICY "employee reads own progress"
ON public.lesson_progress
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.employees e
  WHERE e.id = lesson_progress.employee_id
    AND e.organization_id = public.current_org_id()
    AND (e.user_id = auth.uid() OR public.is_hr_admin() OR public.is_manager())
));