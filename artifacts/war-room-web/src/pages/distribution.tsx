import { AppShell } from "@/components/layout/app-shell";
import { DistributionTable } from "@/components/dashboard/distribution-table";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { RequireFullAccess } from "@/components/layout/protected-route";
import { useGetDiscos } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DiscoItem {
  id: string;
  name: string;
  rank: number | null;
  atccLossPct: string | number;
  hoursOfSupplyDaily: string | number;
  badge: string | null;
  collectionEffPct: string | number;
}

interface ApiList<T> { data: T[] }

function LeaguePodium() {
  const { data: rawData, isLoading } = useGetDiscos(undefined, { query: { queryKey: ["getDiscosRanking"] } });
  const response = rawData as unknown as ApiList<DiscoItem>;
  const discos: DiscoItem[] = response?.data ?? [];

  const ranked = [...discos]
    .filter((d) => d.rank != null)
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    .slice(0, 5);

  if (isLoading) return <Skeleton className="h-24 w-full" />;

  if (ranked.length === 0) return null;

  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
  const badgeClass: Record<string, string> = {
    CRITICAL: "border-destructive text-destructive",
    WARN: "border-primary text-primary",
    OK: "border-muted text-muted-foreground",
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
      {ranked.map((d, i) => (
        <div
          key={d.id}
          className={`bg-card border rounded-sm p-4 flex flex-col gap-2 ${
            i === 0 ? "border-primary" : "border-border"
          }`}
        >
          <div className="text-2xl">{medals[i] ?? `#${(d.rank ?? i + 1)}`}</div>
          <div className="text-xs font-bold uppercase tracking-wider text-foreground leading-tight">
            {d.name}
          </div>
          <div className="text-[10px] text-muted-foreground">
            ATC&C: <span className="font-mono font-bold">{Number(d.atccLossPct).toFixed(1)}%</span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            Hrs/Day: <span className="font-mono font-bold">{Number(d.hoursOfSupplyDaily).toFixed(1)}h</span>
          </div>
          {d.badge && (
            <span
              className={`text-[9px] font-bold uppercase tracking-wider border px-1.5 py-0.5 rounded-sm w-fit ${
                badgeClass[d.badge] ?? "border-muted text-muted-foreground"
              }`}
            >
              {d.badge}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function DistributionPage() {
  return (
    <AppShell>
      <RequireFullAccess>
        <div className="space-y-6">
          <div className="border-b border-border pb-4">
            <h1 className="text-lg font-bold uppercase tracking-widest text-foreground">
              Distribution
            </h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-0.5 font-mono">
              DisCo focus · ATC&amp;C league table · Service-band compliance · Metering rollout
            </p>
          </div>

          <LeaguePodium />

          <CollapsiblePanel id="dist-discos" title="Distribution Companies — Full Table" defaultExpanded>
            <DistributionTable />
          </CollapsiblePanel>
        </div>
      </RequireFullAccess>
    </AppShell>
  );
}
