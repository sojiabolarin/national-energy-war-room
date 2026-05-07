import { useState } from "react";
import { useGetSectorKpis } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, BarChart3, Upload, FileText, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const MANUAL_FIELDS = [
  { key: "frequencyHz", label: "Frequency (Hz)", required: true, step: "0.001" },
  { key: "upperVoltageKv", label: "Upper Voltage (kV)", step: "0.01" },
  { key: "lowerVoltageKv", label: "Lower Voltage (kV)", step: "0.01" },
  { key: "sentOutMwh", label: "Sent-Out (MWh)", step: "0.01" },
  { key: "demandMwh", label: "Demand (MWh)", step: "0.01" },
] as const;

const CSV_COLUMNS = ["frequencyHz", "upperVoltageKv", "lowerVoltageKv", "sentOutMwh", "demandMwh"];

interface CsvResult { total: number; accepted: number; rejected: { row: number; reason: string }[] }

export default function GridMetricsPage() {
  const { canWrite, accessToken } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"manual" | "csv">("manual");
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState<CsvResult | null>(null);

  const { data: kpis } = useGetSectorKpis();
  const kpisData = (kpis as unknown as { data?: Record<string, unknown> })?.data ?? {};

  function authHeaders(json = false): Record<string, string> {
    const h: Record<string, string> = {};
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    if (json) h["Content-Type"] = "application/json";
    return h;
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form["frequencyHz"]) { toast({ title: "Frequency Hz is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      MANUAL_FIELDS.forEach((f) => {
        if (form[f.key] !== undefined && form[f.key] !== "") body[f.key] = parseFloat(form[f.key]!);
      });
      const res = await fetch("/api/v1/admin/registry/grid-metrics", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(errJson.error?.message ?? `Server ${res.status}`);
      }
      toast({ title: "Grid metric reading saved" });
      setForm({});
    } catch (err) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function parseCsvRows(text: string): Record<string, string>[] {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0]!.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
    });
  }

  async function handleCsvImport() {
    if (!csvFile) return;
    setCsvLoading(true);
    setCsvResult(null);
    try {
      const text = await csvFile.text();
      const rows = parseCsvRows(text);
      if (!rows.length) throw new Error("No data rows found in CSV");

      let accepted = 0;
      const rejected: { row: number; reason: string }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        if (!row["frequencyHz"] || isNaN(parseFloat(row["frequencyHz"]))) {
          rejected.push({ row: i + 1, reason: "Missing or invalid frequencyHz (required)" });
          continue;
        }
        const body: Record<string, unknown> = {};
        CSV_COLUMNS.forEach((col) => {
          if (row[col] !== undefined && row[col] !== "") {
            const v = parseFloat(row[col]!);
            if (!isNaN(v)) body[col] = v;
          }
        });
        try {
          const res = await fetch("/api/v1/admin/registry/grid-metrics", {
            method: "POST",
            headers: authHeaders(true),
            body: JSON.stringify(body),
          });
          if (res.ok) accepted++; else rejected.push({ row: i + 1, reason: `Server ${res.status}` });
        } catch {
          rejected.push({ row: i + 1, reason: "Network error" });
        }
      }
      setCsvResult({ total: rows.length, accepted, rejected });
      toast({ title: `CSV imported: ${accepted}/${rows.length} rows accepted` });
    } catch (err) {
      toast({ title: "CSV import failed", description: err instanceof Error ? err.message : "Unknown", variant: "destructive" });
    } finally {
      setCsvLoading(false);
    }
  }

  const sparkData = [
    { t: "00:00", hz: 50.1 }, { t: "04:00", hz: 49.8 }, { t: "08:00", hz: 50.2 },
    { t: "12:00", hz: 49.9 }, { t: "16:00", hz: 50.3 }, { t: "20:00", hz: 50.0 },
    { t: "Now", hz: (kpisData.frequencyHz as number) ?? 50.0 },
  ];

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold uppercase tracking-widest">Operations — Grid Metrics</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Record real-time grid readings into the registry</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Frequency Trend (Last 24h — indicative)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={sparkData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
              <XAxis dataKey="t" tick={{ fill: "hsl(0 0% 65%)", fontSize: 10 }} />
              <YAxis domain={[49, 51]} tick={{ fill: "hsl(0 0% 65%)", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(0 0% 11%)", border: "1px solid hsl(0 0% 20%)", color: "hsl(0 0% 95.7%)", fontSize: 11 }} />
              <Line type="monotone" dataKey="hz" stroke="hsl(14.2 80.9% 52.9%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="flex gap-1 border-b border-border">
        {(["manual", "csv"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "manual" ? "Manual Entry" : "CSV Import"}
          </button>
        ))}
      </div>

      {tab === "manual" && (
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Manual Reading Entry</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {MANUAL_FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {f.label}{("required" in f && f.required) ? " *" : ""}
                    </Label>
                    <Input
                      type="number"
                      step={f.step}
                      value={form[f.key] ?? ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={String(kpisData[f.key] ?? "—")}
                      className="h-7 text-xs bg-background border-border"
                      disabled={!canWrite()}
                      required={"required" in f ? f.required : false}
                    />
                  </div>
                ))}
              </div>
              {canWrite() && (
                <Button type="submit" size="sm" className="w-full gap-2 bg-primary hover:bg-primary/90 mt-2" disabled={saving}>
                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                  <Save className="w-3.5 h-3.5" />
                  Save Reading
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {tab === "csv" && (
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              CSV Bulk Import
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="p-3 rounded bg-secondary/30 border border-border text-xs text-muted-foreground space-y-1">
              <p className="font-bold text-foreground uppercase tracking-wider text-[10px]">Expected CSV columns:</p>
              {CSV_COLUMNS.map((c) => (
                <p key={c} className="font-mono">{c}{c === "frequencyHz" ? " (required)" : " (optional)"}</p>
              ))}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">CSV File</Label>
              <Input type="file" accept=".csv,text/csv" onChange={(e) => { setCsvFile(e.target.files?.[0] ?? null); setCsvResult(null); }} className="h-8 text-xs bg-background border-border" />
              {csvFile && (
                <div className="flex items-center gap-2 p-2 rounded bg-primary/10 border border-primary/30 text-xs text-primary">
                  <FileText className="w-3.5 h-3.5" />
                  {csvFile.name} · {(csvFile.size / 1024).toFixed(1)} KB
                </div>
              )}
            </div>
            {canWrite() && (
              <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => void handleCsvImport()} disabled={!csvFile || csvLoading}>
                {csvLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Upload className="w-3.5 h-3.5" />
                Import CSV
              </Button>
            )}
            {csvResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded bg-secondary/30 border border-border">
                    <p className="text-xl font-bold text-foreground">{csvResult.total}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                  </div>
                  <div className="text-center p-3 rounded bg-green-600/10 border border-green-600/30">
                    <p className="text-xl font-bold text-green-400">{csvResult.accepted}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Imported</p>
                  </div>
                  <div className="text-center p-3 rounded bg-destructive/10 border border-destructive/30">
                    <p className="text-xl font-bold text-destructive">{csvResult.rejected.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Rejected</p>
                  </div>
                </div>
                {csvResult.rejected.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {csvResult.rejected.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded bg-destructive/10 border border-destructive/30 text-xs">
                        <XCircle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                        <span><span className="font-bold text-destructive">Row {r.row}: </span><span className="text-foreground">{r.reason}</span></span>
                      </div>
                    ))}
                  </div>
                )}
                {csvResult.accepted > 0 && (
                  <div className="flex items-center gap-2 text-xs text-green-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {csvResult.accepted} readings recorded successfully
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
