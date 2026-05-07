import { useState } from "react";
import { useGetTransmissionLines } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Users } from "lucide-react";

interface SubstationRef { id?: string; name?: string }

interface TransmissionLine {
  id: string;
  name: string;
  voltageKv: string | number;
  lengthKm: string | number;
  capacityMva: string | number;
  currentLoadingPct: string | number;
  lossesPct: string | number;
  status: string;
  notes: string | null;
  fromSubstation?: SubstationRef;
  toSubstation?: SubstationRef;
}

interface ApiPage<T> {
  data: T[];
  pagination?: { total: number; totalPages: number; page: number };
}

function statusBadge(status: string) {
  const s = status?.toUpperCase();
  if (s === "ACTIVE" || s === "OPERATIONAL") {
    return <Badge className="bg-primary text-primary-foreground">{status}</Badge>;
  }
  if (s === "MAINTENANCE") {
    return <Badge variant="outline" className="border-primary text-primary">{status}</Badge>;
  }
  return <Badge variant="destructive">{status || "UNKNOWN"}</Badge>;
}

export function TransmissionTable() {
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: rawData, isLoading } = useGetTransmissionLines(
    { page },
    { query: { queryKey: ["getTransmissionLines", page] } }
  );
  const response = rawData as unknown as ApiPage<TransmissionLine>;
  const lines: TransmissionLine[] = response?.data ?? [];
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
              <TableHead>Line</TableHead>
              <TableHead className="text-right">Voltage (kV)</TableHead>
              <TableHead className="text-right">Length (km)</TableHead>
              <TableHead className="text-right">Capacity (MVA)</TableHead>
              <TableHead className="text-right">Loading %</TableHead>
              <TableHead className="text-right">Losses %</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => {
              const isOpen = expanded.has(line.id);
              const loading = Number(line.currentLoadingPct);
              const loadingClass = loading > 90 ? "text-destructive" : loading > 70 ? "text-primary" : "";
              return (
                <>
                  <TableRow
                    key={line.id}
                    className="cursor-pointer hover:bg-secondary/20"
                    onClick={() => toggle(line.id)}
                  >
                    <TableCell className="pr-0">
                      {isOpen
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="font-medium">{line.name}</TableCell>
                    <TableCell className="text-right font-mono">{Number(line.voltageKv)}</TableCell>
                    <TableCell className="text-right font-mono">{Number(line.lengthKm)}</TableCell>
                    <TableCell className="text-right font-mono">{Number(line.capacityMva)}</TableCell>
                    <TableCell className={`text-right font-mono font-bold ${loadingClass}`}>
                      {loading.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-mono">{Number(line.lossesPct).toFixed(2)}%</TableCell>
                    <TableCell>{statusBadge(line.status)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground transition-colors" title="Accountability">
                            <Users className="w-4 h-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 bg-popover border-border text-sm p-3">
                          <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
                            <span className="font-bold uppercase tracking-wide text-xs">Accountability</span>
                            <PopoverClose className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Close">
                              ×
                            </PopoverClose>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Operator</span>
                              <span className="font-medium">TCN</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Regulator</span>
                              <span className="font-medium">NERC (T&D Dept)</span>
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
                    <TableRow key={`${line.id}-detail`} className="bg-secondary/10">
                      <TableCell colSpan={9} className="py-3">
                        <div className="pl-6 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                          <div>
                            <div className="text-muted-foreground uppercase tracking-wider mb-1">From</div>
                            <div className="font-medium">{line.fromSubstation?.name ?? "N/A"}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground uppercase tracking-wider mb-1">To</div>
                            <div className="font-medium">{line.toSubstation?.name ?? "N/A"}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground uppercase tracking-wider mb-1">Notes</div>
                            <div className="text-muted-foreground">{line.notes ?? "No notes."}</div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
            {lines.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No transmission lines found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span className="font-mono">{pagination?.total ?? 0} lines total</span>
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
