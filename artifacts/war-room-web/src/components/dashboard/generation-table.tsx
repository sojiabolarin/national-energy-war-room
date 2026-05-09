import { useState, Fragment } from "react";
import { useGetPlants } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Users } from "lucide-react";

interface GencoOrg { id?: string; name?: string }

interface PlantItem {
  id: string;
  name: string;
  type: string;
  installedMw: string | number;
  availableMw: string | number;
  actualMw: string | number;
  state: string;
  latitude: string | number;
  longitude: string | number;
  status: string;
  paf: string | number;
  notes: string | null;
  commissioningDate: string | null;
  genco?: GencoOrg;
}

interface ApiPage<T> {
  data: T[];
  pagination?: { total: number; totalPages: number; page: number };
}

function statusBadge(status: string) {
  switch (status?.toUpperCase()) {
    case "OPERATIONAL":
      return <Badge className="bg-primary text-primary-foreground">OPERATIONAL</Badge>;
    case "PARTIAL":
      return <Badge variant="outline" className="border-primary text-primary">PARTIAL</Badge>;
    default:
      return <Badge variant="destructive">{status || "OFFLINE"}</Badge>;
  }
}

export function GenerationTable() {
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: rawData, isLoading } = useGetPlants({ page }, { query: { queryKey: ["getPlants", page] } });
  const response = rawData as unknown as ApiPage<PlantItem>;
  const plants: PlantItem[] = response?.data ?? [];
  const pagination = response?.pagination;

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Plant</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="text-right">Installed (MW)</TableHead>
              <TableHead className="text-right">Available (MW)</TableHead>
              <TableHead className="text-right">Actual (MW)</TableHead>
              <TableHead className="text-right">PAF %</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {plants.map((plant) => {
              const isOpen = expanded.has(plant.id);
              return (
                <Fragment key={plant.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-secondary/20"
                    onClick={() => toggle(plant.id)}
                  >
                    <TableCell className="pr-0">
                      {isOpen
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="font-medium">{plant.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{plant.type}</TableCell>
                    <TableCell>{plant.state}</TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(plant.installedMw).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(plant.availableMw).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(plant.actualMw).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(plant.paf).toFixed(0)}%
                    </TableCell>
                    <TableCell>{statusBadge(plant.status)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground transition-colors" title="Accountability">
                            <Users className="w-4 h-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 bg-popover text-popover-foreground border-border text-sm p-3">
                          <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
                            <span className="font-bold uppercase tracking-wide text-xs">Accountability</span>
                            <PopoverClose className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Close">
                              ×
                            </PopoverClose>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">GenCo</span>
                              <span className="font-medium">{plant.genco?.name ?? "Unknown"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Regulator</span>
                              <span className="font-medium">NERC (Gen Dept)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Escalation</span>
                              <span className="font-medium">Minister of Power</span>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                  </TableRow>

                  {isOpen && (
                    <TableRow key={`${plant.id}-detail`} className="bg-secondary/10">
                      <TableCell colSpan={10} className="py-3">
                        <div className="pl-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <div className="text-muted-foreground uppercase tracking-wider mb-1">Commissioning</div>
                            <div className="font-mono">
                              {plant.commissioningDate
                                ? new Date(plant.commissioningDate).getFullYear()
                                : "N/A"}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground uppercase tracking-wider mb-1">Coordinates</div>
                            <div className="font-mono">
                              {plant.latitude}, {plant.longitude}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground uppercase tracking-wider mb-1">Utilisation</div>
                            <div className="font-mono font-bold">
                              {plant.installedMw && Number(plant.installedMw) > 0
                                ? ((Number(plant.actualMw) / Number(plant.installedMw)) * 100).toFixed(1)
                                : "0.0"}%
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground uppercase tracking-wider mb-1">Notes</div>
                            <div className="text-muted-foreground">{plant.notes ?? "No notes."}</div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
            {plants.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  No generation plants found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span className="font-mono">{pagination?.total ?? 0} plants total</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="uppercase tracking-wider hover:text-primary disabled:opacity-40 transition-colors"
          >
            ← Prev
          </button>
          <span className="font-mono">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= (pagination?.totalPages ?? 1)}
            className="uppercase tracking-wider hover:text-primary disabled:opacity-40 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
