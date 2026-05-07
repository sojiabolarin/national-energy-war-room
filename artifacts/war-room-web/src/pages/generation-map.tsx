import { AppShell } from "@/components/layout/app-shell";
import { MapPanel } from "@/components/dashboard/map-panel";
import { GenerationTable } from "@/components/dashboard/generation-table";
import { TransmissionTable } from "@/components/dashboard/transmission-table";
import { GasScorecard } from "@/components/dashboard/gas-scorecard";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { RequireFullAccess } from "@/components/layout/protected-route";

export default function GenerationMapPage() {
  return (
    <AppShell>
      <RequireFullAccess>
        <div className="space-y-6">
          <div className="border-b border-border pb-4">
            <h1 className="text-lg font-bold uppercase tracking-widest text-foreground">
              Generation Map
            </h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-0.5 font-mono">
              Live plant status · Transmission corridors · Gas pipelines
            </p>
          </div>

          {/* Full-height map — non-collapsible */}
          <div className="rounded-sm border border-border overflow-hidden">
            <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Geospatial Overview
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">LIVE · Press F for fullscreen</span>
            </div>
            <MapPanel />
          </div>

          <CollapsiblePanel id="gen-plants" title="Generation Plants" defaultExpanded>
            <GenerationTable />
          </CollapsiblePanel>

          <CollapsiblePanel id="gen-transmission" title="Transmission Lines">
            <TransmissionTable />
          </CollapsiblePanel>

          <CollapsiblePanel id="gen-gas" title="Gas-to-Power Scorecard">
            <GasScorecard />
          </CollapsiblePanel>
        </div>
      </RequireFullAccess>
    </AppShell>
  );
}
