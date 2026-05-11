import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, AlertTriangle, TrendingUp, Zap } from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface DispatchRecord {
  id: string;
  plantId: string;
  plantName: string;
  date: string;
  actualMw: number;
  availableMw: number;
  installedMw: number;
  capacityFactor: number;
  outageReason: string | null;
  dataSource: string | null;
  synthetic: boolean;
  plant: {
    id: string;
    name: string;
    state: string;
    type: string;
  };
}

interface DispatchResponse {
  data: DispatchRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const PLANT_NAMES = [
  "All Plants",
  "Egbin",
  "Azura-Edo IPP",
  "Kainji",
  "Jebba",
  "Shiroro",
  "Zungeru",
  "Sapele Steam",
  "Sapele NIPP",
  "Geregu Gas",
  "Geregu NIPP",
  "Olorunsogo Gas",
  "Olorunsogo NIPP",
  "Omotosho Gas",
  "Omotosho NIPP",
  "Afam VI",
  "Afam IV-V",
  "Trans Amadi",
  "Ihovbor NIPP",
  "Gbarain NIPP",
  "Calabar NIPP",
  "Okpai",
  "Paras Energy",
  "Rivers IPP",
  "Notore Power",
  "Aba Integrated Power",
  "Dadin Kowa Hydro",
  "Kashimbila Hydro",
];

function useDispatch(plantName: string, outageOnly: boolean, page: number) {
  const { accessToken } = useAuth();
  return useQuery<DispatchResponse>({
    queryKey: ["dispatch-history", plantName, outageOnly, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "50" });
      if (plantName && plantName !== "All Plants") params.set("plantName", plantName);
      if (outageOnly) params.set("outageOnly", "true");
      const r = await fetch(`${API}/api/v1/admin/regulatory/dispatch-history?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return r.json();
    },
    enabled: !!accessToken,
  });
}

function pct(a: number, b: number) {
  if (!b) return "—";
  return `${((a / b) * 100).toFixed(0)}%`;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function CfBar({ cf }: { cf: number }) {
  const pctVal = Math.min(100, cf * 100);
  const color =
    pctVal >= 60 ? "bg-emerald-500" : pctVal >= 30 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pctVal}%` }} />
      </div>
      <span className="text-xs font-mono">{(cf * 100).toFixed(0)}%</span>
    </div>
  );
}

function OutageBadge({ reason }: { reason: string | null }) {
  if (!reason) return null;
  const color =
    reason === "Gas constraint"
      ? "bg-orange-600"
      : reason === "Transmission constraint"
        ? "bg-blue-600"
        : reason === "Scheduled maintenance"
          ? "bg-gray-600"
          : "bg-red-600";
  return (
    <Badge className={`${color} text-white text-xs`}>
      {reason}
    </Badge>
  );
}

export default function DispatchHistoryPage() {
  const [plantName, setPlantName] = useState("All Plants");
  const [outageOnly, setOutageOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useDispatch(plantName, outageOnly, page);
  const rows = data?.data ?? [];
  const pagination = data?.pagination;

  const totalActual = rows.reduce((a, r) => a + Number(r.actualMw), 0);
  const totalInstalled = rows.reduce((a, r) => a + Number(r.installedMw), 0);
  const avgCf = rows.length
    ? rows.reduce((a, r) => a + Number(r.capacityFactor), 0) / rows.length
    : 0;
  const withOutage = rows.filter((r) => r.outageReason).length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Activity className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dispatch History</h1>
          <p className="text-sm text-muted-foreground">
            30-day daily generation dispatch log (Apr 9 – May 8, 2026) — TCN synthetic data
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Avg Actual (MW)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {rows.length ? (totalActual / rows.length).toFixed(0) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Avg Capacity Factor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {rows.length ? `${(avgCf * 100).toFixed(1)}%` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Records With Outage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-400">{withOutage}</p>
            <p className="text-xs text-muted-foreground">
              {rows.length ? `${pct(withOutage, rows.length)} of shown` : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pagination?.total ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3 items-center">
        <Select value={plantName} onValueChange={(v) => { setPlantName(v); setPage(1); }}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filter by plant" />
          </SelectTrigger>
          <SelectContent>
            {PLANT_NAMES.map((n) => (
              <SelectItem key={n} value={n}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={outageOnly}
            onChange={(e) => { setOutageOnly(e.target.checked); setPage(1); }}
            className="rounded border-border"
          />
          Outage records only
        </label>

        <span className="ml-auto text-xs text-muted-foreground">
          {pagination
            ? `Showing ${(page - 1) * 50 + 1}–${Math.min(page * 50, pagination.total)} of ${pagination.total}`
            : ""}
        </span>
        <div className="flex gap-1">
          <button
            className="px-2 py-1 rounded text-xs border border-border disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </button>
          <button
            className="px-2 py-1 rounded text-xs border border-border disabled:opacity-40"
            disabled={!pagination || page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Plant</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Actual MW</TableHead>
                <TableHead>Available MW</TableHead>
                <TableHead>Installed MW</TableHead>
                <TableHead>Capacity Factor</TableHead>
                <TableHead>Outage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : rows.map((r) => (
                    <TableRow
                      key={r.id}
                      className={r.outageReason ? "bg-red-950/20" : "hover:bg-secondary/20"}
                    >
                      <TableCell className="font-mono text-xs">{fmtDate(r.date)}</TableCell>
                      <TableCell className="font-medium">{r.plantName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.plant?.state}
                      </TableCell>
                      <TableCell className="font-mono">
                        {Number(r.actualMw).toFixed(0)}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {Number(r.availableMw).toFixed(0)}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {Number(r.installedMw).toFixed(0)}
                      </TableCell>
                      <TableCell>
                        <CfBar cf={Number(r.capacityFactor)} />
                      </TableCell>
                      <TableCell>
                        <OutageBadge reason={r.outageReason} />
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
