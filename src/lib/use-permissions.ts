import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe } from "./me.functions";
import { NO_PERMISSIONS, type Permissions } from "./permissions";

/** Client-side permission flags, derived server-side from the caller's roles. */
export function usePermissions(): Permissions {
  const fn = useServerFn(getMe);
  const { data } = useQuery({ queryKey: ["me"], queryFn: () => fn() });
  return (data?.permissions as Permissions | undefined) ?? NO_PERMISSIONS;
}
