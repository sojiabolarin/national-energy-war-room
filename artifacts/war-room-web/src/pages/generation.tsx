import { AppShell } from "@/components/layout/app-shell";
import { GenerationTable } from "@/components/dashboard/generation-table";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { RequireFullAccess } from "@/components/layout/protected-route";

export default function GenerationPage() {
  return (
    <AppShell>
      <RequireFullAccess>
        <div className="space-y-6">
          <div className="border-b border-border pb-4">
            <h1 className="text-lg font-bold uppercase tracking-widest text-foreground">
              Generation
            </h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-0.5 font-mono">
              GenCo &amp; plant focus · Stranded capacity · Fuel mix · Gas-supply linkage
            </p>
          </div>

          <CollapsiblePanel id="gen-plants" title="Generation Plants" defaultExpanded>
            <GenerationTable />
          </CollapsiblePanel>
        </div>
      </RequireFullAccess>
    </AppShell>
  );
}
