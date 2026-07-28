
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_org_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_hr_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
