import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, LogIn, UserRoundCog, Sparkles } from "lucide-react";
import { toast } from "sonner";

const SECTION_LABELS = {
  GENERAL: "General",
  COMMS: "Communications / Records",
  PROCUREMENT: "Procurement / Releasing",
  MOBILIZATION: "Mobilization",
};

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [sectionFilter, setSectionFilter] = useState("all");

  const { data: users = [] } = useQuery({
    queryKey: ["login-users"],
    queryFn: () => base44.entities.User.list("full_name", 200),
  });

  const visibleUsers = useMemo(() => {
    if (sectionFilter === "all") return users;
    return users.filter((user) => (user.section || "GENERAL") === sectionFilter);
  }, [users, sectionFilter]);

  const handleSignIn = async (email) => {
    await base44.auth.loginAs(email);
    navigate("/");
    window.location.reload();
  };

  const handleCredentialSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password");
      return;
    }

    setIsSigningIn(true);
    try {
      await base44.auth.login(email, password);
      navigate("/");
      window.location.reload();
    } catch {
      toast.error("Invalid email or password");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/10 to-background flex items-center justify-center p-6">
      <Card className="w-full max-w-6xl border-primary/20 shadow-2xl overflow-hidden">
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 p-0">
          <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-b from-red-600 to-pink-800 text-white">
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-6">
                <Building2 className="w-7 h-7" />
              </div>
              <h1 className="text-3xl font-bold leading-tight mb-3">DocTracker</h1>
              <p className="text-sm text-white/85 leading-relaxed max-w-sm">
                Secure transaction monitoring for faster document routing and clearer accountability.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-10 space-y-6 bg-card">
            <CardHeader className="p-0 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wide font-semibold">Welcome Back</span>
              </div>
              <CardTitle className="text-3xl">Sign in to your account</CardTitle>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Use your credentials to access your workspace. Enable Demo Mode below for quick walkthroughs.
              </p>
            </CardHeader>

            <form onSubmit={handleCredentialSignIn} className="space-y-5">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@docutracker.local"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="h-12"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <Button type="button" variant="outline" onClick={() => navigate("/register")}>Register</Button>
                <Button type="submit" disabled={isSigningIn} className="min-w-[130px]">
                  <LogIn className="w-4 h-4 mr-2" />
                  {isSigningIn ? "Signing in..." : "Sign In"}
                </Button>
              </div>
            </form>

            <div className="space-y-4 border rounded-xl p-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold flex items-center gap-2"><UserRoundCog className="w-4 h-4 text-primary" /> Demo Mode</p>
                  <p className="text-xs text-muted-foreground">Quickly sign in using preloaded role accounts</p>
                </div>
                <Switch checked={demoMode} onCheckedChange={setDemoMode} />
              </div>

              {demoMode && (
                <>
                  <div className="max-w-sm">
                    <Select value={sectionFilter} onValueChange={setSectionFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by section" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sections</SelectItem>
                        <SelectItem value="GENERAL">General</SelectItem>
                        <SelectItem value="COMMS">Communications / Records</SelectItem>
                        <SelectItem value="PROCUREMENT">Procurement / Releasing</SelectItem>
                        <SelectItem value="MOBILIZATION">Mobilization</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-1">
                    {visibleUsers.map((user) => (
                      <div key={user.id} className="border rounded-lg p-4 flex items-center justify-between gap-3 bg-card">
                        <div>
                          <p className="font-semibold text-sm">{user.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(SECTION_LABELS[user.section] || user.section || "General")} • {user.role}
                          </p>
                        </div>
                        <Button size="sm" variant="secondary" onClick={() => handleSignIn(user.email)}>
                          Sign In
                        </Button>
                      </div>
                    ))}
                  </div>

                  {visibleUsers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">No accounts found for this section.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
