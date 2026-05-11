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
import { Building, Eye, ExternalLink, CalendarCheck } from "lucide-react";

interface StateRegulator {
  id: string;
  externalId: string | null;
  shortName: string;
  fullName: string;
  state: string;
  establishedYear: number | null;
  legalBasis: string | null;
  address: string | null;
  website: string | null;
  email: string | null;
  chairman: string | null;
  subDiscoCarveOut: string[] | null;
  firstTariffOrderDate: string | null;
  notes: string | null;
  dataSource: string | null;
  sourceAuthorityScore: number | null;
  lowConfidence: boolean;
}

function useStateRegulators() {
  const { accessToken } = useAuth();
  return useQuery<StateRegulator[]>({
    queryKey: ["state-regulators"],
    queryFn: async () => {
      const r = await fetch(`/api/v1/admin/regulatory/state-regulators`, {
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

function TariffStatusBadge({ date }: { date: string | null }) {
  if (!date) {
    return <Badge className="bg-zinc-600 text-white text-xs">Pending</Badge>;
  }
  return <Badge className="bg-emerald-600 text-white text-xs">{fmtDate(date)}</Badge>;
}

export default function StateRegulatorsPage() {
  const { data = [], isLoading } = useStateRegulators();
  const [selected, setSelected] = useState<StateRegulator | null>(null);

  const withTariff = data.filter((r) => r.firstTariffOrderDate).length;
  const pending = data.length - withTariff;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Building className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold tracking-tight">State Electricity Regulators</h1>
          <p className="text-sm text-muted-foreground">
            State commissions established under the Electricity Act 2023 and state electricity laws
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total SERCs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4" /> Issued Tariff Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-400">{withTariff}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tariff Order Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-400">{pending}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Short Name</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Est.</TableHead>
                <TableHead>Legal Basis</TableHead>
                <TableHead>First Tariff Order</TableHead>
                <TableHead>DisCo Carve-Out</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : data.map((r) => (
                    <TableRow key={r.id} className="hover:bg-secondary/30">
                      <TableCell className="font-bold text-primary">{r.shortName}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{r.fullName}</TableCell>
                      <TableCell>{r.state}</TableCell>
                      <TableCell>{r.establishedYear ?? "—"}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">
                        {r.legalBasis ?? "—"}
                      </TableCell>
                      <TableCell>
                        <TariffStatusBadge date={r.firstTariffOrderDate} />
                      </TableCell>
                      <TableCell>
                        {r.subDiscoCarveOut?.length ? (
                          <span className="text-xs text-muted-foreground">
                            {r.subDiscoCarveOut[0]}
                            {r.subDiscoCarveOut.length > 1 && ` +${r.subDiscoCarveOut.length - 1}`}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
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
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold">
                  {selected.shortName} — {selected.fullName}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">{selected.state} State</p>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Established</p>
                    <p className="font-medium">{selected.establishedYear ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">First Tariff Order</p>
                    <TariffStatusBadge date={selected.firstTariffOrderDate} />
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Legal Basis</p>
                    <p className="font-medium">{selected.legalBasis ?? "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="font-medium">{selected.address ?? "—"}</p>
                  </div>
                  {selected.email && (
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium text-primary">{selected.email}</p>
                    </div>
                  )}
                  {selected.website && (
                    <div>
                      <p className="text-xs text-muted-foreground">Website</p>
                      <a
                        href={selected.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 text-sm"
                      >
                        {selected.website.replace(/^https?:\/\//, "")}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {selected.subDiscoCarveOut?.length && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">DisCo Carve-Out</p>
                      <div className="flex flex-wrap gap-1">
                        {selected.subDiscoCarveOut.map((c) => (
                          <Badge key={c} variant="outline" className="text-xs">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Data Source</p>
                    <p className="text-sm">{selected.dataSource ?? "—"}</p>
                  </div>
                  {selected.sourceAuthorityScore != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Authority Score</p>
                      <p className="font-mono font-bold">{selected.sourceAuthorityScore}/10</p>
                    </div>
                  )}
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
