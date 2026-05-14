import { AppShell } from "@/components/layout/app-shell";
import { TransmissionTable } from "@/components/dashboard/transmission-table";
import { FrequencyGauge } from "@/components/dashboard/frequency-gauge";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { RequireFullAccess } from "@/components/layout/protected-route";

export default function TransmissionPage() {
  return (
    <AppShell>
      <RequireFullAccess>
        <div className="space-y-6">
          <div className="border-b border-border pb-4">
            <h1 className="text-lg font-bold uppercase tracking-widest text-foreground">
              Transmission
            </h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-0.5 font-mono">
              TCN focus · 330kV corridors · Frequency · System collapse log
            </p>
          </div>

          <CollapsiblePanel id="tx-frequency" title="Grid Frequency — Nigerian National Grid" defaultExpanded>
            <FrequencyGauge />
          </CollapsiblePanel>

          <CollapsiblePanel id="tx-lines" title="Transmission Lines" defaultExpanded>
            <TransmissionTable />
          </CollapsiblePanel>
        </div>
      </RequireFullAccess>
    </AppShell>
  );
}
