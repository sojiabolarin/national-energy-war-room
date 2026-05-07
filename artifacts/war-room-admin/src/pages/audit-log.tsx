import { useState } from "react";
import { useGetAuditLog } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronLeft, ChevronRight, Search, Download, ScrollText } from "lucide-react";
import { formatDate } from "@/lib/utils";

const ACTION_TYPES = [
  "USER_LOGIN", "USER_LOGOUT",
  "COMPLAINT_CREATED", "COMPLAINT_UPDATED", "COMPLAINT_ESCALATED", "COMPLAINT_RESOLVED",
  "REGISTRY_CREATED", "REGISTRY_UPDATED", "REGISTRY_DELETED",
  "IMPORT_COMMITTED",
  "ALERT_CREATED", "ALERT_RESOLVED",
  "USER_CREATED", "USER_UPDATED", "USER_DELETED",
  "ESCALATION_RULE_CREATED", "ESCALATION_RULE_UPDATED",
  "SETTINGS_CHANGED",
];

const ENTITY_TYPES = ["COMPLAINT", "USER", "ORGANISATION", "PLANT", "DISCO", "ALERT", "IMPORT", "ESCALATION_RULE", "SETTINGS"];

function actionColor(action: string) {
  if (action.includes("DELETE") || action.includes("DELETED")) return "bg-destructive/20 text-destructive border-destructive/40";
  if (action.includes("CREATE") || action.includes("CREATED")) return "bg-green-600/20 text-green-400 border-green-600/40";
  if (action.includes("LOGIN")) return "bg-blue-600/20 text-blue-400 border-blue-600/40";
  if (action.includes("ESCALAT")) return "bg-orange-600/20 text-orange-400 border-orange-600/40";
  if (action.includes("RESOLV")) return "bg-green-600/20 text-green-400 border-green-600/40";
  return "bg-muted text-muted-foreground border-border";
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("all");
  const [entityType, setEntityType] = useState("all");
  const [userId, setUserId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  interface AuditEntry {
    id: string;
    action: string;
    entityType: string | null;
    entityId: string | null;
    userId: string | null;
    userEmail: string | null;
    userFullName: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    changes: { before: unknown; after: unknown } | null;
    createdAt: string;
  }
  interface AuditLogData { data?: AuditEntry[]; pagination?: { page: number; totalPages: number; total: number } }

  const params: Record<string, unknown> = { page, pageSize: 30 };
  if (action !== "all") params.action = action;
  if (entityType !== "all") params.entityType = entityType;
  if (userId.trim()) params.userId = userId.trim();
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;

  const { data, isLoading } = useGetAuditLog(params as Parameters<typeof useGetAuditLog>[0]);

  const logData = (data as unknown) as AuditLogData | undefined;
  const entries: AuditEntry[] = logData?.data ?? [];
  const pagination = logData?.pagination;

  const filtered = search
    ? entries.filter((e) => JSON.stringify(e).toLowerCase().includes(search.toLowerCase()))
    : entries;

  function exportCsv() {
    const rows = [
      ["Timestamp", "Action", "User", "Entity", "Entity ID", "IP Address", "User-Agent", "Changes"],
      ...filtered.map((e) => [
        e.createdAt, e.action,
        e.userEmail ?? e.userFullName ?? e.userId ?? "System",
        e.entityType ?? "—", e.entityId ?? "—",
        e.ipAddress ?? "—", e.userAgent ?? "—",
        e.changes ? JSON.stringify(e.changes) : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearFilters() {
    setAction("all");
    setEntityType("all");
    setUserId("");
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setPage(1);
  }

  const hasFilters = action !== "all" || entityType !== "all" || userId || dateFrom || dateTo;

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-primary" />
            Audit Log
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{pagination?.total ?? "—"} total entries · immutable record</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv}>
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      <div className="space-y-3 p-4 rounded bg-card border border-border">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search all fields…" className="pl-8 h-8 text-xs bg-background border-border" />
          </div>
          <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
            <SelectTrigger className="w-52 h-8 text-xs"><SelectValue placeholder="All Actions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {ACTION_TYPES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1); }}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Entity Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {ENTITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1); }}
            placeholder="Filter by User ID…" className="h-8 text-xs bg-background border-border w-44 font-mono" />
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="h-8 text-xs bg-background border-border w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">To</Label>
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="h-8 text-xs bg-background border-border w-36" />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <Card className="bg-card border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-border">
              <tr>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Timestamp</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Action</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">User</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Entity</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Entity ID</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">IP</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">User-Agent</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Changes</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No audit log entries found</td></tr>
              ) : filtered.map((entry, idx) => (
                  <tr key={entry.id ?? idx} className="border-b border-border hover:bg-secondary/10 text-[11px]">
                    <td className="p-3 text-muted-foreground font-mono whitespace-nowrap">{formatDate(entry.createdAt)}</td>
                    <td className="p-3">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border whitespace-nowrap ${actionColor(entry.action)}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="p-3 text-foreground max-w-[140px]">
                      <div className="truncate">{entry.userEmail ?? entry.userFullName ?? entry.userId ?? "System"}</div>
                    </td>
                    <td className="p-3 text-muted-foreground">{entry.entityType ?? "—"}</td>
                    <td className="p-3 font-mono text-muted-foreground max-w-[100px]">
                      <div className="truncate">{entry.entityId ?? "—"}</div>
                    </td>
                    <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">{entry.ipAddress ?? "—"}</td>
                    <td className="p-3 max-w-[160px]">
                      {entry.userAgent ? (
                        <span className="text-muted-foreground truncate block" title={entry.userAgent}>
                          {entry.userAgent.slice(0, 40)}{entry.userAgent.length > 40 ? "…" : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 max-w-xs">
                      {entry.changes ? (
                        <details>
                          <summary className="cursor-pointer text-primary hover:text-primary/80">View diff</summary>
                          <pre className="mt-1 text-[9px] font-mono text-muted-foreground whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                            {JSON.stringify(entry.changes, null, 2)}
                          </pre>
                        </details>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} entries
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
    </div>
  );
}
