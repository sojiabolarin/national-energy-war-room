import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Eye } from "lucide-react";

interface BandEntry {
  band: string;
  minHoursPerDay: number;
  tariffNgnPerKwh: number;
  category: string;
}

interface TariffOrder {
  id: string;
  externalId: string | null;
  orderRef: string;
  issuingBody: string;
  scope: string;
  state: string | null;
  title: string;
  effectiveDate: string;
  expiryDate: string | null;
  applicableTo: string[];
  bandStructure: BandEntry[];
  subsidyRetained: boolean;
  notes: string | null;
  dataSource: string | null;
  sourceAuthorityScore: number | null;
  lowConfidence: boolean;
}

function useTariffOrders() {
  const { accessToken } = useAuth();
  return useQuery<TariffOrder[]>({
    queryKey: ["tariff-orders"],
    queryFn: async () => {
      const r = await fetch(`/api/v1/admin/regulatory/tariff-orders`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const j = await r.json();
      return j.data ?? [];
    },
    enabled: !!accessToken,
  });
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function ScopeBadge({ scope }: { scope: string }) {
  return (
    <Badge
      className={
        scope === "FEDERAL"
          ? "bg-blue-600 text-white"
          : "bg-emerald-600 text-white"
      }
    >
      {scope}
    </Badge>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  const color =
    score >= 9 ? "bg-emerald-600" : score >= 7 ? "bg-yellow-600" : "bg-red-600";
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${color}`}>
      {score}/10
    </span>
  );
}

function BandTable({ bands }: { bands: BandEntry[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Band</TableHead>
          <TableHead>Min Hours/Day</TableHead>
          <TableHead>Tariff (₦/kWh)</TableHead>
          <TableHead>Category</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bands.map((b) => (
          <TableRow key={b.band}>
            <TableCell className="font-bold">{b.band}</TableCell>
            <TableCell>{b.minHoursPerDay}h</TableCell>
            <TableCell className="font-mono text-primary">₦{b.tariffNgnPerKwh.toFixed(2)}</TableCell>
            <TableCell>{b.category}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function TariffOrdersPage() {
  const { data = [], isLoading } = useTariffOrders();
  const [selected, setSelected] = useState<TariffOrder | null>(null);

  const federal = data.filter((t) => t.scope === "FEDERAL");
  const state = data.filter((t) => t.scope === "STATE");

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold tracking-tight">Tariff Orders</h1>
          <p className="text-sm text-muted-foreground">
            NERC MYTO and state regulator tariff orders under the Electricity Act 2023
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Federal (NERC)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-400">{federal.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">State Regulators</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-400">{state.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Ref</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Issuing Body</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Bands</TableHead>
                <TableHead>Score</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : data.map((t) => (
                    <TableRow key={t.id} className="cursor-pointer hover:bg-secondary/30">
                      <TableCell className="font-mono text-xs">{t.orderRef}</TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium">{t.title}</TableCell>
                      <TableCell>{t.issuingBody}</TableCell>
                      <TableCell>
                        <ScopeBadge scope={t.scope} />
                        {t.state && (
                          <span className="ml-1.5 text-xs text-muted-foreground">{t.state}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{fmtDate(t.effectiveDate)}</TableCell>
                      <TableCell className="text-sm">{fmtDate(t.expiryDate)}</TableCell>
                      <TableCell className="text-center">{t.bandStructure.length}</TableCell>
                      <TableCell>
                        <ScoreBadge score={t.sourceAuthorityScore} />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelected(t)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold">
                  {selected.title}
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-mono">{selected.orderRef}</p>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Issuing Body</p>
                    <p className="font-medium">{selected.issuingBody}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Scope</p>
                    <div className="flex items-center gap-2">
                      <ScopeBadge scope={selected.scope} />
                      {selected.state && <span className="text-sm">{selected.state}</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Effective Date</p>
                    <p className="font-medium">{fmtDate(selected.effectiveDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expiry Date</p>
                    <p className="font-medium">{fmtDate(selected.expiryDate)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Applicable To</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selected.applicableTo.map((d) => (
                        <Badge key={d} variant="outline" className="text-xs">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Subsidy Retained</p>
                    <Badge className={selected.subsidyRetained ? "bg-yellow-600 text-white" : "bg-gray-600 text-white"}>
                      {selected.subsidyRetained ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Data Source</p>
                    <p className="text-sm">{selected.dataSource ?? "—"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Band Structure
                  </p>
                  <BandTable bands={selected.bandStructure} />
                </div>

                {selected.notes && (
                  <div className="bg-secondary/40 rounded p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Notes
                    </p>
                    <p className="text-sm">{selected.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
