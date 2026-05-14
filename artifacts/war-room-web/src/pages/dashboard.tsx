import { AppShell } from "@/components/layout/app-shell";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { LiveAlerts } from "@/components/dashboard/live-alerts";
import { SankeyPanel } from "@/components/dashboard/sankey-panel";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";
import { useGetComplaintStats } from "@workspace/api-client-react";
import {
  Map, Zap, Cable, BarChart3, Banknote, Flame, Building2, MessageSquareWarning,
  GitBranch, ArrowRight,
} from "lucide-react";

interface ComplaintStats {
  totalOpen?: number;
  slaBreachCount?: number;
  avgSatisfactionScore?: number;
}

function QuickNav() {
  const links = [
    { to: "/generation",       icon: <Zap className="w-5 h-5" />,                  label: "Generation",       desc: "Plants · fuel mix · stranded capacity" },
    { to: "/transmission",     icon: <Cable className="w-5 h-5" />,                label: "Transmission",     desc: "TCN · frequency · 330kV corridors" },
    { to: "/distribution",     icon: <BarChart3 className="w-5 h-5" />,             label: "Distribution",     desc: "DisCos · ATC&C · service bands" },
    { to: "/settlement",       icon: <Banknote className="w-5 h-5" />,              label: "Settlement",       desc: "NBET · remittance · allocation" },
    { to: "/gas",              icon: <Flame className="w-5 h-5" />,                 label: "Gas-to-Power",     desc: "Pipelines · AKK · diversion" },
    { to: "/capital-projects", icon: <Building2 className="w-5 h-5" />,             label: "Capital Projects", desc: "PPI · Mambilla · REA NEP/DARES" },
    { to: "/staff/complaints", icon: <MessageSquareWarning className="w-5 h-5" />,  label: "Complaints",       desc: "Live feed · SLA tracker" },
    { to: "/value-chain",      icon: <GitBranch className="w-5 h-5" />,             label: "Value Chain",      desc: "Stakeholder accountability" },
    { to: "/map",              icon: <Map className="w-5 h-5" />,                   label: "Map",              desc: "Geo-first reference view" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 mb-6">
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          className="group flex flex-col gap-2 bg-card border border-border rounded-sm p-4 hover:border-primary/50 hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-center justify-between text-primary">
            {l.icon}
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-foreground">{l.label}</div>
          <div className="text-[10px] text-muted-foreground leading-snug">{l.desc}</div>
        </Link>
      ))}
    </div>
  );
}

interface ApiOk<T> { data: T }

function ComplaintsSummary() {
  const { data: rawStats, isLoading } = useGetComplaintStats({});
  const response = rawStats as unknown as ApiOk<ComplaintStats>;
  const stats: ComplaintStats = response?.data ?? {};

  if (isLoading) return <Skeleton className="h-24 w-full" />;

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-card border border-border rounded-sm p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Open Complaints</div>
        <div className="text-2xl font-bold font-mono text-foreground mt-1">{stats.totalOpen ?? 0}</div>
      </div>
      <div className="bg-card border border-border rounded-sm p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">SLA Breaches</div>
        <div className="text-2xl font-bold font-mono text-destructive mt-1">{stats.slaBreachCount ?? 0}</div>
      </div>
      <div className="bg-card border border-border rounded-sm p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Avg Satisfaction</div>
        <div className="text-2xl font-bold font-mono text-foreground mt-1">
          {stats.avgSatisfactionScore != null ? Number(stats.avgSatisfactionScore).toFixed(1) : "—"}
        </div>
      </div>
      <Link
        to="/staff/complaints"
        className="col-span-3 group flex items-center justify-between bg-secondary/30 border border-border rounded-sm px-4 py-2 hover:border-primary/50 transition-colors"
      >
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground">
          View full complaints overview
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
      </Link>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const hasFullAccess = ["MINISTER", "MINISTRY_STAFF", "NERC_VIEWER", "ADMIN"].includes(user?.role ?? "");

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page header */}
        <div className="border-b border-border pb-4">
          <h1 className="text-lg font-bold uppercase tracking-widest text-foreground">
            Sector Intelligence Overview
          </h1>
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-0.5 font-mono">
            Federal Ministry of Power · Real-time grid monitoring
          </p>
        </div>

        {hasFullAccess && (
          <>
            <KpiRow />
            <QuickNav />
          </>
        )}

        <CollapsiblePanel id="dash-alerts" title="Live Alerts" defaultExpanded>
          <LiveAlerts />
        </CollapsiblePanel>

        {hasFullAccess && (
          <CollapsiblePanel id="dash-sankey" title="Energy Value Chain — Physical & Financial Flow" defaultExpanded>
            <SankeyPanel />
          </CollapsiblePanel>
        )}

        <CollapsiblePanel id="dash-complaints" title="Customer Service & Complaints — Summary" defaultExpanded>
          <ComplaintsSummary />
        </CollapsiblePanel>
      </div>
    </AppShell>
  );
}
