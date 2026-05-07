import { useState, useEffect, useRef, useCallback } from "react";
import { useGetComplaintStats, useAdminListComplaints } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Clock, Save, Filter } from "lucide-react";

interface CategoryCount { _count: { id: number }; category: string }
interface EscalationLevel { _count: { id: number }; escalationLevel: number }

interface ComplaintStats {
  openByCategory?: CategoryCount[];
  escalationPyramid?: EscalationLevel[];
  slaBreachCount?: number;
  avgSatisfactionScore?: number;
  totalOpen?: number;
}

interface Complaint {
  id?: string;
  ticketNumber?: string;
  category?: string;
  status?: string;
  severity?: string;
  escalationLevel?: number;
  slaBreached?: boolean;
  createdAt?: string;
  citizenName?: string;
  disco?: { name?: string };
}

interface ComplaintEvent {
  id?: string;
  eventType?: string;
  notes?: string;
  createdAt?: string;
  actor?: { fullName?: string; role?: string } | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  SUPPLY_INTERRUPTION: "Supply Interruption",
  BILLING: "Billing",
  VOLTAGE: "Voltage",
  ELECTROCUTION: "Safety",
  DISCONNECTION: "Disconnection",
  INFRASTRUCTURE_DAMAGE: "Infrastructure",
  REFUND: "Refund",
  OTHER: "Other",
  CONNECTION_DELAY: "Connection",
  METERING: "Metering",
  ESTIMATED_BILLING: "Est. Billing",
  ENERGY_THEFT_REPORT: "Energy Theft",
};

function ageHours(createdAt?: string): number {
  if (!createdAt) return 0;
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 3_600_000);
}

function slaColor(age: number, breached?: boolean): string {
  if (breached || age > 72) return "text-destructive";
  if (age > 24) return "text-muted-foreground";
  return "text-foreground";
}

function severityClass(severity?: string): string {
  switch (severity?.toUpperCase()) {
    case "CRITICAL": return "text-destructive font-bold";
    case "HIGH": return "text-primary font-bold";
    default: return "text-muted-foreground";
  }
}

const NOTE_KEY = "war-room-strategic-note";

interface ComplaintsPanelProps {
  isDiscoAgent?: boolean;
}

export function ComplaintsPanel({ isDiscoAgent = false }: ComplaintsPanelProps) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const { data: rawStats, isLoading: statsLoading } = useGetComplaintStats({
    query: { enabled: !isDiscoAgent },
  });
  const { data: rawComplaints, isLoading: compLoading } = useAdminListComplaints(
    { pageSize: 100 },
    { query: { queryKey: ["adminListComplaints", isDiscoAgent] } }
  );

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [complaintEvents, setComplaintEvents] = useState<Record<string, ComplaintEvent[]>>({});
  const [strategicNote, setStrategicNote] = useState<string>(
    () => { try { return localStorage.getItem(NOTE_KEY) ?? ""; } catch { return ""; } }
  );
  const [noteSaved, setNoteSaved] = useState(false);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [sseStatus, setSseStatus] = useState<"connecting" | "live" | "error">("connecting");
  const activeRef = useRef(true);

  useEffect(() => {
    if (!accessToken) return;
    activeRef.current = true;
    setSseStatus("connecting");

    const run = async () => {
      try {
        const res = await fetch("/api/v1/complaints/stream-alerts", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "text/event-stream",
          },
        });
        if (!res.ok || !res.body) { setSseStatus("error"); return; }
        setSseStatus("live");

        const reader = res.body.getReader();
        const dec = new TextDecoder();

        while (activeRef.current) {
          const { value, done } = await reader.read();
          if (done) break;
          for (const line of dec.decode(value).split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const d = JSON.parse(line.substring(6)) as Record<string, unknown>;
              if (typeof d.totalOpen === "number") setLiveCount(d.totalOpen);
              void queryClient.invalidateQueries({ queryKey: ["getComplaintStats"] });
              void queryClient.invalidateQueries({ queryKey: ["adminListComplaints"] });
            } catch { /* skip malformed events */ }
          }
        }
      } catch {
        setSseStatus("error");
      }
    };

    run();
    return () => { activeRef.current = false; };
  }, [accessToken, queryClient]);

  const fetchEvents = useCallback(async (id: string) => {
    if (!accessToken || complaintEvents[id] !== undefined) return;
    try {
      const res = await fetch(`/api/v1/admin/complaints/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      // On any failure, resolve with empty so the UI shows "No events" not "Loading..."
      if (!res.ok) {
        setComplaintEvents((prev) => ({ ...prev, [id]: [] }));
        return;
      }
      const json = await res.json() as { data?: { events?: ComplaintEvent[] } };
      const evts = (json.data?.events ?? []).slice(-3);
      setComplaintEvents((prev) => ({ ...prev, [id]: evts }));
    } catch {
      setComplaintEvents((prev) => ({ ...prev, [id]: [] }));
    }
  }, [accessToken, complaintEvents]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        void fetchEvents(id);
      }
      return next;
    });
  };

  const toggleCategoryFilter = (category: string) => {
    setSelectedCategory((prev) => (prev === category ? null : category));
  };

  const saveNote = () => {
    try { localStorage.setItem(NOTE_KEY, strategicNote); } catch {}
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  if ((statsLoading && !isDiscoAgent) || compLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const rawList: Complaint[] = ((rawComplaints as unknown as { data?: Complaint[] })?.data) ?? [];

  // For DISCO_AGENT: server already scopes the list to their DisCo via JWT.
  // Derive stats client-side from the scoped list instead of using the global stats endpoint.
  const allComplaints: Complaint[] = rawList;

  let stats: ComplaintStats;
  if (isDiscoAgent) {
    // Compute stats from the scoped list
    const openComplaints = allComplaints.filter((c) => c.status !== "RESOLVED" && c.status !== "CLOSED");
    const catMap: Record<string, number> = {};
    for (const c of openComplaints) {
      const cat = c.category ?? "OTHER";
      catMap[cat] = (catMap[cat] ?? 0) + 1;
    }
    const escMap: Record<number, number> = {};
    for (const c of allComplaints) {
      const lvl = c.escalationLevel ?? 1;
      escMap[lvl] = (escMap[lvl] ?? 0) + 1;
    }
    stats = {
      totalOpen: openComplaints.length,
      slaBreachCount: allComplaints.filter((c) => c.slaBreached).length,
      openByCategory: Object.entries(catMap).map(([category, count]) => ({
        category,
        _count: { id: count },
      })),
      escalationPyramid: Object.entries(escMap).map(([level, count]) => ({
        escalationLevel: Number(level),
        _count: { id: count },
      })),
    };
  } else {
    stats = (rawStats as unknown as { data?: ComplaintStats })?.data ?? {};
  }

  // Apply category filter to the complaints table
  const complaints = selectedCategory
    ? allComplaints.filter((c) => c.category === selectedCategory)
    : allComplaints;

  const openByCategory = stats.openByCategory ?? [];
  const escalationPyramid = stats.escalationPyramid ?? [];
  const maxCatCount = Math.max(1, ...openByCategory.map((c) => c._count.id));
  const maxEscCount = Math.max(1, ...escalationPyramid.map((e) => e._count.id));

  // League table: group complaints by disco — only shown to full-access roles
  const discoMap: Record<string, { name: string; total: number; breached: number }> = {};
  if (!isDiscoAgent) {
    for (const c of allComplaints) {
      const name = c.disco?.name ?? "Unknown";
      if (!discoMap[name]) discoMap[name] = { name, total: 0, breached: 0 };
      discoMap[name].total++;
      if (c.slaBreached) discoMap[name].breached++;
    }
  }
  const leagueTable = Object.values(discoMap)
    .sort((a, b) => b.breached / Math.max(b.total, 1) - a.breached / Math.max(a.total, 1))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* SSE Live indicator */}
      <div className="flex items-center justify-end gap-2 -mt-2 mb-1">
        {sseStatus === "live" ? (
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            Live
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono opacity-50">
            {sseStatus === "error" ? "Stream Error" : "Connecting…"}
          </span>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border rounded-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-2 flex items-center justify-between">
              Total Open
              {!isDiscoAgent && liveCount !== null && liveCount !== (stats.totalOpen ?? 0) && (
                <span className="text-primary font-mono text-[9px]">↑ LIVE</span>
              )}
            </div>
            <div className="text-2xl font-bold font-mono">
              {!isDiscoAgent && liveCount !== null ? liveCount : (stats.totalOpen ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-destructive/50 rounded-sm">
          <CardContent className="p-4">
            <div className="text-xs text-destructive uppercase tracking-wider font-bold mb-2">SLA Breached</div>
            <div className="text-2xl font-bold font-mono text-destructive">{stats.slaBreachCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border rounded-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-2">Satisfaction</div>
            <div className="text-2xl font-bold font-mono">
              {stats.avgSatisfactionScore != null ? Number(stats.avgSatisfactionScore).toFixed(1) : "---"}
              <span className="text-sm text-muted-foreground">/5</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border rounded-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-2">Loaded</div>
            <div className="text-2xl font-bold font-mono">{allComplaints.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Category heat strip — clicking a bar filters the active complaints table */}
      {openByCategory.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Open Complaints by Category
            </h3>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-1 text-[10px] text-primary hover:underline uppercase tracking-wider"
              >
                <Filter className="w-3 h-3" />
                Clear Filter
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">Click a bar to filter the complaints table below.</p>
          <div className="flex gap-2 flex-wrap items-end">
            {openByCategory.map((cat) => {
              const isActive = selectedCategory === cat.category;
              const barH = Math.max(4, (cat._count.id / maxCatCount) * 56);
              return (
                <button
                  key={cat.category}
                  onClick={() => toggleCategoryFilter(cat.category)}
                  title={`Filter by ${CATEGORY_LABELS[cat.category] ?? cat.category}`}
                  className={`flex flex-col items-center gap-1 min-w-[52px] focus:outline-none group transition-opacity ${
                    selectedCategory && !isActive ? "opacity-30" : "opacity-100"
                  }`}
                >
                  <div
                    className="w-full rounded-sm transition-all group-hover:opacity-90"
                    style={{
                      background: "hsl(var(--primary))",
                      height: `${barH}px`,
                      opacity: isActive ? 1 : 0.4 + 0.6 * (cat._count.id / maxCatCount),
                      minWidth: 52,
                      outline: isActive ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                      outlineOffset: 2,
                    }}
                  />
                  <span className={`text-[9px] uppercase tracking-wider text-center leading-tight ${
                    isActive ? "text-primary font-bold" : "text-muted-foreground"
                  }`}>
                    {CATEGORY_LABELS[cat.category] ?? cat.category}
                  </span>
                  <span className={`text-[10px] font-bold font-mono ${isActive ? "text-primary" : ""}`}>
                    {cat._count.id}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Escalation pyramid */}
      {escalationPyramid.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Escalation Pyramid
          </h3>
          <div className="space-y-1">
            {[1, 2, 3, 4, 5].map((level) => {
              const entry = escalationPyramid.find((e) => e.escalationLevel === level);
              const count = entry?._count.id ?? 0;
              const pct = count / maxEscCount;
              const isCritical = level === 5;
              return (
                <div key={level} className="flex items-center gap-3">
                  <span className={`text-xs font-mono font-bold w-5 shrink-0 ${isCritical ? "text-destructive" : "text-muted-foreground"}`}>
                    L{level}
                  </span>
                  <div className="flex-1 bg-secondary rounded-sm overflow-hidden h-5">
                    <div
                      className="h-full rounded-sm transition-all"
                      style={{
                        width: `${Math.max(pct * 100, count > 0 ? 2 : 0)}%`,
                        background: isCritical ? "hsl(var(--destructive))" : "hsl(var(--primary))",
                        opacity: isCritical ? 1 : 0.65 + 0.35 * pct,
                      }}
                    />
                  </div>
                  <span className={`text-xs font-mono w-8 text-right ${isCritical ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active complaints table */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Active Complaints
          </h3>
          {selectedCategory && (
            <span className="text-[10px] font-mono text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-sm">
              {CATEGORY_LABELS[selectedCategory] ?? selectedCategory} · {complaints.length}
            </span>
          )}
        </div>
        <div className="rounded-sm border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-6" />
                <TableHead>Ticket</TableHead>
                <TableHead>Citizen</TableHead>
                {!isDiscoAgent && <TableHead>DisCo</TableHead>}
                <TableHead>Category</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <Clock className="w-3.5 h-3.5 inline mr-1" />Age
                </TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {complaints.map((c, idx) => {
                const rowId = c.id ?? c.ticketNumber ?? `row-${idx}`;
                const age = ageHours(c.createdAt);
                const isL5 = (c.escalationLevel ?? 0) >= 5;
                const expanded = expandedRows.has(rowId);

                return (
                  <>
                    <TableRow
                      key={rowId}
                      className={`cursor-pointer ${isL5 ? "bg-destructive/10 hover:bg-destructive/15" : "hover:bg-secondary/30"}`}
                      onClick={() => toggleRow(rowId)}
                    >
                      <TableCell className="pr-0">
                        {expanded
                          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{c.ticketNumber ?? "—"}</TableCell>
                      <TableCell className="text-sm max-w-[100px] truncate" title={c.citizenName ?? ""}>
                        {c.citizenName ?? "Anonymous"}
                      </TableCell>
                      {!isDiscoAgent && (
                        <TableCell className="text-sm">{c.disco?.name ?? "Unknown"}</TableCell>
                      )}
                      <TableCell className="text-sm">{CATEGORY_LABELS[c.category ?? ""] ?? c.category ?? "—"}</TableCell>
                      <TableCell className={`text-xs ${severityClass(c.severity)}`}>
                        {c.severity ?? "MEDIUM"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`font-mono ${isL5 ? "border-destructive text-destructive" : ""}`}
                        >
                          L{c.escalationLevel ?? 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{c.status ?? "FILED"}</TableCell>
                      <TableCell className={`font-mono text-sm ${slaColor(age, c.slaBreached)}`}>
                        {age}h
                        {c.slaBreached && (
                          <span className="ml-1 text-[9px] uppercase text-destructive font-bold">BREACHED</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {(c.escalationLevel ?? 1) < 5 && (
                            <button
                              className="text-[9px] uppercase tracking-wider font-bold text-primary hover:underline px-1"
                              title="Escalate this complaint"
                            >
                              Escalate
                            </button>
                          )}
                          <button
                            className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground hover:text-primary px-1"
                            title="Assign to DisCo"
                          >
                            Assign
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {expanded && (
                      <TableRow key={`${rowId}-detail`} className={isL5 ? "bg-destructive/5" : "bg-secondary/10"}>
                        <TableCell colSpan={isDiscoAgent ? 9 : 10} className="py-3">
                          <div className="pl-5 space-y-3 text-xs">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <div className="text-muted-foreground uppercase tracking-wider">Citizen</div>
                                <div className="font-bold">{c.citizenName ?? "Anonymous"}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground uppercase tracking-wider">Severity</div>
                                <div className={`font-bold ${severityClass(c.severity)}`}>{c.severity ?? "MEDIUM"}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground uppercase tracking-wider">SLA Timer</div>
                                <div className={`font-mono font-bold ${slaColor(age, c.slaBreached)}`}>
                                  {c.slaBreached
                                    ? `Breached by ${age - 48}h`
                                    : `${Math.max(0, 48 - age)}h remaining`}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground uppercase tracking-wider">Opened</div>
                                <div className="font-mono">
                                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-muted-foreground uppercase tracking-wider mb-1">
                                Recent Activity
                              </div>
                              {complaintEvents[rowId] === undefined ? (
                                <div className="text-muted-foreground font-mono text-[10px]">Loading…</div>
                              ) : complaintEvents[rowId].length === 0 ? (
                                <div className="text-muted-foreground font-mono text-[10px]">No events recorded.</div>
                              ) : (
                                complaintEvents[rowId].map((ev, j) => (
                                  <div key={ev.id ?? j} className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />
                                    <span className="font-bold">{ev.eventType ?? "EVENT"}</span>
                                    {ev.actor?.fullName && (
                                      <span className="text-primary/80">· {ev.actor.fullName}</span>
                                    )}
                                    {ev.notes && (
                                      <span className="text-muted-foreground truncate max-w-[180px]" title={ev.notes}>
                                        {ev.notes}
                                      </span>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
              {complaints.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isDiscoAgent ? 9 : 10} className="text-center text-muted-foreground text-sm py-12">
                    No complaints found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* SLA League Table — full-access roles only */}
      {!isDiscoAgent && leagueTable.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            SLA League Table
          </h3>
          <div className="rounded-sm border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>DisCo</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                  <TableHead className="text-right">SLA Breached</TableHead>
                  <TableHead className="text-right">Breach Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leagueTable.map((row, i) => {
                  const breachRate = row.total > 0 ? row.breached / row.total : 0;
                  return (
                    <TableRow key={row.name} className={breachRate > 0.5 ? "bg-destructive/10" : ""}>
                      <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-bold">{row.name}</TableCell>
                      <TableCell className="text-right font-mono">{row.total}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">{row.breached}</TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={breachRate > 0.5 ? "text-destructive font-bold" : "text-muted-foreground"}>
                          {(breachRate * 100).toFixed(0)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Strategic Note — full-access roles only */}
      {!isDiscoAgent && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Strategic Note (Minister's Office)
            </h3>
            <button
              onClick={saveNote}
              className="flex items-center gap-1 text-xs text-primary hover:underline uppercase tracking-wider"
            >
              <Save className="w-3.5 h-3.5" />
              {noteSaved ? "Saved" : "Save"}
            </button>
          </div>
          <textarea
            value={strategicNote}
            onChange={(e) => setStrategicNote(e.target.value)}
            placeholder="Add strategic observations, escalation notes, or ministerial directives…"
            className="w-full min-h-[100px] bg-card border border-border rounded-sm px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}
    </div>
  );
}
