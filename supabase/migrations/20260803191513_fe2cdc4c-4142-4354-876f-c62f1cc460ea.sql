CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    VALUES (NEW.id, v_org_id, 'super_admin'), (NEW.id, v_org_id, 'hr_admin'), (NEW.id, v_org_id, 'employee')
    ON CONFLICT DO NOTHING;
  INSERT INTO public.employees (organization_id, user_id, first_name, last_name, email, employment_status, date_joined)
    VALUES (v_org_id, NEW.id, v_first, v_last, NEW.email, 'active', CURRENT_DATE);
  RETURN NEW;
END;
$$;

INSERT INTO public.user_roles (user_id, organization_id, role)
SELECT ur.user_id, ur.organization_id, 'hr_admin'::app_role
FROM public.user_roles ur
WHERE ur.role = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles x
    WHERE x.user_id = ur.user_id AND x.organization_id = ur.organization_id AND x.role = 'hr_admin'
  );