import { useState, useEffect } from "react";
import { useGetComplaintStats, useGetActiveAlerts, useGetSectorKpis } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquareWarning, AlertTriangle, CheckCircle2, Clock, TrendingUp, Zap, Activity, Upload, Shield } from "lucide-react";
import { formatDate } from "@/lib/utils";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  warn,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${warn ? "text-destructive" : accent ? "text-primary" : "text-foreground"}`}>
              {value}
            </p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <Icon className={`w-6 h-6 mt-1 ${warn ? "text-destructive" : accent ? "text-primary" : "text-muted-foreground"}`} />
        </div>
      </CardContent>
    </Card>
  );
}

interface ImportHistoryEntry {
  id: string;
  period: string | null;
  accepted: number;
  rejected: number;
  createdAt: string;
  importedBy: string;
}

function RecentImportsList({ accessToken }: { accessToken: string | null }) {
  const [imports, setImports] = useState<ImportHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const headers: Record<string, string> = {};
        if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
        const res = await fetch("/api/v1/admin/imports/history?limit=5", { headers });
        if (!res.ok) throw new Error();
        const json = await res.json() as { data?: ImportHistoryEntry[] };
        setImports(json.data ?? []);
      } catch {
        setImports([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [accessToken]);

  if (loading) {
    return <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>;
  }

  if (imports.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">No import history available</p>;
  }

  return (
    <div className="space-y-2">
      {imports.map((imp) => (
        <div key={imp.id} className="flex items-center gap-3 p-2 rounded bg-secondary/30 border border-border text-xs">
          <div className="flex-1 min-w-0">
            <p className="font-mono font-bold text-foreground truncate">{imp.period ?? imp.id}</p>
            <p className="text-muted-foreground">{formatDate(imp.createdAt)}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-green-400 font-bold">{imp.accepted} imported</p>
            {imp.rejected > 0 && (
              <p className="text-destructive text-[10px]">{imp.rejected} skipped</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user, role, accessToken } = useAuth();
  const { data: stats, isLoading: statsLoading } = useGetComplaintStats();
  const { data: alerts, isLoading: alertsLoading } = useGetActiveAlerts();
  const { data: kpis, isLoading: kpisLoading } = useGetSectorKpis();

  const statsData = (stats as unknown as { data?: Record<string, unknown> })?.data ?? {};
  const alertsData = (alerts as unknown as { data?: unknown[] })?.data ?? [];
  const kpisData = (kpis as unknown as { data?: Record<string, unknown> })?.data ?? {};

  const userAny = user as unknown as { fullName?: string };
  const userName = userAny?.fullName ?? user?.email ?? "Operative";

  const escalationLevels = statsData.byEscalationLevel as Array<{ level: number; count: number }> | undefined;
  const pendingEscalations = escalationLevels
    ?.filter((e) => e.level >= 3)
    .reduce((sum, e) => sum + e.count, 0) ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome, {userName} · Role: <span className="text-primary font-bold">{role}</span>
          </p>
        </div>
        <Badge variant="outline" className="text-xs uppercase tracking-wider border-primary text-primary">
          Live View
        </Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <div className="col-span-4 flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <StatCard label="Total Complaints" value={(statsData.total as number | undefined) ?? "—"} icon={MessageSquareWarning} />
            <StatCard label="Open" value={(statsData.open as number | undefined) ?? "—"} icon={Clock} accent />
            <StatCard label="Resolved" value={(statsData.resolved as number | undefined) ?? "—"} icon={CheckCircle2} />
            <StatCard label="SLA Breached" value={(statsData.slaBreached as number | undefined) ?? "—"} icon={AlertTriangle} warn />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <MessageSquareWarning className="w-4 h-4 text-primary" />
                Complaints by Category
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {statsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : (statsData.byCategory as Array<{ category: string; count: number }> | undefined)?.length ? (
                <div className="space-y-2">
                  {(statsData.byCategory as Array<{ category: string; count: number }>).map((item) => (
                    <div key={item.category} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider w-32 truncate shrink-0">{item.category}</span>
                      <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${Math.min(100, ((item.count / ((statsData.total as number) || 1)) * 100))}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-foreground w-8 text-right">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No category data available</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Escalation Pyramid
                {pendingEscalations > 0 && (
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded bg-destructive/20 border border-destructive/40 text-destructive">
                    {pendingEscalations} pending manual review (L3+)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {statsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : escalationLevels?.length ? (
                <div className="space-y-2">
                  {escalationLevels.map((item) => (
                    <div key={item.level} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-20 shrink-0">
                        Level {item.level}
                        {item.level >= 4 && <span className="ml-1 text-[10px] text-destructive font-bold">★</span>}
                      </span>
                      <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${item.level >= 4 ? "bg-destructive" : item.level >= 3 ? "bg-yellow-500" : "bg-primary"}`}
                          style={{ width: `${Math.min(100, (item.count / ((statsData.total as number) || 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-foreground w-8 text-right">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No escalation data available</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Recent Import Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <RecentImportsList accessToken={accessToken} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Grid KPIs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {kpisLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: "Available Gen.", value: `${((kpisData.availableGenerationMw as number | undefined) ?? 0).toLocaleString()} MW` },
                    { label: "Frequency", value: `${((kpisData.frequencyHz as number | undefined) ?? 0).toFixed(2)} Hz` },
                    { label: "ATCC Loss", value: `${((kpisData.atccLossPct as number | undefined) ?? 0).toFixed(1)}%` },
                    { label: "Metering Rate", value: `${((kpisData.meteringRatePct as number | undefined) ?? 0).toFixed(1)}%` },
                    { label: "Open Complaints", value: (kpisData.openComplaints as number | undefined) ?? "—" },
                  ].map((kpi) => (
                    <div key={kpi.label} className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
                      <span className="text-xs font-bold text-foreground">{kpi.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {alertsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : alertsData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No active alerts</p>
              ) : (
                <div className="space-y-2">
                  {alertsData.slice(0, 5).map((alert: unknown) => {
                    const a = alert as Record<string, unknown>;
                    return (
                      <div key={a.id as string} className="p-2 rounded bg-secondary/50 border border-border">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${a.severity === "CRITICAL" ? "text-destructive" : "text-yellow-500"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{a.title as string}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDate((a.createdAt as string | undefined) ?? "")}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {alertsData.length > 5 && (
                    <p className="text-[10px] text-muted-foreground text-center">+{alertsData.length - 5} more</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {[
                { label: "API Server", status: "Online", ok: true },
                { label: "SLA Tracker", status: "Running", ok: true },
                { label: "Escalation Worker", status: "Running", ok: true },
              ].map((s) => (
                <div key={s.label} className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${s.ok ? "text-green-400" : "text-destructive"}`}>
                    {s.status}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">L4+ Ministerial</span>
                {pendingEscalations > 0 ? (
                  <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">{pendingEscalations} pending</span>
                ) : (
                  <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Clear</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
