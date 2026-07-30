import { Link, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Award,
  Users,
  BarChart3,
  Settings,
  Bell,
  Search,
  LogOut,
  FolderKanban,
  UserCog,
  Calendar,
  Clock,
  Wallet,
  Target,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMe } from "@/lib/me.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; hrOnly?: boolean };

const primary: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];
const learning: NavItem[] = [
  { to: "/my-learning", label: "My Learning", icon: GraduationCap },
  { to: "/course-library", label: "Course Library", icon: BookOpen },
  { to: "/certificates", label: "Certificates", icon: Award },
];
const admin: NavItem[] = [
  { to: "/courses", label: "Courses", icon: FolderKanban, hrOnly: true },
  { to: "/employees", label: "People", icon: Users, hrOnly: true },
  { to: "/user-groups", label: "User Groups", icon: UserCog, hrOnly: true },
  { to: "/reports", label: "Reports", icon: BarChart3, hrOnly: true },
];

const comingSoon = [
  { label: "People", icon: UserCog },
  { label: "Leave", icon: Calendar },
  { label: "Attendance", icon: Clock },
  { label: "Payroll", icon: Wallet },
  { label: "Performance", icon: Target },
  { label: "Recruitment", icon: UserPlus },
];

export function AppShell({ children }: { children: ReactNode }) {
  const getMeFn = useServerFn(getMe);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => getMeFn() });
  const navigate = useNavigate();
  const isHr = me?.role === "hr_admin" || me?.role === "super_admin";

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const initials = me?.employee
    ? `${me.employee.first_name?.[0] ?? ""}${me.employee.last_name?.[0] ?? ""}`.toUpperCase()
    : "U";

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="h-16 flex items-center gap-2 px-6 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-sidebar-foreground">TechifyHR</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Learning</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <NavSection items={primary} />
          <NavSection title="Learning" items={learning} />
          {isHr && <NavSection title="Administration" items={admin} />}
          <div>
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Coming Soon
            </p>
            <div className="space-y-1">
              {comingSoon.map((c) => (
                <div
                  key={c.label}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground"
                >
                  <span className="flex items-center gap-3">
                    <c.icon className="h-4 w-4" />
                    {c.label}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">Soon</Badge>
                </div>
              ))}
            </div>
          </div>
          <NavSection items={[{ to: "/settings", label: "Settings", icon: Settings }]} />
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center gap-3 border-b border-border bg-background px-4 md:px-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search courses, employees, certificates…" className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background" />
          </div>
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full hover:bg-muted p-1 pr-3 transition">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium">
                  {me?.employee ? `${me.employee.first_name} ${me.employee.last_name}` : "Account"}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{me?.organization?.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{me?.role?.replace("_", " ")}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                <Settings className="h-4 w-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

function NavSection({ title, items }: { title?: string; items: NavItem[] }) {
  const matchRoute = useMatchRoute();
  return (
    <div>
      {title && (
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      )}
      <div className="space-y-1">
        {items.map((item) => {
          const active = !!matchRoute({ to: item.to, fuzzy: false });
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-muted",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
