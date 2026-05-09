import { AppShell } from "@/components/layout/app-shell";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { LiveAlerts } from "@/components/dashboard/live-alerts";
import { FrequencyGauge } from "@/components/dashboard/frequency-gauge";
import { ComplaintsPanel } from "@/components/dashboard/complaints-panel";
import { SankeyPanel } from "@/components/dashboard/sankey-panel";
import { GasScorecard } from "@/components/dashboard/gas-scorecard";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";
import { Map, BarChart3, GitBranch, MessageSquareWarning, ArrowRight } from "lucide-react";

function QuickNav() {
  const links = [
    { to: "/map",       icon: <Map className="w-5 h-5" />,                  label: "Generation Map",  desc: "Live plant status & grid overlay" },
    { to: "/rankings",  icon: <BarChart3 className="w-5 h-5" />,             label: "DisCo Rankings",  desc: "ATC&C loss league table" },
    { to: "/staff/complaints", icon: <MessageSquareWarning className="w-5 h-5" />, label: "Complaints", desc: "Live complaint feed & SLA tracker" },
    { to: "/value-chain", icon: <GitBranch className="w-5 h-5" />,           label: "Value Chain",     desc: "Stakeholder accountability map" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
          <>
            <CollapsiblePanel id="dash-frequency" title="Grid Frequency — Nigerian National Grid" defaultExpanded>
              <FrequencyGauge />
            </CollapsiblePanel>

            <CollapsiblePanel id="dash-sankey" title="Energy Value Chain — Physical & Financial Flow" defaultExpanded>
              <SankeyPanel />
            </CollapsiblePanel>

            <CollapsiblePanel id="dash-gas" title="Gas-to-Power Scorecard">
              <GasScorecard />
            </CollapsiblePanel>
          </>
        )}

        <CollapsiblePanel id="dash-complaints" title="Customer Service & Complaints" defaultExpanded>
          <ComplaintsPanel isDiscoAgent={user?.role === "DISCO_AGENT"} />
        </CollapsiblePanel>
      </div>
    </AppShell>
  );
}
