import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ClassificationBanner } from "./classification-banner";
import {
  LayoutDashboard,
  Map,
  BarChart3,
  GitBranch,
  MessageSquareWarning,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    path: "/",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-4 h-4" />,
    roles: ["MINISTER", "MINISTRY_STAFF", "NERC_VIEWER", "ADMIN"],
  },
  {
    path: "/map",
    label: "Generation Map",
    icon: <Map className="w-4 h-4" />,
    roles: ["MINISTER", "MINISTRY_STAFF", "NERC_VIEWER", "ADMIN"],
  },
  {
    path: "/rankings",
    label: "DisCo Rankings",
    icon: <BarChart3 className="w-4 h-4" />,
    roles: ["MINISTER", "MINISTRY_STAFF", "NERC_VIEWER", "ADMIN"],
  },
  {
    path: "/value-chain",
    label: "Value Chain",
    icon: <GitBranch className="w-4 h-4" />,
    roles: ["MINISTER", "MINISTRY_STAFF", "NERC_VIEWER", "ADMIN"],
  },
  {
    path: "/complaints",
    label: "Complaints",
    icon: <MessageSquareWarning className="w-4 h-4" />,
    // all staff can access complaints
  },
];

function roleBadge(role?: string): string {
  switch (role) {
    case "MINISTER": return "MINISTER";
    case "ADMIN": return "ADMIN";
    case "NERC_VIEWER": return "NERC";
    case "DISCO_AGENT": return "DisCo";
    default: return "STAFF";
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userRole: string = user?.role ?? "";

  const visibleNav = NAV_ITEMS.filter((item) =>
    !item.roles || item.roles.includes(userRole)
  );

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const Sidebar = (
    <aside className="flex flex-col h-full bg-card border-r border-border w-56 shrink-0">
      {/* Logo / title */}
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center bg-white rounded-full p-1 shrink-0 ring-2 ring-primary/30 shadow">
            <img
              src="/ministry-logo.png"
              alt="Ministry of Power"
              className="h-8 w-8 rounded-full object-cover"
            />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-foreground leading-tight truncate">
              National Energy
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-primary leading-tight truncate">
              War Room
            </div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
        {visibleNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors group ${
                isActive
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"
              }`
            }
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-border px-4 py-4 space-y-3">
        <div className="space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-primary font-mono">
            {roleBadge(userRole)}
          </div>
          <div className="text-xs text-foreground font-medium truncate" title={user?.fullName ?? user?.email}>
            {user?.fullName ?? user?.email}
          </div>
          {user?.email && user?.fullName && (
            <div className="text-[10px] text-muted-foreground truncate font-mono">{user.email}</div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors font-bold w-full"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ClassificationBanner />

      <div className="flex flex-1 pt-10">
        {/* Desktop sidebar */}
        <div className="hidden md:flex">{Sidebar}</div>

        {/* Mobile top bar */}
        <div className="md:hidden fixed top-10 left-0 right-0 z-40 bg-card border-b border-border px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/ministry-logo.png" alt="" className="h-6 w-6 rounded-full object-cover" />
            <span className="text-xs font-bold uppercase tracking-widest text-foreground">War Room</span>
          </div>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="p-1.5 rounded-sm border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Mobile nav overlay */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-30 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
            <div
              className="absolute left-0 top-20 bottom-0 w-64 bg-card border-r border-border"
              onClick={(e) => e.stopPropagation()}
            >
              {Sidebar}
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto md:pt-0 pt-12">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-20">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
