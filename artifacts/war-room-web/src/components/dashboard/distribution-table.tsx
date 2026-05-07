import { useState, useMemo } from "react";
import { useGetDiscos } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Users, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface DiscoItem {
  id: string;
  name: string;
  licenceNumber: string;
  atccLossPct: string | number;
  collectionEffPct: string | number;
  billingEffPct: string | number;
  meteringRatePct: string | number;
  hoursOfSupplyDaily: string | number;
  complaintsLastQuarter: string | number;
  rank: number | null;
  badge: string | null;
  enforcementStatus: string | null;
  mytoTargetAtcc: string | number | null;
}

type SortKey = "atccLossPct" | "collectionEffPct" | "hoursOfSupplyDaily";
type SortDir = "asc" | "desc";

interface ApiList<T> { data: T[] }

function SortIcon({ col, sort, dir }: { col: SortKey; sort: SortKey; dir: SortDir }) {
  if (col !== sort) return <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-40" />;
  return dir === "asc"
    ? <ArrowUp className="w-3 h-3 inline ml-1 text-primary" />
    : <ArrowDown className="w-3 h-3 inline ml-1 text-primary" />;
}

function enforcementBadge(status: string | null) {
  if (!status) return null;
  return status.toLowerCase().includes("warn")
    ? <Badge variant="outline" className="border-primary text-primary text-[10px]">{status}</Badge>
    : <Badge variant="destructive" className="text-[10px]">{status}</Badge>;
}

export function DistributionTable() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortKey>("atccLossPct");
  const [dir, setDir] = useState<SortDir>("desc");

  const { data: rawData, isLoading } = useGetDiscos(undefined, { query: { queryKey: ["getDiscos"] } });
  const response = rawData as unknown as ApiList<DiscoItem>;
  const allDiscos: DiscoItem[] = response?.data ?? [];

  const discos = useMemo(() => {
    const sorted = [...allDiscos].sort((a, b) => {
      const aVal = Number(a[sort] ?? 0);
      const bVal = Number(b[sort] ?? 0);
      return dir === "asc" ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [allDiscos, sort, dir]);

  const handleSort = (col: SortKey) => {
    if (col === sort) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(col);
      setDir("desc");
    }
  };

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
    <div className="rounded-sm border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>DisCo</TableHead>
            <TableHead
              className="text-right cursor-pointer hover:text-primary transition-colors select-none"
              onClick={() => handleSort("atccLossPct")}
            >
              ATC&C Loss % <SortIcon col="atccLossPct" sort={sort} dir={dir} />
            </TableHead>
            <TableHead
              className="text-right cursor-pointer hover:text-primary transition-colors select-none"
              onClick={() => handleSort("collectionEffPct")}
            >
              Collection Eff % <SortIcon col="collectionEffPct" sort={sort} dir={dir} />
            </TableHead>
            <TableHead className="text-right">Billing Eff %</TableHead>
            <TableHead className="text-right">Metering %</TableHead>
            <TableHead
              className="text-right cursor-pointer hover:text-primary transition-colors select-none"
              onClick={() => handleSort("hoursOfSupplyDaily")}
            >
              Hrs/Day <SortIcon col="hoursOfSupplyDaily" sort={sort} dir={dir} />
            </TableHead>
            <TableHead>Enforcement</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {discos.map((disco) => {
            const isOpen = expanded.has(disco.id);
            const atcc = Number(disco.atccLossPct);
            const atccClass = atcc > 40 ? "text-destructive font-bold" : atcc > 30 ? "text-primary" : "";
            return (
              <>
                <TableRow
                  key={disco.id}
                  className="cursor-pointer hover:bg-secondary/20"
                  onClick={() => toggle(disco.id)}
                >
                  <TableCell className="pr-0">
                    {isOpen
                      ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </TableCell>
                  <TableCell className="font-medium">{disco.name}</TableCell>
                  <TableCell className={`text-right font-mono ${atccClass}`}>
                    {Number(disco.atccLossPct).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(disco.collectionEffPct).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(disco.billingEffPct).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(disco.meteringRatePct).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(disco.hoursOfSupplyDaily).toFixed(1)}h
                  </TableCell>
                  <TableCell>{enforcementBadge(disco.enforcementStatus)}</TableCell>
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
                            <span className="text-muted-foreground">DisCo</span>
                            <span className="font-medium">{disco.name} MD</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Regulator</span>
                            <span className="font-medium">NERC (T&D Dept)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Licence</span>
                            <span className="font-mono text-xs">{disco.licenceNumber}</span>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>

                {isOpen && (
                  <TableRow key={`${disco.id}-detail`} className="bg-secondary/10">
                    <TableCell colSpan={9} className="py-3">
                      <div className="pl-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <div className="text-muted-foreground uppercase tracking-wider mb-1">MYTO Target ATC&C</div>
                          <div className="font-mono font-bold">
                            {disco.mytoTargetAtcc != null ? `${Number(disco.mytoTargetAtcc).toFixed(1)}%` : "N/A"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground uppercase tracking-wider mb-1">Complaints (Qtr)</div>
                          <div className="font-mono">{Number(disco.complaintsLastQuarter ?? 0).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground uppercase tracking-wider mb-1">Rank</div>
                          <div className="font-mono font-bold">{disco.rank != null ? `#${disco.rank}` : "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground uppercase tracking-wider mb-1">Badge</div>
                          <div>{disco.badge ?? "None"}</div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
          {discos.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                No DisCos found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
