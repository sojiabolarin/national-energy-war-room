import { AppShell } from "@/components/layout/app-shell";
import { SettlementTable } from "@/components/dashboard/settlement-table";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { RequireFullAccess } from "@/components/layout/protected-route";

export default function SettlementPage() {
  return (
    <AppShell>
      <RequireFullAccess>
        <div className="space-y-6">
          <div className="border-b border-border pb-4">
            <h1 className="text-lg font-bold uppercase tracking-widest text-foreground">
              Settlement
            </h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-0.5 font-mono">
              NBET / MO / NELMCO focus · Cash waterfall · Remittance · GenCo allocation
            </p>
          </div>

          <CollapsiblePanel id="settle-invoices" title="Settlement Invoices" defaultExpanded>
            <SettlementTable />
          </CollapsiblePanel>
        </div>
      </RequireFullAccess>
    </AppShell>
  );
}
