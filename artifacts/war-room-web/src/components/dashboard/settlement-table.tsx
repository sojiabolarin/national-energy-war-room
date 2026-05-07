import { useState } from "react";
import { useGetSettlementInvoices } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Users, X } from "lucide-react";

interface DiscoRef { id?: string; name?: string }

interface SettlementItem {
  id: string;
  period: string;
  discoId: string;
  mooInvoiceNgn: string | number;
  nbetInvoiceNgn: string | number;
  drogAdjustedNgn: string | number | null;
  remittedNgn: string | number;
  remittancePct: string | number;
  cumulativeDebtNgn: string | number | null;
  enforcementStatus: string | null;
  notes: string | null;
  disco?: DiscoRef;
}

interface ApiList<T> { data: T[] }

function remittanceBadge(pct: number) {
  if (pct >= 95) return <Badge className="bg-primary text-primary-foreground text-[10px]">PAID</Badge>;
  if (pct >= 50) return <Badge variant="outline" className="border-primary text-primary text-[10px]">PARTIAL</Badge>;
  return <Badge variant="destructive" className="text-[10px]">DEFAULTING</Badge>;
}

const fmt = (v: string | number | null | undefined) =>
  v != null && v !== "" ? `₦${Number(v).toLocaleString()}` : "—";

export function SettlementTable() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: rawData, isLoading } = useGetSettlementInvoices(
    undefined,
    { query: { queryKey: ["getSettlementInvoices"] } }
  );
  const response = rawData as unknown as ApiList<SettlementItem>;
  const settlements: SettlementItem[] = response?.data ?? [];

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
            <TableHead>Period</TableHead>
            <TableHead>DisCo</TableHead>
            <TableHead className="text-right">MOO Invoice</TableHead>
            <TableHead className="text-right">NBET Invoice</TableHead>
            <TableHead className="text-right">Remitted</TableHead>
            <TableHead className="text-right">Rem. %</TableHead>
            <TableHead className="text-right">Cumul. Debt</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {settlements.map((s) => {
            const isOpen = expanded.has(s.id);
            const remPct = Number(s.remittancePct);
            const hasDebt = s.cumulativeDebtNgn != null && Number(s.cumulativeDebtNgn) > 0;
            return (
              <>
                <TableRow
                  key={s.id}
                  className="cursor-pointer hover:bg-secondary/20"
                  onClick={() => toggle(s.id)}
                >
                  <TableCell className="pr-0">
                    {isOpen
                      ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{s.period}</TableCell>
                  <TableCell className="font-medium">{s.disco?.name ?? "Unknown"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmt(s.mooInvoiceNgn)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmt(s.nbetInvoiceNgn)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmt(s.remittedNgn)}</TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {remPct.toFixed(1)}%
                  </TableCell>
                  <TableCell className={`text-right font-mono text-sm ${hasDebt ? "text-destructive" : ""}`}>
                    {fmt(s.cumulativeDebtNgn)}
                  </TableCell>
                  <TableCell>{remittanceBadge(remPct)}</TableCell>
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
                            <X size={14} />
                          </PopoverClose>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">DisCo</span>
                            <span className="font-medium">{s.disco?.name ?? "Unknown"} MD</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Bulk Trader</span>
                            <span className="font-medium">NBET CEO</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Enforcement</span>
                            <span className="font-medium">{s.enforcementStatus ?? "None"}</span>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>

                {isOpen && (
                  <TableRow key={`${s.id}-detail`} className="bg-secondary/10">
                    <TableCell colSpan={10} className="py-3">
                      <div className="pl-6 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <div className="text-muted-foreground uppercase tracking-wider mb-1">DROG Adjusted</div>
                          <div className="font-mono">{fmt(s.drogAdjustedNgn)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground uppercase tracking-wider mb-1">Enforcement</div>
                          <div>{s.enforcementStatus ?? "No action"}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground uppercase tracking-wider mb-1">Notes</div>
                          <div className="text-muted-foreground">{s.notes ?? "No notes."}</div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
          {settlements.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                No settlement invoices found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
