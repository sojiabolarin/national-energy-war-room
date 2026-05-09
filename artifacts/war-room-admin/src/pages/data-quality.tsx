import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2, EyeOff, AlertTriangle, Info, RefreshCw } from "lucide-react";

interface DataQualityFlag {
  id: string;
  recordId: string;
  reason: string;
  severity: string;
  detail: string;
  status: "PENDING" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";
  notes?: string;
  resolvedAt?: string;
  createdAt: string;
}

interface Summary {
  PENDING?: number;
  ACKNOWLEDGED?: number;
  RESOLVED?: number;
  DISMISSED?: number;
}

const REASON_LABELS: Record<string, string> = {
  COORDINATE_CLUSTER: "Coordinate Cluster",
  LOW_CONFIDENCE_SOURCE: "Low-Confidence Source",
  MISSING_DATA: "Missing Data",
  DUPLICATE_RECORD: "Duplicate Record",
  OUTLIER_VALUE: "Outlier Value",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  ACKNOWLEDGED: "Acknowledged",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

function severityBadge(s: string) {
  if (s === "HIGH") return <Badge className="text-[10px] bg-destructive/20 text-destructive border-destructive/40 font-bold">HIGH</Badge>;
  if (s === "MEDIUM") return <Badge className="text-[10px] bg-yellow-600/20 text-yellow-400 border-yellow-600/40 font-bold">MEDIUM</Badge>;
  return <Badge className="text-[10px] bg-muted text-muted-foreground border-border">LOW</Badge>;
}

function statusBadge(s: string) {
  switch (s) {
    case "PENDING": return <Badge className="text-[10px] bg-primary/20 text-primary border-primary/40">Pending</Badge>;
    case "ACKNOWLEDGED": return <Badge className="text-[10px] bg-blue-600/20 text-blue-400 border-blue-600/40">Acknowledged</Badge>;
    case "RESOLVED": return <Badge className="text-[10px] bg-green-600/20 text-green-400 border-green-600/40">Resolved</Badge>;
    case "DISMISSED": return <Badge className="text-[10px] bg-muted text-muted-foreground border-border">Dismissed</Badge>;
    default: return <Badge>{s}</Badge>;
  }
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DataQualityPage() {
  const { accessToken, hasRole } = useAuth();
  const { toast } = useToast();
  const canWrite = hasRole("MINISTRY_STAFF", "ADMIN");

  const [flags, setFlags] = useState<DataQualityFlag[]>([]);
  const [summary, setSummary] = useState<Summary>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailFlag, setDetailFlag] = useState<DataQualityFlag | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  function authHeaders(): Record<string, string> {
    const h: Record<string, string> = {};
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    return h;
  }

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "100" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (severityFilter !== "all") params.set("severity", severityFilter);
      const res = await fetch(`/api/v1/admin/data-quality?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const json = await res.json() as { data?: DataQualityFlag[]; summary?: Summary };
      setFlags(json.data ?? []);
      setSummary(json.summary ?? {});
    } catch {
      toast({ title: "Could not load data quality flags", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [accessToken, statusFilter, severityFilter]);

  useEffect(() => { void fetchFlags(); }, [fetchFlags]);

  async function patchFlag(id: string, patch: { status?: string; notes?: string }) {
    setSaving(id);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json", ...authHeaders() };
      const res = await fetch(`/api/v1/admin/data-quality/${id}`, {
        method: "PATCH", headers, body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      const json = await res.json() as { data?: DataQualityFlag };
      setFlags((prev) => prev.map((f) => f.id === id ? (json.data ?? f) : f));
      if (detailFlag?.id === id) setDetailFlag(json.data ?? null);
      toast({ title: `Flag ${STATUS_LABELS[patch.status ?? "PENDING"] ?? "updated"}` });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  async function bulkUpdate(status: string) {
    if (!selected.size) return;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json", ...authHeaders() };
      await fetch("/api/v1/admin/data-quality/bulk", {
        method: "POST", headers,
        body: JSON.stringify({ ids: [...selected], status }),
      });
      setSelected(new Set());
      void fetchFlags();
      toast({ title: `${selected.size} flags marked as ${STATUS_LABELS[status] ?? status}` });
    } catch {
      toast({ title: "Bulk update failed", variant: "destructive" });
    }
  }

  const displayed = flags.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return f.recordId.toLowerCase().includes(q) || f.detail.toLowerCase().includes(q) || f.reason.toLowerCase().includes(q);
  });

  const pending = summary.PENDING ?? 0;
  const acknowledged = summary.ACKNOWLEDGED ?? 0;
  const resolved = summary.RESOLVED ?? 0;
  const dismissed = summary.DISMISSED ?? 0;
  const total = pending + acknowledged + resolved + dismissed;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">Data Quality Review Queue</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Flagged records requiring verification before operational use
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void fetchFlags()} className="h-7 text-xs gap-1.5">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Pending", value: pending, icon: <AlertTriangle className="w-4 h-4 text-primary" />, cls: "border-primary/30" },
          { label: "Acknowledged", value: acknowledged, icon: <Info className="w-4 h-4 text-blue-400" />, cls: "border-blue-600/30" },
          { label: "Resolved", value: resolved, icon: <CheckCircle2 className="w-4 h-4 text-green-400" />, cls: "border-green-600/30" },
          { label: "Dismissed", value: dismissed, icon: <EyeOff className="w-4 h-4 text-muted-foreground" />, cls: "border-border" },
        ].map((card) => (
          <div key={card.label} className={`rounded-md border ${card.cls} bg-secondary/20 px-4 py-3 flex items-center gap-3`}>
            {card.icon}
            <div>
              <div className="text-xl font-bold text-foreground font-mono">{card.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Bulk Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search record ID or detail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 text-xs bg-background border-border w-56"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-7 text-xs bg-background border-border w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="h-7 text-xs bg-background border-border w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>

        {canWrite && selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{selected.size} selected</span>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void bulkUpdate("ACKNOWLEDGED")}>Acknowledge</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs text-green-400 border-green-600/40 hover:bg-green-600/10" onClick={() => void bulkUpdate("RESOLVED")}>Resolve</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs text-muted-foreground" onClick={() => void bulkUpdate("DISMISSED")}>Dismiss</Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {canWrite && (
                <th className="p-2.5 w-8">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={selected.size === displayed.length && displayed.length > 0}
                    onChange={(e) =>
                      setSelected(e.target.checked ? new Set(displayed.map((f) => f.id)) : new Set())
                    }
                  />
                </th>
              )}
              <th className="p-2.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground">Record ID</th>
              <th className="p-2.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground">Reason</th>
              <th className="p-2.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground">Severity</th>
              <th className="p-2.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground hidden md:table-cell">Detail</th>
              <th className="p-2.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="p-2.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Flagged</th>
              {canWrite && <th className="p-2.5 text-right text-[10px] uppercase tracking-wider text-muted-foreground">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canWrite ? 8 : 6} className="text-center py-12 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                  Loading flags…
                </td>
              </tr>
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={canWrite ? 8 : 6} className="text-center py-12 text-muted-foreground">
                  {total === 0 ? "No data quality flags found." : "No flags match current filters."}
                </td>
              </tr>
            ) : (
              displayed.map((flag) => (
                <tr
                  key={flag.id}
                  className="border-b border-border hover:bg-secondary/20 cursor-pointer"
                  onClick={() => { setDetailFlag(flag); setNotesDraft(flag.notes ?? ""); }}
                >
                  {canWrite && (
                    <td className="p-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={selected.has(flag.id)}
                        onChange={(e) => {
                          const s = new Set(selected);
                          e.target.checked ? s.add(flag.id) : s.delete(flag.id);
                          setSelected(s);
                        }}
                      />
                    </td>
                  )}
                  <td className="p-2.5 font-mono text-[11px] text-foreground">{flag.recordId}</td>
                  <td className="p-2.5 text-muted-foreground">{REASON_LABELS[flag.reason] ?? flag.reason}</td>
                  <td className="p-2.5">{severityBadge(flag.severity)}</td>
                  <td className="p-2.5 hidden md:table-cell text-muted-foreground max-w-xs truncate" title={flag.detail}>
                    {flag.detail}
                  </td>
                  <td className="p-2.5">{statusBadge(flag.status)}</td>
                  <td className="p-2.5 hidden lg:table-cell text-muted-foreground">{fmtDate(flag.createdAt)}</td>
                  {canWrite && (
                    <td className="p-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        {flag.status === "PENDING" && (
                          <Button
                            size="sm" variant="outline"
                            className="h-6 text-[10px] px-2 text-blue-400 border-blue-600/30"
                            disabled={saving === flag.id}
                            onClick={() => void patchFlag(flag.id, { status: "ACKNOWLEDGED" })}
                          >
                            {saving === flag.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Ack"}
                          </Button>
                        )}
                        {flag.status !== "RESOLVED" && flag.status !== "DISMISSED" && (
                          <Button
                            size="sm" variant="outline"
                            className="h-6 text-[10px] px-2 text-green-400 border-green-600/30"
                            disabled={saving === flag.id}
                            onClick={() => void patchFlag(flag.id, { status: "RESOLVED" })}
                          >
                            {saving === flag.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Resolve"}
                          </Button>
                        )}
                        {flag.status !== "DISMISSED" && (
                          <Button
                            size="sm" variant="ghost"
                            className="h-6 text-[10px] px-2 text-muted-foreground"
                            disabled={saving === flag.id}
                            onClick={() => void patchFlag(flag.id, { status: "DISMISSED" })}
                          >
                            Dismiss
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailFlag} onOpenChange={(o) => { if (!o) setDetailFlag(null); }}>
        <DialogContent className="max-w-lg bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Flag Detail — {detailFlag?.recordId}</DialogTitle>
          </DialogHeader>
          {detailFlag && (
            <div className="space-y-4 text-xs">
              <div className="flex gap-3">
                {severityBadge(detailFlag.severity)}
                {statusBadge(detailFlag.status)}
                <span className="text-muted-foreground">{REASON_LABELS[detailFlag.reason] ?? detailFlag.reason}</span>
              </div>
              <div className="rounded-md bg-secondary/30 border border-border p-3 text-muted-foreground leading-relaxed">
                {detailFlag.detail}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Record ID</div>
                  <div className="font-mono text-foreground">{detailFlag.recordId}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Flagged On</div>
                  <div className="text-foreground">{fmtDate(detailFlag.createdAt)}</div>
                </div>
                {detailFlag.resolvedAt && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Resolved On</div>
                    <div className="text-foreground">{fmtDate(detailFlag.resolvedAt)}</div>
                  </div>
                )}
              </div>
              {canWrite && (
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Analyst Notes</div>
                  <textarea
                    rows={3}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Add verification notes, source references, or resolution rationale…"
                    className="w-full rounded-md bg-background border border-border px-2.5 py-2 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex justify-between gap-2 pt-1">
                    <div className="flex gap-1">
                      {detailFlag.status !== "ACKNOWLEDGED" && detailFlag.status !== "RESOLVED" && detailFlag.status !== "DISMISSED" && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px] text-blue-400 border-blue-600/30"
                          disabled={saving === detailFlag.id}
                          onClick={() => void patchFlag(detailFlag.id, { status: "ACKNOWLEDGED", notes: notesDraft })}>
                          Acknowledge
                        </Button>
                      )}
                      {detailFlag.status !== "RESOLVED" && (
                        <Button size="sm" className="h-7 text-[11px] bg-green-700 hover:bg-green-600 text-white"
                          disabled={saving === detailFlag.id}
                          onClick={() => void patchFlag(detailFlag.id, { status: "RESOLVED", notes: notesDraft })}>
                          {saving === detailFlag.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Mark Resolved
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-[11px]"
                        disabled={saving === detailFlag.id}
                        onClick={() => void patchFlag(detailFlag.id, { notes: notesDraft })}>
                        Save Notes
                      </Button>
                      {detailFlag.status !== "DISMISSED" && (
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] text-muted-foreground"
                          disabled={saving === detailFlag.id}
                          onClick={() => void patchFlag(detailFlag.id, { status: "DISMISSED", notes: notesDraft })}>
                          Dismiss
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
