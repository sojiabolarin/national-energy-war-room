import { AppShell } from "@/components/layout/app-shell";
import { ValueChain } from "@/components/dashboard/value-chain";
import { StakeholderMatrix } from "@/components/dashboard/stakeholder-matrix";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { RequireFullAccess } from "@/components/layout/protected-route";

export default function ValueChainPage() {
  return (
    <AppShell>
      <RequireFullAccess>
        <div className="space-y-6">
          <div className="border-b border-border pb-4">
            <h1 className="text-lg font-bold uppercase tracking-widest text-foreground">
              Value Chain
            </h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-0.5 font-mono">
              Stakeholder accountability across the energy value chain
            </p>
          </div>

          <CollapsiblePanel id="vc-chain" title="Value Chain Accountability" defaultExpanded>
            <ValueChain />
          </CollapsiblePanel>

          <CollapsiblePanel id="vc-matrix" title="Stakeholder & Escalation Matrix" defaultExpanded>
            <StakeholderMatrix />
          </CollapsiblePanel>
        </div>
      </RequireFullAccess>
    </AppShell>
  );
}
