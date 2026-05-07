import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Must match ProtectedRoute's ALLOWED_ROLES
const STAFF_ROLES = ["MINISTRY_STAFF", "ADMIN"];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const loginMutation = useLogin();
  const { user, login, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const returnTo = searchParams.get("returnTo") ?? "/";

  const isStaff = user
    ? STAFF_ROLES.includes((user as unknown as { role?: string }).role ?? "")
    : false;

  useEffect(() => {
    // Only redirect if the authenticated user has a permitted staff role.
    // If they lack the role, stay on /login and show the access-denied state
    // so we don't create a /login ↔ / redirect loop.
    if (user && !authLoading && isStaff) {
      navigate(returnTo, { replace: true });
    }
  }, [user, authLoading, isStaff, navigate, returnTo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (res) => {
          const responseData = res as unknown as { data?: { accessToken?: string; refreshToken?: string } };
          const token = responseData.data?.accessToken;
          const refreshToken = responseData.data?.refreshToken;
          if (token) login(token, refreshToken);
        },
        onError: () => {
          toast({
            title: "Access Denied",
            description: "Invalid credentials or unauthorised personnel.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const isPending = loginMutation.isPending || (loginMutation.isSuccess && !user);

  // Authenticated but not staff — stable "no access" screen, no redirect loop
  if (user && !authLoading && !isStaff) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6 p-6">
        <ShieldOff className="w-12 h-12 text-primary" />
        <div className="text-center space-y-2 max-w-sm">
          <h1 className="text-xl font-bold uppercase tracking-widest">Access Not Authorised</h1>
          <p className="text-sm text-muted-foreground">
            Your account does not have the required clearance to access this system.
            Contact your administrator.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={logout}
          className="uppercase tracking-wider font-bold"
        >
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-primary" />

      <Card className="w-full max-w-md bg-card border-border shadow-2xl">
        <CardHeader className="text-center border-b border-border pb-6">
          <div className="mx-auto mb-4">
            <span className="inline-flex items-center justify-center bg-white rounded-full p-2 shadow-lg ring-2 ring-primary/30">
              <img
                src="/ministry-logo.png"
                alt="Federal Ministry of Power"
                className="h-20 w-20 rounded-full object-cover"
              />
            </span>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground uppercase tracking-widest">
            Minister's War Room
          </CardTitle>
          <CardDescription className="text-muted-foreground uppercase tracking-wider text-xs font-bold mt-1">
            Federal Ministry of Power · Classified Operations
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">
                Clearance ID (Email)
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="bg-background border-border text-foreground font-mono"
                placeholder="operative@mop.gov.ng"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">
                Passphrase
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-background border-border text-foreground font-mono"
                placeholder="••••••••••••"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Authenticate
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
          Unauthorised access is strictly prohibited and monitored.
        </p>
      </div>
    </div>
  );
}
