import { AppShell } from "@/components/layout/app-shell";
import { ComplaintsPanel } from "@/components/dashboard/complaints-panel";
import { useAuth } from "@/lib/auth";

export default function ComplaintsOverviewPage() {
  const { user } = useAuth();
  const isDiscoAgent = user?.role === "DISCO_AGENT";

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="border-b border-border pb-4">
          <h1 className="text-lg font-bold uppercase tracking-widest text-foreground">
            Complaints Overview
          </h1>
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-0.5 font-mono">
            {isDiscoAgent
              ? `DisCo view — your organisation's complaints only`
              : "All DisCos · Live feed · SLA tracker · Category breakdown"}
          </p>
        </div>

        {isDiscoAgent && (
          <div className="flex items-center gap-3 bg-secondary/40 border border-border rounded-sm px-4 py-3 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
            <span>
              You are logged in as a DisCo Agent for{" "}
              <strong className="text-foreground">{user?.fullName ?? "your organisation"}</strong>.
              Only complaints assigned to your DisCo are visible.
            </span>
          </div>
        )}

        <ComplaintsPanel isDiscoAgent={isDiscoAgent} />
      </div>
    </AppShell>
  );
}
