import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

const ALLOWED_ROLES = ["MINISTRY_STAFF", "ADMIN"];

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

  // Not authenticated at all — redirect to login with returnTo
  if (!accessToken || !user) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  // Authenticated but wrong role — redirect to login (citizen accounts use /complaints/*)
  if (!ALLOWED_ROLES.includes(user.role ?? "")) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
