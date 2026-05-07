import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type UserRole } from "@/lib/auth";
import { Loader2, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const ADMIN_ROLES: UserRole[] = [
  "DISCO_AGENT",
  "NERC_VIEWER",
  "MINISTRY_STAFF",
  "ADMIN",
];

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
}

export function ProtectedRoute({
  children,
  requiredRoles,
}: ProtectedRouteProps) {
  const { user, accessToken, isLoading, role, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!accessToken || !user) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  if (!ADMIN_ROLES.includes(role ?? "")) {
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

  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(role ?? "")) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6 p-6">
          <ShieldOff className="w-12 h-12 text-primary" />
          <div className="text-center space-y-2 max-w-sm">
            <h1 className="text-xl font-bold uppercase tracking-widest">
              Insufficient Clearance
            </h1>
            <p className="text-sm text-muted-foreground">
              This section requires elevated privileges. Contact your
              administrator.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
