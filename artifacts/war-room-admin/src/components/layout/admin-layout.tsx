import { useState, ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  MessageSquareWarning,
  Factory,
  Zap,
  Building2,
  Flame,
  Construction,
  Grid3x3,
  Link2,
  BarChart3,
  Wallet,
  Bell,
  Upload,
  GitBranch,
  Users,
  ScrollText,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  ChevronRight,
  Shield,
  ShieldAlert,
  FileText,
  Activity,
} from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  requiredRoles?: string[];
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Complaints", path: "/complaints", icon: MessageSquareWarning },
  {
    label: "Registry",
    path: "/registry",
    icon: Factory,
    requiredRoles: ["ADMIN", "MINISTRY_STAFF", "NERC_VIEWER"],
    children: [
      { label: "Plants", path: "/registry/plants", icon: Factory },
      { label: "Transmission", path: "/registry/transmission", icon: Zap },
      { label: "DisCos", path: "/registry/discos", icon: Building2 },
      { label: "Gas", path: "/registry/gas", icon: Flame },
      { label: "Capital Projects", path: "/registry/projects", icon: Construction },
      { label: "Mini-Grids", path: "/registry/minigrids", icon: Grid3x3 },
      { label: "Value Chain", path: "/registry/value-chain", icon: Link2 },
    ],
  },
  {
    label: "Operations",
    path: "/operations",
    icon: BarChart3,
    requiredRoles: ["ADMIN", "MINISTRY_STAFF", "NERC_VIEWER"],
    children: [
      { label: "Grid Metrics", path: "/operations/grid-metrics", icon: BarChart3 },
      { label: "Settlement", path: "/operations/settlement", icon: Wallet },
      { label: "Alerts", path: "/operations/alerts", icon: Bell },
    ],
  },
  {
    label: "Imports",
    path: "/imports",
    icon: Upload,
    requiredRoles: ["ADMIN", "MINISTRY_STAFF"],
  },
  {
    label: "Escalation Rules",
    path: "/escalation-rules",
    icon: GitBranch,
    requiredRoles: ["ADMIN", "MINISTRY_STAFF"],
  },
  {
    label: "Data Quality",
    path: "/data-quality",
    icon: ShieldAlert,
    requiredRoles: ["ADMIN", "MINISTRY_STAFF", "NERC_VIEWER"],
  },
  {
    label: "Regulatory",
    path: "/regulatory",
    icon: FileText,
    requiredRoles: ["ADMIN", "MINISTRY_STAFF", "NERC_VIEWER"],
    children: [
      { label: "Tariff Orders", path: "/regulatory/tariff-orders", icon: FileText },
      { label: "State Regulators", path: "/regulatory/state-regulators", icon: Building2 },
      { label: "Dispatch History", path: "/regulatory/dispatch-history", icon: Activity },
    ],
  },
  {
    label: "Users & Orgs",
    path: "/users",
    icon: Users,
    requiredRoles: ["ADMIN"],
  },
  {
    label: "Audit Log",
    path: "/audit-log",
    icon: ScrollText,
    requiredRoles: ["ADMIN"],
  },
  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
    requiredRoles: ["ADMIN"],
  },
];

function NavItemEl({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const { hasRole } = useAuth();
  const [open, setOpen] = useState(false);

  if (item.requiredRoles && !item.requiredRoles.some((r) => hasRole(r))) {
    return null;
  }

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-secondary",
            depth > 0 && "pl-6",
          )}
        >
          <item.icon className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          {open ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>
        {open && (
          <div className="mt-0.5 ml-2 border-l border-border pl-2 space-y-0.5">
            {item.children.map((child) => (
              <NavItemEl key={child.path} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary",
          depth > 0 && "pl-4",
        )
      }
    >
      <item.icon className="w-4 h-4 shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  );
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const userAny = user as unknown as { fullName?: string };

  const roleColor =
    role === "ADMIN"
      ? "bg-primary text-primary-foreground"
      : role === "MINISTRY_STAFF"
        ? "bg-blue-600 text-white"
        : role === "NERC_VIEWER"
          ? "bg-yellow-600 text-white"
          : "bg-green-700 text-white";

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded bg-primary/10">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-foreground truncate">
            War Room
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
            Admin Back-Office
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-secondary text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavItemEl key={item.path} item={item} />
        ))}
      </nav>

      <div className="p-3 border-t border-border space-y-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {userAny?.fullName ?? user?.email}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
          <span
            className={cn(
              "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0",
              roleColor,
            )}
          >
            {role}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:flex w-56 shrink-0 flex-col">
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-56">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded hover:bg-secondary"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold uppercase tracking-widest">
            War Room Admin
          </span>
        </div>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
