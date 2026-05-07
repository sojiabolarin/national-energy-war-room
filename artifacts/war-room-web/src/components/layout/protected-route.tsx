import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export const STAFF_ROLES = [
  "MINISTER",
  "MINISTRY_STAFF",
  "NERC_VIEWER",
  "ADMIN",
  "DISCO_AGENT",
];

const FULL_ACCESS_ONLY_PATHS = ["/", "/map", "/rankings", "/value-chain"];

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, accessToken, isLoading } = useAuth();
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

  if (!STAFF_ROLES.includes(user.role ?? "")) {
    return <Navigate to="/login" replace />;
  }

  // DISCO_AGENT is restricted to the complaints page only
  if (user.role === "DISCO_AGENT" && FULL_ACCESS_ONLY_PATHS.includes(location.pathname)) {
    return <Navigate to="/complaints" replace />;
  }

  return <>{children}</>;
}

export function RequireFullAccess({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const FULL_ACCESS_ROLES = ["MINISTER", "MINISTRY_STAFF", "NERC_VIEWER", "ADMIN"];
  if (!FULL_ACCESS_ROLES.includes(user?.role ?? "")) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <span className="text-4xl">🔒</span>
        <p className="text-muted-foreground text-sm uppercase tracking-wider">
          Your clearance level does not permit access to this section.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
