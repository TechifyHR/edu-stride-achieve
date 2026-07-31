import { Link, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Award,
  Users,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  FolderKanban,
  Building2,
  UsersRound,
  Calendar,
  Clock,
  Wallet,
  Target,
  UserPlus,
  ChevronDown,
  ClipboardList,
  User,
  Trophy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMe } from "@/lib/me.functions";
import { ViewModeProvider, useViewMode } from "@/lib/view-mode";
import { VIEW_LABELS, ROLE_LABELS, type ViewMode } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const employeeLearning: NavItem[] = [
  { to: "/my-learning", label: "My Learning", icon: GraduationCap },
  { to: "/course-library", label: "Course Library", icon: BookOpen },
  { to: "/achievements", label: "My Achievements", icon: Trophy },
];

const adminNav: NavItem[] = [
  { to: "/employees", label: "People", icon: Users },
  { to: "/departments", label: "Departments", icon: Building2 },
  { to: "/user-groups", label: "Groups", icon: UsersRound },
  { to: "/courses", label: "Courses", icon: FolderKanban },
  { to: "/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/certificates", label: "Certificates", icon: Award },
];

const comingSoon = [
  { label: "Leave", icon: Calendar },
  { label: "Attendance", icon: Clock },
  { label: "Payroll", icon: Wallet },
  { label: "Performance", icon: Target },
  { label: "Recruitment", icon: UserPlus },
];

export function AppShell({ children }: { children: ReactNode }) {
  const getMeFn = useServerFn(getMe);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => getMeFn() });

  return (
    <ViewModeProvider roles={me?.roles}>
      <Shell me={me}>{children}</Shell>
    </ViewModeProvider>
  );
}

type Me = Awaited<ReturnType<typeof getMe>>;

function Shell({ me, children }: { me: Me; children: ReactNode }) {
  const navigate = useNavigate();
  const { view } = useViewMode();
  const [learningOpen, setLearningOpen] = useState(true);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const initials = me?.employee
    ? `${me.employee.first_name?.[0] ?? ""}${me.employee.last_name?.[0] ?? ""}`.toUpperCase()
    : "U";

  return (
    <div className="min-h-screen bg-muted/30 flex">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="h-16 flex items-center gap-2 px-6 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-sidebar-foreground">PeoHub</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              by TechifyHR
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <NavSection items={[{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }]} />

          {view === "admin" ? (
            <NavSection title="Administration" items={adminNav} />
          ) : (
            <div>
              <button
                onClick={() => setLearningOpen((o) => !o)}
                className="w-full flex items-center justify-between rounded-md px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted transition"
                aria-expanded={learningOpen}
              >
                Learning
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", !learningOpen && "-rotate-90")}
                />
              </button>
              {learningOpen && (
                <div className="space-y-1 pt-1">
                  {employeeLearning.map((item) => (
                    <NavLink key={item.to} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}

          {view === "manager" && (
            <NavSection title="Team" items={[{ to: "/reports", label: "Team Reports", icon: BarChart3 }]} />
          )}

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

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-end gap-2 border-b border-border bg-background px-4 md:px-6">
          <ViewSwitcher />
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full hover:bg-muted p-1 pr-3 transition">
                <Avatar className="h-8 w-8">
                  {me?.employee?.avatar_url && <AvatarImage src={me.employee.avatar_url} alt="" />}
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
                  <span className="text-xs text-muted-foreground">
                    {(me?.roles ?? []).map((r) => ROLE_LABELS[r]).join(" · ")}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                <User className="h-4 w-4 mr-2" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/achievements" })}>
                <Trophy className="h-4 w-4 mr-2" /> My Achievements
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                <Settings className="h-4 w-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

function ViewSwitcher() {
  const { view, setView, views } = useViewMode();
  if (views.length < 2) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {VIEW_LABELS[view]}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Switch view</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={view} onValueChange={(v) => setView(v as ViewMode)}>
          {views.map((v) => (
            <DropdownMenuRadioItem key={v} value={v}>
              {VIEW_LABELS[v]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavLink({ item }: { item: NavItem }) {
  const matchRoute = useMatchRoute();
  const active = !!matchRoute({ to: item.to, fuzzy: false });
  return (
    <Link
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
}

function NavSection({ title, items }: { title?: string; items: NavItem[] }) {
  return (
    <div>
      {title && (
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      )}
      <div className="space-y-1">
        {items.map((item) => (
          <NavLink key={item.to} item={item} />
        ))}
      </div>
    </div>
  );
}
