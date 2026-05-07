import { ClassificationBanner } from "@/components/layout/classification-banner";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { PanelHeader, CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { FrequencyGauge } from "@/components/dashboard/frequency-gauge";
import { GenerationTable } from "@/components/dashboard/generation-table";
import { TransmissionTable } from "@/components/dashboard/transmission-table";
import { DistributionTable } from "@/components/dashboard/distribution-table";
import { SettlementTable } from "@/components/dashboard/settlement-table";
import { SankeyPanel } from "@/components/dashboard/sankey-panel";
import { GasScorecard } from "@/components/dashboard/gas-scorecard";
import { CapitalProjects } from "@/components/dashboard/capital-projects";
import { ComplaintsPanel } from "@/components/dashboard/complaints-panel";
import { LiveAlerts } from "@/components/dashboard/live-alerts";
import { StakeholderMatrix } from "@/components/dashboard/stakeholder-matrix";
import { ValueChain } from "@/components/dashboard/value-chain";
import { MapPanel } from "@/components/dashboard/map-panel";
import { useAuth } from "@/lib/auth";

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background pt-10 pb-20 px-4 md:px-8">
      <ClassificationBanner />

      <main className="max-w-7xl mx-auto mt-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center bg-white rounded-full p-1 shrink-0 ring-2 ring-primary/30 shadow">
              <img
                src="/ministry-logo.png"
                alt="Federal Ministry of Power"
                className="h-10 w-10 rounded-full object-cover"
              />
            </span>
            <div>
              <h1 className="text-xl font-bold text-foreground uppercase tracking-widest leading-tight">
                National Energy War Room
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                Federal Ministry of Power · Office of the Minister
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground font-mono uppercase">
              {user?.fullName ?? user?.email}
            </span>
            <button
              onClick={logout}
              className="text-muted-foreground hover:text-destructive uppercase tracking-wider transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        <KpiRow />
        <PanelHeader />

        {/* Geospatial Overview — non-collapsible per spec */}
        <div className="rounded-sm border border-border overflow-hidden">
          <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Geospatial Overview
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">LIVE · Press F for fullscreen</span>
          </div>
          <MapPanel />
        </div>

        <CollapsiblePanel id="sankey" title="Energy & Financial Flow (Sankey)">
          <SankeyPanel />
        </CollapsiblePanel>

        <CollapsiblePanel id="frequency" title="Grid Frequency">
          <FrequencyGauge />
        </CollapsiblePanel>

        <CollapsiblePanel id="generation" title="Generation Plants">
          <GenerationTable />
        </CollapsiblePanel>

        <CollapsiblePanel id="transmission" title="Transmission Lines">
          <TransmissionTable />
        </CollapsiblePanel>

        <CollapsiblePanel id="distribution" title="Distribution Companies">
          <DistributionTable />
        </CollapsiblePanel>

        <CollapsiblePanel id="settlement" title="Settlement Invoices">
          <SettlementTable />
        </CollapsiblePanel>

        <CollapsiblePanel id="gas" title="Gas-to-Power Scorecard">
          <GasScorecard />
        </CollapsiblePanel>

        <CollapsiblePanel id="capital" title="Capital Projects">
          <CapitalProjects />
        </CollapsiblePanel>

        <CollapsiblePanel id="complaints" title="Customer Service & Complaints">
          <ComplaintsPanel />
        </CollapsiblePanel>

        <CollapsiblePanel id="alerts" title="Live Alerts">
          <LiveAlerts />
        </CollapsiblePanel>

        <CollapsiblePanel id="matrix" title="Stakeholder & Escalation Matrix">
          <StakeholderMatrix />
        </CollapsiblePanel>

        <CollapsiblePanel id="value-chain" title="Value Chain Accountability">
          <ValueChain />
        </CollapsiblePanel>
      </main>
    </div>
  );
}
