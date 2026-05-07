import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, ShieldOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ADMIN_ROLES = ["DISCO_AGENT", "NERC_VIEWER", "MINISTRY_STAFF", "ADMIN"];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const loginMutation = useLogin();
  const { user, role, login, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const returnTo = searchParams.get("returnTo") ?? "/dashboard";

  const isAdminUser = user ? ADMIN_ROLES.includes(role ?? "") : false;

  useEffect(() => {
    if (user && !authLoading && isAdminUser) {
      if (role === "DISCO_AGENT") {
        navigate("/complaints", { replace: true });
      } else {
        navigate(returnTo, { replace: true });
      }
    }
  }, [user, authLoading, isAdminUser, role, navigate, returnTo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (res) => {
          const r = res as unknown as {
            data?: { accessToken?: string; refreshToken?: string };
          };
          const token = r.data?.accessToken;
          const refreshToken = r.data?.refreshToken;
          if (token) login(token, refreshToken);
        },
        onError: () => {
          toast({
            title: "Access Denied",
            description: "Invalid credentials or unauthorised personnel.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const isPending =
    loginMutation.isPending || (loginMutation.isSuccess && !user);

  if (user && !authLoading && !isAdminUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6 p-6">
        <ShieldOff className="w-12 h-12 text-primary" />
        <div className="text-center space-y-2 max-w-sm">
          <h1 className="text-xl font-bold uppercase tracking-widest">
            Access Not Authorised
          </h1>
          <p className="text-sm text-muted-foreground">
            Your account does not have clearance for the Admin Back-Office.
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
            <span className="inline-flex items-center justify-center bg-primary/10 rounded-full p-4">
              <ShieldOff className="w-10 h-10 text-primary" />
            </span>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground uppercase tracking-widest">
            Admin Back-Office
          </CardTitle>
          <CardDescription className="text-muted-foreground uppercase tracking-wider text-xs font-bold mt-1">
            National Energy War Room · Staff Access
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-xs uppercase tracking-wider text-muted-foreground"
              >
                Staff Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="bg-background border-border text-foreground font-mono"
                placeholder="operative@nerc.gov.ng"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-xs uppercase tracking-wider text-muted-foreground"
              >
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
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
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
