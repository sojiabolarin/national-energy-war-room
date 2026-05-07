import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAdminListComplaints,
  useGetDiscos,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserCheck,
  TrendingUp,
  X,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS = ["FILED", "IN_REVIEW", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED", "REJECTED"] as const;
const CATEGORY_OPTIONS = ["METERING", "BILLING", "ESTIMATED_BILLING", "SUPPLY_INTERRUPTION", "VOLTAGE", "ELECTROCUTION", "INFRASTRUCTURE_DAMAGE", "CONNECTION_DELAY", "DISCONNECTION", "REFUND", "ENERGY_THEFT_REPORT", "OTHER"];
const SEVERITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function statusColor(status: string) {
  switch (status) {
    case "FILED": return "bg-blue-600/20 text-blue-400 border-blue-600/40";
    case "IN_REVIEW": return "bg-sky-600/20 text-sky-400 border-sky-600/40";
    case "IN_PROGRESS": return "bg-yellow-600/20 text-yellow-400 border-yellow-600/40";
    case "ESCALATED": return "bg-orange-600/20 text-orange-400 border-orange-600/40";
    case "RESOLVED": return "bg-green-600/20 text-green-400 border-green-600/40";
    case "CLOSED": return "bg-muted text-muted-foreground border-border";
    case "REJECTED": return "bg-destructive/20 text-destructive border-destructive/40";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

function severityColor(severity: string) {
  switch (severity) {
    case "CRITICAL": return "text-destructive";
    case "HIGH": return "text-orange-400";
    case "MEDIUM": return "text-yellow-400";
    case "LOW": return "text-green-400";
    default: return "text-muted-foreground";
  }
}

export default function ComplaintsPage() {
  const navigate = useNavigate();
  const { orgId, hasRole, canWrite, accessToken } = useAuth();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [discoId, setDiscoId] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const [escalationLevel, setEscalationLevel] = useState<string>("all");
  const [slaBreached, setSlaBreached] = useState<boolean | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigneeId, setAssigneeId] = useState("");

  const params: Record<string, unknown> = {
    page,
    pageSize: 20,
    ...(status !== "all" && { status }),
    ...(category !== "all" && { category }),
    ...(discoId !== "all" && !hasRole("DISCO_AGENT") && { discoId }),
    ...(severity !== "all" && { severity }),
    ...(escalationLevel !== "all" && { escalationLevel: parseInt(escalationLevel) }),
    ...(slaBreached !== undefined && { slaBreached }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  };

  const { data, isLoading, refetch } = useAdminListComplaints(
    params as Parameters<typeof useAdminListComplaints>[0],
  );
  const { data: discosData } = useGetDiscos({ page: 1 });

  interface ComplaintRow {
    id: string; ticketNumber: string; citizenName: string; category: string;
    status: string; severity: string; escalationLevel: number; slaBreached: boolean;
    createdAt: string; discoId: string; disco?: { id: string; name: string };
  }
  interface ComplaintListData { data?: ComplaintRow[]; pagination?: { page: number; totalPages: number; total: number } }
  interface DiscoListData { data?: { id: string; name: string }[] }

  const listData = (data as unknown) as ComplaintListData | undefined;
  const complaints: ComplaintRow[] = listData?.data ?? [];
  const pagination = listData?.pagination;
  const discos = ((discosData as unknown) as DiscoListData | undefined)?.data ?? [];

  const filtered = search
    ? complaints.filter((c) =>
        c.ticketNumber?.toLowerCase().includes(search.toLowerCase()) ||
        c.citizenName?.toLowerCase().includes(search.toLowerCase()),
      )
    : complaints;

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : filtered.map((c) => c.id));
  }

  function authHeaders(json = false): Record<string, string> {
    const h: Record<string, string> = {};
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    if (json) h["Content-Type"] = "application/json";
    return h;
  }

  async function bulkEscalate() {
    if (!selectedIds.length) return;
    setBulkLoading(true);
    let succeeded = 0;
    let failed = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/v1/admin/complaints/${id}/escalate`, {
          method: "POST",
          headers: authHeaders(true),
          body: JSON.stringify({ reason: "Bulk escalation" }),
        });
        if (res.ok) succeeded++; else failed++;
      } catch {
        failed++;
      }
    }
    toast({ title: `Escalated ${succeeded} complaints${failed > 0 ? `, ${failed} failed` : ""}` });
    setSelectedIds([]);
    void refetch();
    setBulkLoading(false);
  }

  async function bulkClose() {
    if (!selectedIds.length) return;
    setBulkLoading(true);
    let succeeded = 0;
    let failed = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/v1/admin/complaints/${id}`, {
          method: "PATCH",
          headers: authHeaders(true),
          body: JSON.stringify({ status: "CLOSED" }),
        });
        if (res.ok) succeeded++; else failed++;
      } catch {
        failed++;
      }
    }
    toast({ title: `Closed ${succeeded} complaints${failed > 0 ? `, ${failed} failed` : ""}` });
    setSelectedIds([]);
    void refetch();
    setBulkLoading(false);
  }

  async function bulkAssign() {
    if (!selectedIds.length || !assigneeId.trim()) return;
    setBulkLoading(true);
    let succeeded = 0;
    let failed = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/v1/admin/complaints/${id}/assign`, {
          method: "POST",
          headers: authHeaders(true),
          body: JSON.stringify({ assignedToUserId: assigneeId.trim() }),
        });
        if (res.ok) succeeded++; else failed++;
      } catch {
        failed++;
      }
    }
    toast({ title: `Assigned ${succeeded} complaints${failed > 0 ? `, ${failed} failed` : ""}` });
    setSelectedIds([]);
    setShowAssignModal(false);
    setAssigneeId("");
    void refetch();
    setBulkLoading(false);
  }

  function exportCsv() {
    const rows = [
      ["Ticket", "Citizen", "DisCo", "Category", "Status", "Severity", "Escalation Level", "SLA Breached", "Created"],
      ...filtered.map((c) => [
        c.ticketNumber, c.citizenName, c.disco?.name ?? c.discoId,
        c.category, c.status, c.severity, c.escalationLevel,
        c.slaBreached ? "YES" : "NO", c.createdAt,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "complaints.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest text-foreground">Complaints</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{pagination?.total ?? "—"} total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)} className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2">
            <Download className="w-4 h-4" />
            CSV
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
                <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>

              {!hasRole("DISCO_AGENT") && (
                <Select value={discoId} onValueChange={(v) => { setDiscoId(v); setPage(1); }}>
                  <SelectTrigger className="text-xs h-8"><SelectValue placeholder="DisCo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All DisCos</SelectItem>
                    {discos.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(1); }}>
                <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Severity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  {SEVERITY_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={escalationLevel} onValueChange={(v) => { setEscalationLevel(v); setPage(1); }}>
                <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Escalation Level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {[1, 2, 3, 4, 5].map((l) => <SelectItem key={l} value={String(l)}>Level {l}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select
                value={slaBreached === undefined ? "all" : slaBreached ? "true" : "false"}
                onValueChange={(v) => {
                  setSlaBreached(v === "all" ? undefined : v === "true");
                  setPage(1);
                }}
              >
                <SelectTrigger className="text-xs h-8"><SelectValue placeholder="SLA Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All SLA</SelectItem>
                  <SelectItem value="true">SLA Breached</SelectItem>
                  <SelectItem value="false">Within SLA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Filed From</Label>
                <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                  className="h-8 text-xs bg-background border-border w-36" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Filed To</Label>
                <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                  className="h-8 text-xs bg-background border-border w-36" />
              </div>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => { setDateFrom(""); setDateTo(""); }}>
                  Clear dates
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by ticket # or citizen name…"
          className="pl-9 h-8 text-sm bg-background border-border"
        />
      </div>

      {selectedIds.length > 0 && canWrite("complaints") && (
        <div className="flex items-center gap-3 p-2 rounded bg-primary/10 border border-primary/30">
          <span className="text-xs text-primary font-bold">{selectedIds.length} selected</span>
          <Button
            size="sm" variant="outline" className="h-6 text-xs gap-1"
            disabled={bulkLoading}
            onClick={() => void bulkEscalate()}
          >
            {bulkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
            Escalate
          </Button>
          <Button
            size="sm" variant="outline" className="h-6 text-xs gap-1"
            disabled={bulkLoading}
            onClick={() => setShowAssignModal(true)}
          >
            <UserCheck className="w-3 h-3" />
            Assign
          </Button>
          <Button
            size="sm" variant="outline" className="h-6 text-xs gap-1"
            disabled={bulkLoading}
            onClick={() => void bulkClose()}
          >
            {bulkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
            Close
          </Button>
          <button
            className="text-[10px] text-muted-foreground ml-auto hover:text-foreground"
            onClick={() => setSelectedIds([])}
          >
            Clear selection
          </button>
        </div>
      )}

      <Card className="bg-card border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-border">
              <tr className="text-left">
                {canWrite("complaints") && (
                  <th className="p-3 w-8">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </th>
                )}
                <th className="p-3 font-bold uppercase tracking-wider text-muted-foreground">Ticket #</th>
                <th className="p-3 font-bold uppercase tracking-wider text-muted-foreground">Citizen</th>
                {!hasRole("DISCO_AGENT") && (
                  <th className="p-3 font-bold uppercase tracking-wider text-muted-foreground">DisCo</th>
                )}
                <th className="p-3 font-bold uppercase tracking-wider text-muted-foreground">Category</th>
                <th className="p-3 font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="p-3 font-bold uppercase tracking-wider text-muted-foreground">Severity</th>
                <th className="p-3 font-bold uppercase tracking-wider text-muted-foreground">Esc. Level</th>
                <th className="p-3 font-bold uppercase tracking-wider text-muted-foreground">SLA</th>
                <th className="p-3 font-bold uppercase tracking-wider text-muted-foreground">Filed</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-muted-foreground">
                    No complaints found
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border hover:bg-secondary/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/complaints/${c.id}`)}
                  >
                    {canWrite("complaints") && (
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(c.id)}
                          onCheckedChange={() => toggleSelect(c.id)}
                        />
                      </td>
                    )}
                    <td className="p-3 font-mono text-primary font-bold">{c.ticketNumber}</td>
                    <td className="p-3 text-foreground">{c.citizenName}</td>
                    {!hasRole("DISCO_AGENT") && (
                      <td className="p-3 text-muted-foreground">{c.disco?.name ?? c.discoId}</td>
                    )}
                    <td className="p-3 text-foreground">{c.category}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${statusColor(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className={`p-3 font-bold uppercase ${severityColor(c.severity)}`}>{c.severity}</td>
                    <td className="p-3 text-center text-foreground">{c.escalationLevel}</td>
                    <td className="p-3">
                      {c.slaBreached
                        ? <span className="text-destructive font-bold">BREACHED</span>
                        : <span className="text-green-400">OK</span>}
                    </td>
                    <td className="p-3 text-muted-foreground">{formatDate(c.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-7 w-7 p-0">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="h-7 w-7 p-0">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground uppercase tracking-widest text-sm font-bold">
              Bulk Assign ({selectedIds.length} complaints)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Assign to Staff User ID</Label>
              <Input
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                placeholder="Staff user ID…"
                className="h-8 text-xs bg-background border-border font-mono"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAssignModal(false)}>Cancel</Button>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 gap-2"
                disabled={bulkLoading || !assigneeId.trim()}
                onClick={() => void bulkAssign()}
              >
                {bulkLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                <UserCheck className="w-3 h-3" />
                Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
