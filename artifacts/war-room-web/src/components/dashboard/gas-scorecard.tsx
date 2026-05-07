import { useGetGasPipelines, useGetDiversionOpportunities } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface GasPipeline {
  id: string;
  name: string;
  capacity: string | number;
  operator: string;
  status: string;
  fromPoint: string | null;
  toPoint: string | null;
  notes: string | null;
}

interface DiversionOpportunity {
  id: string;
  title?: string;
  description?: string;
  potentialMw?: string | number;
  status?: string;
}

interface ApiList<T> { data: T[] }

function pipelineStatusBadge(status: string) {
  const s = status?.toUpperCase();
  if (s === "ACTIVE" || s === "OPERATIONAL") {
    return <Badge className="bg-primary text-primary-foreground text-[10px]">{status}</Badge>;
  }
  if (s === "MAINTENANCE") {
    return <Badge variant="outline" className="border-primary text-primary text-[10px]">{status}</Badge>;
  }
  return <Badge variant="destructive" className="text-[10px]">{status || "Unknown"}</Badge>;
}

export function GasScorecard() {
  const { data: rawPipelinesData, isLoading: pipelinesLoading } = useGetGasPipelines();
  const { data: rawDiversionsData, isLoading: diversionsLoading } = useGetDiversionOpportunities();

  const pipelineResponse = rawPipelinesData as unknown as ApiList<GasPipeline>;
  const diversionResponse = rawDiversionsData as unknown as ApiList<DiversionOpportunity>;

  const pipelines: GasPipeline[] = Array.isArray(pipelineResponse?.data) ? pipelineResponse.data : [];
  const diversions: DiversionOpportunity[] = Array.isArray(diversionResponse?.data) ? diversionResponse.data : [];

  if (pipelinesLoading || diversionsLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Gas Pipeline Status
        </h4>
        <div className="rounded-sm border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pipeline</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead className="text-right">Capacity (mmscfd)</TableHead>
                <TableHead>From → To</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pipelines.map((pipe) => (
                <TableRow key={pipe.id}>
                  <TableCell className="font-medium">{pipe.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{pipe.operator}</TableCell>
                  <TableCell className="text-right font-mono">{Number(pipe.capacity)}</TableCell>
                  <TableCell className="text-sm">
                    {pipe.fromPoint && pipe.toPoint
                      ? `${pipe.fromPoint} → ${pipe.toPoint}`
                      : pipe.notes ?? "N/A"}
                  </TableCell>
                  <TableCell>{pipelineStatusBadge(pipe.status)}</TableCell>
                </TableRow>
              ))}
              {pipelines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No gas pipeline data found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {diversions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Diversion Opportunities
            </h4>
            {diversions.map((d) => (
              <div key={d.id} className="bg-card border border-border rounded-sm p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold">{d.title ?? "Opportunity"}</span>
                  {d.potentialMw && (
                    <span className="font-mono text-primary font-bold">
                      +{Number(d.potentialMw)} MW
                    </span>
                  )}
                </div>
                {d.description && (
                  <p className="text-muted-foreground text-xs mt-1">{d.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Strategic Call-Out
        </h4>
        <div className="bg-secondary/30 p-4 border border-border rounded-sm flex flex-col min-h-[200px]">
          <div className="text-primary font-bold mb-2 uppercase tracking-wide text-xs">Action Required</div>
          <p className="text-sm text-foreground/80 flex-1">
            Optimise gas-to-power allocation through real-time diversion tracking.
            Coordinate with NNPC to maximise pipeline utilisation and reduce stranded capacity.
          </p>
          <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider py-2 text-xs rounded-sm mt-4 transition-colors">
            Draft Directive
          </button>
        </div>
      </div>
    </div>
  );
}
