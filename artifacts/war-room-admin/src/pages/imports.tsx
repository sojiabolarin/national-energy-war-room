import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, CheckCircle2, XCircle, FileText, ArrowRight, ArrowLeft, Eye, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

type Step = "upload" | "map" | "validate" | "confirm" | "result";

interface RejectionRow { row: number; reason: string }
interface ValidationResult { total: number; wouldAccept: number; wouldReject: RejectionRow[] }
interface ImportResult { total: number; accepted: number; rejected: RejectionRow[] }

interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
  rawCsv: string;
  fileType: "csv" | "json";
  fileName: string;
}

function parseCsvText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };
  function splitLine(line: string): string[] {
    const result: string[] = []; let cur = ""; let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { result.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    result.push(cur.trim()); return result;
  }
  const headers = splitLine(lines[0]!);
  const rows = lines.slice(1).map((line) => {
    const vals = splitLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
  return { headers, rows };
}

function rowsToCsv(rows: Record<string, string>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))];
  return lines.join("\n");
}

async function parseFile(file: File): Promise<ParsedData | null> {
  const text = await file.text();
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "json") {
    let jsonData: unknown;
    try { jsonData = JSON.parse(text); } catch { return null; }
    const arr: Record<string, string>[] = Array.isArray(jsonData) ? jsonData as Record<string, string>[] : [jsonData as Record<string, string>];
    const headers = arr.length ? Object.keys(arr[0]!) : [];
    const rows = arr.map((r) => Object.fromEntries(headers.map((h) => [h, String(r[h] ?? "")])));
    const rawCsv = rowsToCsv(rows);
    return { headers, rows, rawCsv, fileType: "json", fileName: file.name };
  }

  const { headers, rows } = parseCsvText(text);
  return { headers, rows, rawCsv: text, fileType: "csv", fileName: file.name };
}

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: "upload", label: "1. Upload" },
  { key: "map", label: "2. Map Columns" },
  { key: "validate", label: "3. Validate" },
  { key: "confirm", label: "4. Confirm" },
  { key: "result", label: "5. Summary" },
];

const COMPLETED_STEPS: Record<Step, Step[]> = {
  upload: [],
  map: ["upload"],
  validate: ["upload", "map"],
  confirm: ["upload", "map", "validate"],
  result: ["upload", "map", "validate", "confirm"],
};

export default function ImportsPage() {
  const { toast } = useToast();
  const { accessToken } = useAuth();

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  function authHeaders(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    return h;
  }

  async function handleParse() {
    if (!file || !period) return;
    setLoading(true);
    try {
      const data = await parseFile(file);
      if (!data || !data.headers.length) throw new Error("No parseable columns found in file");
      setParsed(data);
      setStep("map");
    } catch (err) {
      toast({ title: "Parse failed", description: err instanceof Error ? err.message : "Could not read file", variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function handleValidate() {
    if (!parsed) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/imports/nerc-quarterly/validate", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ data: parsed.rawCsv, period }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(j.error?.message ?? `Server ${res.status}`);
      }
      const json = await res.json() as { data?: ValidationResult };
      setValidation(json.data ?? { total: 0, wouldAccept: 0, wouldReject: [] });
      setStep("confirm");
    } catch (err) {
      toast({ title: "Validation failed", description: err instanceof Error ? err.message : "Server error", variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function handleCommit() {
    if (!parsed) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/imports/nerc-quarterly", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ data: parsed.rawCsv, period }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(j.error?.message ?? `Server ${res.status}`);
      }
      const json = await res.json() as { data?: { total?: number; accepted?: number; rejected?: RejectionRow[] } };
      const d = json.data ?? {};
      setResult({ total: d.total ?? 0, accepted: d.accepted ?? 0, rejected: d.rejected ?? [] });
      setStep("result");
      toast({ title: "Import complete", description: `${d.accepted ?? 0} of ${d.total ?? 0} rows imported` });
    } catch (err) {
      toast({ title: "Import failed", description: err instanceof Error ? err.message : "Commit failed", variant: "destructive" });
    } finally { setLoading(false); }
  }

  function reset() {
    setFile(null); setParsed(null); setValidation(null); setResult(null); setStep("upload");
  }

  const DISCO_KEY = parsed?.headers.find((h) => ["disco", "DisCo", "name"].includes(h));
  const REMIT_KEY = parsed?.headers.find((h) => ["remittancePct", "remittance_pct"].includes(h));

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold uppercase tracking-widest">Import Wizard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">5-step NERC quarterly data import — validate before commit</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {STEP_LABELS.map((s, i) => {
          const completed = (COMPLETED_STEPS[step] as Step[]).includes(s.key);
          const active = step === s.key;
          return (
            <div key={s.key} className="flex items-center gap-1.5 shrink-0">
              <div className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${active ? "bg-primary/20 border-primary text-primary" : completed ? "bg-green-600/10 border-green-600/30 text-green-400" : "border-border text-muted-foreground"}`}>
                {completed ? <span className="flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5 inline" /> {s.label}</span> : s.label}
              </div>
              {i < STEP_LABELS.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              Step 1 — Upload File
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="p-3 rounded bg-secondary/30 border border-border text-xs text-muted-foreground space-y-1">
              <p className="font-bold text-foreground uppercase tracking-wider text-[10px]">Accepted formats: CSV or JSON</p>
              <p className="font-mono">CSV columns: disco (required), remittancePct (optional), + any other fields</p>
              <p className="font-mono">JSON: array of objects with the same field names</p>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Settlement Period</Label>
              <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="h-8 text-xs bg-background border-border w-48" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Data File (.csv or .json)</Label>
              <Input type="file" accept=".csv,.json,text/csv,application/json" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="h-8 text-xs bg-background border-border" />
              {file && (
                <div className="flex items-center gap-2 p-2 rounded bg-primary/10 border border-primary/30 text-xs text-primary">
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  {file.name} · {(file.size / 1024).toFixed(1)} KB · {file.name.endsWith(".json") ? "JSON" : "CSV"}
                </div>
              )}
            </div>
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => void handleParse()} disabled={!file || !period || loading}>
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <Eye className="w-3.5 h-3.5" />
              Parse &amp; Preview Columns
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Map Columns */}
      {step === "map" && parsed && (
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Step 2 — Column Mapping · {parsed.rows.length} rows · {parsed.fileType.toUpperCase()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className={`p-2 rounded border ${DISCO_KEY ? "bg-green-600/10 border-green-600/30 text-green-400" : "bg-destructive/10 border-destructive/30 text-destructive"}`}>
                <p className="font-bold uppercase tracking-wider text-[10px]">DisCo key column</p>
                <p className="font-mono mt-0.5">{DISCO_KEY ?? "NOT FOUND — add a 'disco' column"}</p>
              </div>
              <div className={`p-2 rounded border ${REMIT_KEY ? "bg-green-600/10 border-green-600/30 text-green-400" : "bg-secondary/30 border-border text-muted-foreground"}`}>
                <p className="font-bold uppercase tracking-wider text-[10px]">Remittance % column</p>
                <p className="font-mono mt-0.5">{REMIT_KEY ?? "not present (optional)"}</p>
              </div>
            </div>
            <div className="overflow-x-auto rounded border border-border">
              <table className="w-full text-xs">
                <thead className="border-b border-border bg-secondary/30">
                  <tr>
                    <th className="p-2 text-left text-muted-foreground font-bold">#</th>
                    {parsed.headers.map((h) => (
                      <th key={h} className={`p-2 text-left font-bold uppercase tracking-wider ${h === DISCO_KEY ? "text-primary" : h === REMIT_KEY ? "text-green-400" : "text-muted-foreground"}`}>
                        {h}
                        {h === DISCO_KEY && <span className="ml-1 text-[8px] border border-primary/40 px-1 rounded">KEY</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 8).map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/10">
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      {parsed.headers.map((h) => (
                        <td key={h} className="p-2 text-foreground font-mono">{row[h] ?? ""}</td>
                      ))}
                    </tr>
                  ))}
                  {parsed.rows.length > 8 && (
                    <tr>
                      <td colSpan={parsed.headers.length + 1} className="p-2 text-center text-muted-foreground text-[10px]">
                        + {parsed.rows.length - 8} more rows (showing first 8)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setStep("upload")}>
                <ArrowLeft className="w-3.5 h-3.5" />Back
              </Button>
              {!DISCO_KEY ? (
                <p className="text-xs text-destructive flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" />
                  Cannot proceed — no 'disco' column detected
                </p>
              ) : (
                <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => void handleValidate()} disabled={loading}>
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Run Validation Pass
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3+4: Validate → Confirm */}
      {(step === "confirm") && validation && (
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Step 3 Validation Results → Step 4 Confirm Commit
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded bg-secondary/30 border border-border">
                <p className="text-2xl font-bold text-foreground">{validation.total}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Total Rows</p>
              </div>
              <div className="text-center p-3 rounded bg-green-600/10 border border-green-600/30">
                <p className="text-2xl font-bold text-green-400">{validation.wouldAccept}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Will Import</p>
              </div>
              <div className="text-center p-3 rounded bg-destructive/10 border border-destructive/30">
                <p className="text-2xl font-bold text-destructive">{validation.wouldReject.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Will Reject</p>
              </div>
            </div>
            {validation.wouldReject.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <p className="text-[10px] font-bold text-foreground uppercase tracking-wider">Row-Level Rejection Preview:</p>
                {validation.wouldReject.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded bg-destructive/10 border border-destructive/30 text-xs">
                    <XCircle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                    <span><span className="font-bold text-destructive">Row {r.row}: </span><span className="text-foreground">{r.reason}</span></span>
                  </div>
                ))}
              </div>
            )}
            <div className="p-3 rounded bg-secondary/40 border border-border text-xs text-muted-foreground">
              <p className="font-bold text-foreground mb-1">Ready to commit {validation.wouldAccept} of {validation.total} rows to the settlement registry for period <span className="text-primary font-mono">{period}</span>.</p>
              {validation.wouldAccept === 0
                ? <p className="text-destructive font-bold">All rows would be rejected — fix your file before committing.</p>
                : <p>Rejected rows will be skipped. This action writes to the database and is logged.</p>}
            </div>
            <div className="flex gap-3">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setStep("map")}>
                <ArrowLeft className="w-3.5 h-3.5" />Back
              </Button>
              <Button
                size="sm"
                className="gap-2 bg-primary hover:bg-primary/90"
                onClick={() => void handleCommit()}
                disabled={loading || validation.wouldAccept === 0}
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Upload className="w-3.5 h-3.5" />
                Commit {validation.wouldAccept} Rows
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Result */}
      {step === "result" && result && (
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              Step 5 — Import Summary · Period: {period}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded bg-secondary/30 border border-border">
                <p className="text-2xl font-bold text-foreground">{result.total}</p>
                <p className="text-xs text-muted-foreground uppercase">Total</p>
              </div>
              <div className="text-center p-3 rounded bg-green-600/10 border border-green-600/30">
                <p className="text-2xl font-bold text-green-400">{result.accepted}</p>
                <p className="text-xs text-muted-foreground uppercase">Imported</p>
              </div>
              <div className="text-center p-3 rounded bg-destructive/10 border border-destructive/30">
                <p className="text-2xl font-bold text-destructive">{result.rejected.length}</p>
                <p className="text-xs text-muted-foreground uppercase">Rejected</p>
              </div>
            </div>
            {result.rejected.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <p className="text-[10px] font-bold text-foreground uppercase tracking-wider">Final Rejection Reasons:</p>
                {result.rejected.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded bg-destructive/10 border border-destructive/30 text-xs">
                    <XCircle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                    <span><span className="font-bold text-destructive">Row {r.row}: </span><span className="text-foreground">{r.reason}</span></span>
                  </div>
                ))}
              </div>
            )}
            {result.accepted > 0 && (
              <div className="flex items-center gap-2 text-xs text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {result.accepted} settlement records written to the database for {period}
              </div>
            )}
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={reset}>
              Import Another File
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
