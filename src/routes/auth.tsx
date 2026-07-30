import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — TechifyHR LMS" },
      { name: "description", content: "Sign in or create your TechifyHR LMS workspace." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // sign in
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");

  // sign up
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suFirst, setSuFirst] = useState("");
  const [suLast, setSuLast] = useState("");
  const [suOrg, setSuOrg] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: siEmail, password: siPassword });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: suEmail,
      password: suPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: {
          first_name: suFirst,
          last_name: suLast,
          organization_name: suOrg || `${suFirst || "My"}'s Organization`,
        },
      },
    });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }

    // Some projects require email confirmation — signUp then returns no session.
    let session = data.session;
    if (!session) {
      const { data: signedIn } = await supabase.auth.signInWithPassword({
        email: suEmail,
        password: suPassword,
      });
      session = signedIn.session ?? null;
    }
    setLoading(false);

    if (!session) {
      setNeedsConfirmation(true);
      return toast.info("Check your email to confirm your account, then sign in.");
    }

    toast.success("Workspace created — you're signed in");
    navigate({ to: "/dashboard" });
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-soft via-background to-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-xl font-semibold">TechifyHR LMS</span>
        </Link>

        <Card className="shadow-elevated border-border/60">
          <CardHeader className="pb-2">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create workspace</TabsTrigger>
              </TabsList>
              <CardContent className="px-0 pt-6">
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="si-email">Work email</Label>
                      <Input id="si-email" type="email" required value={siEmail} onChange={(e) => setSiEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="si-password">Password</Label>
                      <Input id="si-password" type="password" required value={siPassword} onChange={(e) => setSiPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Signing in…" : "Sign in"}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="su-first">First name</Label>
                        <Input id="su-first" required value={suFirst} onChange={(e) => setSuFirst(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="su-last">Last name</Label>
                        <Input id="su-last" required value={suLast} onChange={(e) => setSuLast(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="su-org">Organization name</Label>
                      <Input id="su-org" placeholder="Acme Inc." required value={suOrg} onChange={(e) => setSuOrg(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="su-email">Work email</Label>
                      <Input id="su-email" type="email" required value={suEmail} onChange={(e) => setSuEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="su-password">Password</Label>
                      <Input id="su-password" type="password" required minLength={6} value={suPassword} onChange={(e) => setSuPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creating…" : "Create workspace"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      You'll be set up as the HR Administrator of your new workspace.
                    </p>
                  </form>
                </TabsContent>
              </CardContent>
            </Tabs>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
