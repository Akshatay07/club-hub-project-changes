import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ShieldCheck,
  GraduationCap,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  Info,
  Building2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type LoginRole = "admin" | "faculty";

const Login = () => {
  const [selectedRole, setSelectedRole] = useState<LoginRole>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleRoleChange = (role: LoginRole) => {
    setSelectedRole(role);
    // Clear credentials when switching roles to avoid confusion
    setEmail("");
    setPassword("");
  };

  const fillDemo = (role: LoginRole) => {
    setSelectedRole(role);
    if (role === "admin") {
      setEmail("admin@clubhub.edu");
      setPassword("Admin@2024");
    } else {
      setEmail("kavitha@clubhub.edu");
      setPassword("Faculty@123");
    }
    toast({
      title: `${role === "admin" ? "Admin" : "Faculty"} Demo Loaded`,
      description: "Demo credentials entered automatically.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login({ email, password, role: selectedRole });

      await new Promise((res) => setTimeout(res, 50));
      const userData = JSON.parse(localStorage.getItem("user") || "{}");

      toast({
        title: "Login Successful",
        description: `Welcome back, ${userData.name || (selectedRole === "admin" ? "Administrator" : "Faculty Member")}!`,
      });

      if (userData.role === "admin") {
        navigate("/admin");
      } else if (userData.role === "faculty") {
        navigate("/faculty");
      } else {
        throw new Error("Student login is disabled. Only Admin and Faculty accounts are permitted.");
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Invalid credentials. Please verify your email and password.";

      toast({
        title: "Authentication Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4 overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg z-10 space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide shadow-sm">
            <Building2 className="w-3.5 h-3.5" />
            Institutional Portal
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            College Clubs Hub
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Management portal for administrators and club faculty coordinators
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-xl border-border/70 backdrop-blur-sm bg-card/95 transition-all">
          <CardHeader className="space-y-4 pb-4">
            <div className="text-center space-y-1">
              <CardTitle className="text-xl font-bold">Sign In</CardTitle>
              <CardDescription>
                Select your account role to access your portal
              </CardDescription>
            </div>

            {/* TWO CLEAR OPTIONS: Login as Admin / Login as Faculty */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Select Login Type
              </Label>
              <div className="grid grid-cols-2 gap-2.5 p-1.5 bg-muted/60 rounded-xl border border-border/60">
                {/* OPTION 1: Admin */}
                <button
                  type="button"
                  id="admin-login-tab"
                  onClick={() => handleRoleChange("admin")}
                  className={`relative flex items-center justify-center gap-2.5 py-3 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    selectedRole === "admin"
                      ? "bg-card text-foreground shadow-md border border-border/80 ring-2 ring-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-md transition-colors ${
                      selectedRole === "admin"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="leading-tight">Login as Admin</div>
                    <div className="text-[10px] text-muted-foreground font-normal">
                      Full System Control
                    </div>
                  </div>
                </button>

                {/* OPTION 2: Faculty */}
                <button
                  type="button"
                  id="faculty-login-tab"
                  onClick={() => handleRoleChange("faculty")}
                  className={`relative flex items-center justify-center gap-2.5 py-3 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    selectedRole === "faculty"
                      ? "bg-card text-foreground shadow-md border border-border/80 ring-2 ring-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-md transition-colors ${
                      selectedRole === "faculty"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="leading-tight">Login as Faculty</div>
                    <div className="text-[10px] text-muted-foreground font-normal">
                      Club & Events Lead
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Role Context Helper Banner */}
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2.5 border transition-all ${
                selectedRole === "admin"
                  ? "bg-primary/5 border-primary/20 text-foreground"
                  : "bg-primary/5 border-primary/20 text-foreground"
              }`}
            >
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                {selectedRole === "admin" ? (
                  <span>
                    <strong className="text-primary font-medium">Administrator Access:</strong> Review clubs, assign faculty leads, manage event budgets, generate reports, and configure system settings.
                  </span>
                ) : (
                  <span>
                    <strong className="text-primary font-medium">Faculty Access:</strong> Supervise assigned club operations, oversee events, manage student attendance, and review student feedback.
                  </span>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* EMAIL */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">
                  {selectedRole === "admin" ? "Administrator Email" : "Faculty Email"}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      selectedRole === "admin"
                        ? "admin@clubhub.edu"
                        : "kavitha@clubhub.edu"
                    }
                    className="pl-9 h-11 text-sm bg-background/60"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-9 pr-10 h-11 text-sm bg-background/60"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold gap-2 shadow-md bg-gradient-primary hover:opacity-95 transition-all"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <span>
                      {selectedRole === "admin"
                        ? "Sign In as Administrator"
                        : "Sign In as Faculty"}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Quick Demo Login Credentials Section */}
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Quick Demo Accounts:
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillDemo("admin")}
                  className="text-xs h-8 justify-start px-2 font-normal border-dashed hover:border-primary"
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-primary shrink-0" />
                  <span className="truncate">Fill Admin Demo</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillDemo("faculty")}
                  className="text-xs h-8 justify-start px-2 font-normal border-dashed hover:border-primary"
                >
                  <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-primary shrink-0" />
                  <span className="truncate">Fill Faculty Demo</span>
                </Button>
              </div>
            </div>

            {/* Security Notice */}
            <p className="text-center text-[11px] text-muted-foreground pt-1">
              Institutional portal restricted to authorized staff and faculty. Student logins are disabled.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;