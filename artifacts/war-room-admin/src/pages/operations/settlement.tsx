import { Fragment, useState } from "react";
import { useGetDiscos } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Wallet, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SettlementInvoice {
  id: string;
  discoId: string;
  period: string;
  mooInvoiceNgn?: number;
  nbetInvoiceNgn?: number;
  drogAdjustedNgn?: number;
  remittedNgn?: number;
  remittancePct?: number;
  cumulativeDebtNgn?: number;
  enforcementStatus?: string;
  notes?: string;
}

type InvoiceEdit = {
  mooInvoiceNgn?: string;
  nbetInvoiceNgn?: string;
  drogAdjustedNgn?: string;
  remittedNgn?: string;
  remittancePct?: string;
  cumulativeDebtNgn?: string;
  enforcementStatus?: string;
  notes?: string;
};

const NUMERIC_FIELDS: { key: keyof InvoiceEdit; label: string }[] = [
  { key: "mooInvoiceNgn", label: "MoO Invoice (₦)" },
  { key: "nbetInvoiceNgn", label: "NBET Invoice (₦)" },
  { key: "drogAdjustedNgn", label: "DROG Adjusted (₦)" },
  { key: "remittedNgn", label: "Remitted (₦)" },
  { key: "remittancePct", label: "Remittance %" },
  { key: "cumulativeDebtNgn", label: "Cumulative Debt (₦)" },
];

export default function SettlementPage() {
  const { canWrite, accessToken } = useAuth();
  const { toast } = useToast();
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [saving, setSaving] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoices, setInvoices] = useState<SettlementInvoice[]>([]);
  const [edits, setEdits] = useState<Record<string, InvoiceEdit>>({});
  const [expandedDisco, setExpandedDisco] = useState<string | null>(null);

  const { data: discosData } = useGetDiscos({ page: 1 });
  const discos = (discosData as unknown as { data?: unknown[] })?.data ?? [];

  function authHeaders(json = false): Record<string, string> {
    const h: Record<string, string> = {};
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    if (json) h["Content-Type"] = "application/json";
    return h;
  }

  async function loadInvoices() {
    setLoadingInvoices(true);
    try {
      const res = await fetch(`/api/v1/admin/registry/settlement-invoices?period=${period}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const json = await res.json() as { data?: SettlementInvoice[] };
        setInvoices(json.data ?? []);
      }
    } catch { /* ignore */ }
    finally { setLoadingInvoices(false); }
  }

  function getInvoice(discoId: string): SettlementInvoice | undefined {
    return invoices.find((i) => i.discoId === discoId);
  }

  function setEdit(discoId: string, field: keyof InvoiceEdit, value: string) {
    setEdits((prev) => ({ ...prev, [discoId]: { ...(prev[discoId] ?? {}), [field]: value } }));
  }

  function numFmt(val: number | undefined): string {
    if (val === undefined || val === null) return "—";
    return val.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  async function handleSave() {
    const editEntries = Object.entries(edits);
    if (!editEntries.length) return;
    setSaving(true);
    let succeeded = 0; let failed = 0;

    for (const [discoId, fields] of editEntries) {
      const existing = getInvoice(discoId);
      const payload: Record<string, unknown> = { discoId, period };
      NUMERIC_FIELDS.forEach(({ key }) => {
        if (fields[key] !== undefined && fields[key] !== "") {
          payload[key] = parseFloat(fields[key]!);
        }
      });
      if (fields.enforcementStatus !== undefined) payload["enforcementStatus"] = fields.enforcementStatus;
      if (fields.notes !== undefined) payload["notes"] = fields.notes;

      try {
        let res: Response;
        if (existing) {
          res = await fetch(`/api/v1/admin/registry/settlement-invoices/${existing.id}`, {
            method: "PATCH", headers: authHeaders(true), body: JSON.stringify(payload),
          });
        } else {
          res = await fetch("/api/v1/admin/registry/settlement-invoices", {
            method: "POST", headers: authHeaders(true), body: JSON.stringify(payload),
          });
        }
        if (res.ok) succeeded++; else failed++;
      } catch { failed++; }
    }

    toast({ title: `Settlement data saved`, description: `${succeeded} DisCo records updated${failed > 0 ? `, ${failed} failed` : ""}` });
    setEdits({});
    void loadInvoices();
    setSaving(false);
  }

  const hasEdits = Object.keys(edits).length > 0;

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest">Operations — Settlement</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Per-DisCo invoice and remittance data entry</p>
        </div>
        {canWrite() && hasEdits && (
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => void handleSave()} disabled={saving}>
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            <Save className="w-3.5 h-3.5" />
            Save All ({Object.keys(edits).length})
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground shrink-0">Settlement Period</Label>
        <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="h-8 text-xs bg-background border-border w-40" />
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => void loadInvoices()} disabled={loadingInvoices}>
          {loadingInvoices ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Load Data
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            DisCo Settlement — {period}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead className="border-b border-border">
                <tr>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">DisCo</th>
                  <th className="p-3 text-right font-bold uppercase tracking-wider text-muted-foreground">MoO Invoice (₦)</th>
                  <th className="p-3 text-right font-bold uppercase tracking-wider text-muted-foreground">NBET Invoice (₦)</th>
                  <th className="p-3 text-right font-bold uppercase tracking-wider text-muted-foreground">DROG Adj. (₦)</th>
                  <th className="p-3 text-right font-bold uppercase tracking-wider text-muted-foreground">Remitted (₦)</th>
                  <th className="p-3 text-right font-bold uppercase tracking-wider text-muted-foreground">Rem. %</th>
                  <th className="p-3 text-right font-bold uppercase tracking-wider text-muted-foreground">Cum. Debt (₦)</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {discos.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No DisCos found — load data first</td></tr>
                ) : discos.map((d: unknown) => {
                  const disco = d as Record<string, unknown>;
                  const did = disco.id as string;
                  const existing = getInvoice(did);
                  const edit = edits[did] ?? {};
                  const isEdited = edits[did] !== undefined;
                  const isExpanded = expandedDisco === did;
                  const pct = parseFloat(edit.remittancePct ?? String(existing?.remittancePct ?? "0")) || 0;

                  return (
                    <Fragment key={did}>
                      <tr className={`border-b border-border hover:bg-secondary/10 cursor-pointer ${isExpanded ? "bg-secondary/20" : ""}`} onClick={() => setExpandedDisco(isExpanded ? null : did)}>
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-foreground">{disco.name as string}</p>
                            {isEdited && <p className="text-[10px] text-yellow-400 font-bold">● Unsaved changes</p>}
                          </div>
                        </td>
                        {NUMERIC_FIELDS.map(({ key }) => (
                          <td key={key} className="p-3 text-right font-mono">
                            {key === "remittancePct" ? (
                              <span className={`font-bold ${pct >= 90 ? "text-green-400" : pct >= 70 ? "text-yellow-400" : existing ? "text-destructive" : "text-muted-foreground"}`}>
                                {edit[key] !== undefined ? edit[key] : (existing?.[key] !== undefined ? `${existing[key]}%` : "—")}
                              </span>
                            ) : (
                              <span className="text-foreground">{edit[key] !== undefined ? edit[key] : numFmt(existing?.[key as keyof SettlementInvoice] as number | undefined)}</span>
                            )}
                          </td>
                        ))}
                        <td className="p-3">
                          {(edit.enforcementStatus || existing?.enforcementStatus) ? (
                            <span className="text-[10px] font-bold uppercase border border-border px-1.5 py-0.5 rounded text-muted-foreground">
                              {edit.enforcementStatus ?? existing?.enforcementStatus}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && canWrite() && (
                        <tr className="border-b border-border bg-secondary/30">
                          <td colSpan={8} className="p-4">
                            <div className="grid grid-cols-3 gap-3">
                              {NUMERIC_FIELDS.map(({ key, label }) => (
                                <div key={key} className="space-y-1">
                                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
                                  <Input
                                    type="number" min={0} step={key === "remittancePct" ? "0.01" : "0.01"}
                                    value={edit[key] ?? String(existing?.[key as keyof SettlementInvoice] ?? "")}
                                    onChange={(e) => setEdit(did, key, e.target.value)}
                                    className="h-7 text-xs bg-background border-border font-mono"
                                    placeholder="0.00"
                                  />
                                </div>
                              ))}
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Enforcement Status</Label>
                                <Input
                                  value={edit.enforcementStatus ?? (existing?.enforcementStatus ?? "")}
                                  onChange={(e) => setEdit(did, "enforcementStatus", e.target.value)}
                                  placeholder="e.g. CAUTION, SANCTION…"
                                  className="h-7 text-xs bg-background border-border"
                                />
                              </div>
                              <div className="space-y-1 col-span-2">
                                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Notes</Label>
                                <Input
                                  value={edit.notes ?? (existing?.notes ?? "")}
                                  onChange={(e) => setEdit(did, "notes", e.target.value)}
                                  placeholder="Optional notes…"
                                  className="h-7 text-xs bg-background border-border"
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {canWrite() && hasEdits && (
        <div className="flex justify-end">
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => void handleSave()} disabled={saving}>
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            <Save className="w-3.5 h-3.5" />
            Save All ({Object.keys(edits).length} DisCos)
          </Button>
        </div>
      )}
    </div>
  );
}
