import { AppShell } from "@/components/layout/app-shell";
import { CapitalProjects } from "@/components/dashboard/capital-projects";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { RequireFullAccess } from "@/components/layout/protected-route";

export default function CapitalProjectsPage() {
  return (
    <AppShell>
      <RequireFullAccess>
        <div className="space-y-6">
          <div className="border-b border-border pb-4">
            <h1 className="text-lg font-bold uppercase tracking-widest text-foreground">
              Capital Projects
            </h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-0.5 font-mono">
              FGN Power Co / NDPHC / REA focus · PPI · Mambilla · Zungeru · NEP / DARES
            </p>
          </div>

          <CollapsiblePanel id="capex-projects" title="Capital Projects" defaultExpanded>
            <CapitalProjects />
          </CollapsiblePanel>
        </div>
      </RequireFullAccess>
    </AppShell>
  );
}
