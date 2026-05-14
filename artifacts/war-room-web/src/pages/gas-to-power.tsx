import { AppShell } from "@/components/layout/app-shell";
import { GasScorecard } from "@/components/dashboard/gas-scorecard";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { RequireFullAccess } from "@/components/layout/protected-route";

export default function GasToPowerPage() {
  return (
    <AppShell>
      <RequireFullAccess>
        <div className="space-y-6">
          <div className="border-b border-border pb-4">
            <h1 className="text-lg font-bold uppercase tracking-widest text-foreground">
              Gas-to-Power
            </h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-0.5 font-mono">
              NNPC / NGIC / NMDPRA focus · Pipelines · AKK progress · Diversion opportunities
            </p>
          </div>

          <CollapsiblePanel id="gas-scorecard" title="Gas-to-Power Scorecard" defaultExpanded>
            <GasScorecard />
          </CollapsiblePanel>
        </div>
      </RequireFullAccess>
    </AppShell>
  );
}
