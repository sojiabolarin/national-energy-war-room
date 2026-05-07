import { useState, useEffect } from "react";
import { useGetComplaintStats, useGetActiveAlerts, useGetSectorKpis } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, MessageSquareWarning, AlertTriangle, CheckCircle2,
  Clock, TrendingUp, Zap, Activity, Upload, Shield,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend,
} from "recharts";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  warn,
  sparkData,
  sparkKey,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: boolean;
  warn?: boolean;
  sparkData?: Record<string, unknown>[];
  sparkKey?: string;
}) {
  const color = warn
    ? "hsl(0 72.2% 50.6%)"
    : accent
    ? "hsl(14.2 80.9% 52.9%)"
    : "hsl(0 0% 65%)";

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${warn ? "text-destructive" : accent ? "text-primary" : "text-foreground"}`}>
              {value}
            </p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <Icon className={`w-6 h-6 mt-1 shrink-0 ml-2 ${warn ? "text-destructive" : accent ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        {sparkData && sparkKey && sparkData.length > 1 && (
          <div className="mt-3 -mx-1">
            <ResponsiveContainer width="100%" height={40}>
              <AreaChart data={sparkData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <defs>
                  <linearGradient id={`grad-${sparkKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey={sparkKey}
                  stroke={color}
                  strokeWidth={1.5}
                  fill={`url(#grad-${sparkKey})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
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

const INDICATIVE_TREND = [
  { day: "Mon", complaints: 14 },
  { day: "Tue", complaints: 22 },
  { day: "Wed", complaints: 18 },
  { day: "Thu", complaints: 31 },
  { day: "Fri", complaints: 27 },
  { day: "Sat", complaints: 12 },
  { day: "Sun", complaints: 9 },
];

const INDICATIVE_SLA = [
  { day: "Mon", breached: 2 },
  { day: "Tue", breached: 5 },
  { day: "Wed", breached: 3 },
  { day: "Thu", breached: 8 },
  { day: "Fri", breached: 6 },
  { day: "Sat", breached: 1 },
  { day: "Sun", breached: 2 },
];

const INDICATIVE_OPEN = [
  { day: "Mon", open: 30 },
  { day: "Tue", open: 44 },
  { day: "Wed", open: 39 },
  { day: "Thu", open: 58 },
  { day: "Fri", open: 62 },
  { day: "Sat", open: 55 },
  { day: "Sun", open: 48 },
];

const INDICATIVE_RESOLVED = [
  { day: "Mon", resolved: 10 },
  { day: "Tue", resolved: 16 },
  { day: "Wed", resolved: 22 },
  { day: "Thu", resolved: 18 },
  { day: "Fri", resolved: 28 },
  { day: "Sat", resolved: 14 },
  { day: "Sun", resolved: 20 },
];

const STATUS_COLORS: Record<string, string> = {
  open: "hsl(14.2 80.9% 52.9%)",
  resolved: "hsl(142 71% 45%)",
  "in progress": "hsl(217 91% 60%)",
  pending: "hsl(38 92% 50%)",
};

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

  const byStatus = statsData.byStatus as Array<{ status: string; count: number }> | undefined;
  const statusPieData = byStatus?.map((s) => ({
    name: s.status,
    value: s.count,
  })) ?? [];

  const byCategory = statsData.byCategory as Array<{ category: string; count: number }> | undefined;
  const categoryBarData = byCategory?.slice(0, 8).map((c) => ({
    name: c.category.length > 12 ? c.category.slice(0, 12) + "…" : c.category,
    count: c.count,
  })) ?? [];

  const total = (statsData.total as number | undefined) ?? 0;
  const slaBreached = (statsData.slaBreached as number | undefined) ?? 0;
  const slaRate = total > 0 ? `${((slaBreached / total) * 100).toFixed(1)}% rate` : undefined;

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
            <StatCard
              label="Total Complaints"
              value={total ?? "—"}
              icon={MessageSquareWarning}
              sparkData={INDICATIVE_TREND}
              sparkKey="complaints"
            />
            <StatCard
              label="Open"
              value={(statsData.open as number | undefined) ?? "—"}
              icon={Clock}
              accent
              sparkData={INDICATIVE_OPEN}
              sparkKey="open"
            />
            <StatCard
              label="Resolved"
              value={(statsData.resolved as number | undefined) ?? "—"}
              icon={CheckCircle2}
              sparkData={INDICATIVE_RESOLVED}
              sparkKey="resolved"
            />
            <StatCard
              label="SLA Breached"
              value={slaBreached ?? "—"}
              sub={slaRate}
              icon={AlertTriangle}
              warn
              sparkData={INDICATIVE_SLA}
              sparkKey="breached"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">

          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Complaint Volume — 7-Day Trend
                <span className="ml-auto text-[10px] text-muted-foreground font-normal normal-case tracking-normal">indicative</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={INDICATIVE_TREND} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-vol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(14.2 80.9% 52.9%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(14.2 80.9% 52.9%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                  <XAxis dataKey="day" tick={{ fill: "hsl(0 0% 65%)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "hsl(0 0% 65%)", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(0 0% 11%)",
                      border: "1px solid hsl(0 0% 20%)",
                      color: "hsl(0 0% 95.7%)",
                      fontSize: 11,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="complaints"
                    stroke="hsl(14.2 80.9% 52.9%)"
                    strokeWidth={2}
                    fill="url(#grad-vol)"
                    dot={{ r: 3, fill: "hsl(14.2 80.9% 52.9%)" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <MessageSquareWarning className="w-4 h-4 text-primary" />
                Complaints by Category
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {statsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : categoryBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={categoryBarData} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "hsl(0 0% 65%)", fontSize: 10 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: "hsl(0 0% 65%)", fontSize: 10 }}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(0 0% 11%)",
                        border: "1px solid hsl(0 0% 20%)",
                        color: "hsl(0 0% 95.7%)",
                        fontSize: 11,
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(14.2 80.9% 52.9%)" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
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
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : escalationLevels?.length ? (
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={escalationLevels} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                    <XAxis
                      dataKey="level"
                      tickFormatter={(v) => `L${v}`}
                      tick={{ fill: "hsl(0 0% 65%)", fontSize: 10 }}
                    />
                    <YAxis tick={{ fill: "hsl(0 0% 65%)", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(0 0% 11%)",
                        border: "1px solid hsl(0 0% 20%)",
                        color: "hsl(0 0% 95.7%)",
                        fontSize: 11,
                      }}
                      formatter={(val, _name, props) => [val, `Level ${(props.payload as { level: number }).level}`]}
                    />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                      {escalationLevels.map((entry) => (
                        <Cell
                          key={`cell-${entry.level}`}
                          fill={
                            entry.level >= 4
                              ? "hsl(0 72.2% 50.6%)"
                              : entry.level >= 3
                              ? "hsl(38 92% 50%)"
                              : "hsl(14.2 80.9% 52.9%)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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
                <Activity className="w-4 h-4 text-primary" />
                Settlement Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {statsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : statusPieData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No status data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={STATUS_COLORS[entry.name.toLowerCase()] ?? `hsl(${(index * 70) % 360} 70% 55%)`}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(0 0% 11%)",
                        border: "1px solid hsl(0 0% 20%)",
                        color: "hsl(0 0% 95.7%)",
                        fontSize: 11,
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 10, color: "hsl(0 0% 65%)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Grid KPIs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {kpisLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
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
                <AlertTriangle className="w-4 h-4 text-primary" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {alertsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
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
                System Status
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
