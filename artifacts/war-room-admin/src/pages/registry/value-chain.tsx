import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronDown, ChevronRight, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const STAKEHOLDER_ROLES = ["OPERATOR", "REGULATOR", "COUNTERPART", "FUNDING_PARTNER", "AUTHORITY"] as const;

interface ValueChainLink {
  id: string;
  key: string;
  name: string;
  status: string;
  order?: number;
}

interface Stakeholder {
  id: string;
  role: string;
  title: string;
  description?: string;
  escalationOrder?: number;
}

interface AuthorityInstrument {
  id: string;
  name: string;
  citation?: string;
  description?: string;
}

interface EscalationStep {
  id: string;
  stepOrder: number;
  who: string;
  whatRole?: string;
  instrument?: string;
  notes?: string;
}

function InlineEdit({
  value,
  fields,
  onSave,
  onCancel,
}: {
  value: Record<string, string>;
  fields: { key: string; label: string; placeholder?: string; type?: "text" | "select"; options?: readonly string[] }[];
  onSave: (v: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(value);
  return (
    <div className="flex flex-col gap-1 flex-1">
      {fields.map((field) =>
        field.type === "select" && field.options ? (
          <Select key={field.key} value={form[field.key] ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, [field.key]: v }))}>
            <SelectTrigger className="h-6 text-xs bg-background border-border"><SelectValue placeholder={field.label} /></SelectTrigger>
            <SelectContent>{field.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        ) : (
          <Input
            key={field.key}
            value={form[field.key] ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
            placeholder={field.placeholder ?? field.label}
            className="h-6 text-xs bg-background border-border"
            autoFocus={fields[0].key === field.key}
          />
        )
      )}
      <div className="flex gap-1 mt-0.5">
        <Button size="sm" className="h-5 text-[10px] px-2 bg-primary hover:bg-primary/90" onClick={() => onSave(form)}>
          <Check className="w-2.5 h-2.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-5 text-[10px] px-2" onClick={onCancel}>
          <X className="w-2.5 h-2.5" />
        </Button>
      </div>
    </div>
  );
}

function DeleteConfirm({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="text-destructive hover:text-destructive/80"><Trash2 className="w-3 h-3" /></button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">Delete Item</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">Delete "{label}"? This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive" onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function ValueChainPage() {
  const { canWrite, accessToken } = useAuth();
  const { toast } = useToast();
  const [links, setLinks] = useState<ValueChainLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function authHeaders(): Record<string, string> {
    const h: Record<string, string> = {};
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    return h;
  }

  useEffect(() => {
    async function fetchLinks() {
      setLoading(true);
      try {
        const res = await fetch("/api/v1/admin/registry/value-chain-links", { headers: authHeaders() });
        if (!res.ok) throw new Error();
        const json = await res.json() as { data?: ValueChainLink[] };
        setLinks((json.data ?? []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      } catch {
        toast({ title: "Failed to load value chain", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    void fetchLinks();
  }, []);

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold uppercase tracking-widest">Registry — Value Chain</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Electricity value chain — stakeholders, instruments, and escalation steps per segment</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : links.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No value chain links found in registry.</div>
      ) : (
        <div className="space-y-2">
          {links.map((link, idx) => {
            const isExpanded = expandedId === link.id;
            return (
              <Card key={link.id} className="bg-card border-border">
                <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/20 transition-colors" onClick={() => setExpandedId(isExpanded ? null : link.id)}>
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary text-xs font-bold shrink-0">{idx + 1}</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{link.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{link.key}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${link.status === "G" ? "bg-green-600/20 text-green-400 border-green-600/40" : link.status === "A" ? "bg-yellow-600/20 text-yellow-400 border-yellow-600/40" : "bg-destructive/20 text-destructive border-destructive/40"}`}>
                    {link.status === "G" ? "GREEN" : link.status === "A" ? "AMBER" : "RED"}
                  </span>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </div>
                {isExpanded && (
                  <ValueChainLinkDetail linkId={link.id} canWrite={canWrite()} accessToken={accessToken} />
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ValueChainLinkDetail({ linkId, canWrite, accessToken }: {
  linkId: string;
  canWrite: boolean;
  accessToken: string | null;
}) {
  const { toast } = useToast();
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [instruments, setInstruments] = useState<AuthorityInstrument[]>([]);
  const [escalationSteps, setEscalationSteps] = useState<EscalationStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newStakeholder, setNewStakeholder] = useState({ role: "OPERATOR", title: "", description: "" });
  const [newInstrument, setNewInstrument] = useState({ name: "", citation: "", description: "" });
  const [newStep, setNewStep] = useState({ who: "", whatRole: "", instrument: "", notes: "" });

  function authHeaders(json = false): Record<string, string> {
    const h: Record<string, string> = {};
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    if (json) h["Content-Type"] = "application/json";
    return h;
  }

  async function fetchSubItems() {
    setLoading(true);
    try {
      const [sRes, iRes, eRes] = await Promise.all([
        fetch(`/api/v1/admin/registry/stakeholders`, { headers: authHeaders() }),
        fetch(`/api/v1/admin/registry/authority-instruments`, { headers: authHeaders() }),
        fetch(`/api/v1/admin/registry/escalation-steps`, { headers: authHeaders() }),
      ]);
      const [s, i, e] = await Promise.all([
        sRes.ok ? (sRes.json() as Promise<{ data?: Stakeholder[] }>) : Promise.resolve({ data: [] }),
        iRes.ok ? (iRes.json() as Promise<{ data?: AuthorityInstrument[] }>) : Promise.resolve({ data: [] }),
        eRes.ok ? (eRes.json() as Promise<{ data?: EscalationStep[] }>) : Promise.resolve({ data: [] }),
      ]);
      setStakeholders((s.data ?? []).filter((st) => (st as unknown as Record<string, unknown>)["valueChainLinkId"] === linkId));
      setInstruments((i.data ?? []).filter((it) => (it as unknown as Record<string, unknown>)["valueChainLinkId"] === linkId));
      setEscalationSteps(
        (e.data ?? [])
          .filter((es) => (es as unknown as Record<string, unknown>)["valueChainLinkId"] === linkId)
          .sort((a, b) => a.stepOrder - b.stepOrder)
      );
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchSubItems(); }, [linkId]);

  async function addStakeholder() {
    if (!newStakeholder.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/v1/admin/registry/stakeholders", {
        method: "POST", headers: authHeaders(true),
        body: JSON.stringify({ ...newStakeholder, valueChainLinkId: linkId }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Stakeholder added" });
      setNewStakeholder({ role: "OPERATOR", title: "", description: "" });
      void fetchSubItems();
    } catch { toast({ title: "Add failed", variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function addInstrument() {
    if (!newInstrument.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/v1/admin/registry/authority-instruments", {
        method: "POST", headers: authHeaders(true),
        body: JSON.stringify({ ...newInstrument, valueChainLinkId: linkId }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Instrument added" });
      setNewInstrument({ name: "", citation: "", description: "" });
      void fetchSubItems();
    } catch { toast({ title: "Add failed", variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function addEscalationStep() {
    if (!newStep.who.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/v1/admin/registry/escalation-steps", {
        method: "POST", headers: authHeaders(true),
        body: JSON.stringify({ ...newStep, stepOrder: escalationSteps.length + 1, valueChainLinkId: linkId }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Step added" });
      setNewStep({ who: "", whatRole: "", instrument: "", notes: "" });
      void fetchSubItems();
    } catch { toast({ title: "Add failed", variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function updateItem(type: "stakeholders" | "authority-instruments" | "escalation-steps", id: string, payload: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/v1/admin/registry/${type}/${id}`, {
        method: "PATCH", headers: authHeaders(true), body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Updated" });
      setEditingId(null);
      void fetchSubItems();
    } catch { toast({ title: "Update failed", variant: "destructive" }); }
  }

  async function deleteItem(type: "stakeholders" | "authority-instruments" | "escalation-steps", id: string) {
    try {
      const res = await fetch(`/api/v1/admin/registry/${type}/${id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Deleted" });
      void fetchSubItems();
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6 border-t border-border">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <CardContent className="p-4 border-t border-border space-y-5">
      {/* Stakeholders */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">Stakeholders</h4>
        <div className="space-y-1">
          {stakeholders.map((s) => (
            <div key={s.id} className="flex items-center gap-2 p-2 rounded bg-secondary/40 border border-border text-xs">
              {editingId === s.id ? (
                <InlineEdit
                  value={{ role: s.role, title: s.title, description: s.description ?? "" }}
                  fields={[
                    { key: "role", label: "Role", type: "select", options: STAKEHOLDER_ROLES },
                    { key: "title", label: "Title / Name" },
                    { key: "description", label: "Description (optional)" },
                  ]}
                  onSave={(v) => void updateItem("stakeholders", s.id, v)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="flex-1">
                    <span className="text-[10px] font-bold uppercase text-primary mr-2">{s.role}</span>
                    <span className="text-foreground font-medium">{s.title}</span>
                    {s.description && <p className="text-muted-foreground text-[10px] mt-0.5">{s.description}</p>}
                  </div>
                  {canWrite && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setEditingId(s.id)} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3 h-3" /></button>
                      <DeleteConfirm label={s.title} onConfirm={() => void deleteItem("stakeholders", s.id)} />
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          {stakeholders.length === 0 && <p className="text-[10px] text-muted-foreground">No stakeholders yet</p>}
          {canWrite && (
            <div className="space-y-1 mt-2">
              <div className="grid grid-cols-3 gap-2">
                <Select value={newStakeholder.role} onValueChange={(v) => setNewStakeholder((f) => ({ ...f, role: v }))}>
                  <SelectTrigger className="h-7 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{STAKEHOLDER_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
                <Input value={newStakeholder.title} onChange={(e) => setNewStakeholder((f) => ({ ...f, title: e.target.value }))} placeholder="Title / Name *" className="h-7 text-xs bg-background border-border" />
                <div className="flex gap-1">
                  <Input value={newStakeholder.description} onChange={(e) => setNewStakeholder((f) => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" className="h-7 text-xs bg-background border-border flex-1" />
                  <Button size="sm" className="h-7 text-xs bg-primary hover:bg-primary/90 shrink-0" onClick={() => void addStakeholder()} disabled={saving || !newStakeholder.title.trim()}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Authority Instruments */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">Authority Instruments</h4>
        <div className="space-y-1">
          {instruments.map((i) => (
            <div key={i.id} className="flex items-start gap-2 p-2 rounded bg-secondary/40 border border-border text-xs">
              {editingId === i.id ? (
                <InlineEdit
                  value={{ name: i.name, citation: i.citation ?? "", description: i.description ?? "" }}
                  fields={[
                    { key: "name", label: "Instrument name *" },
                    { key: "citation", label: "Citation / Reference" },
                    { key: "description", label: "Description (optional)" },
                  ]}
                  onSave={(v) => void updateItem("authority-instruments", i.id, v)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{i.name}</p>
                    {i.citation && <p className="text-primary text-[10px] font-mono mt-0.5">{i.citation}</p>}
                    {i.description && <p className="text-muted-foreground text-[10px] mt-0.5">{i.description}</p>}
                  </div>
                  {canWrite && (
                    <div className="flex gap-1 shrink-0 mt-0.5">
                      <button onClick={() => setEditingId(i.id)} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3 h-3" /></button>
                      <DeleteConfirm label={i.name} onConfirm={() => void deleteItem("authority-instruments", i.id)} />
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          {instruments.length === 0 && <p className="text-[10px] text-muted-foreground">No instruments yet</p>}
          {canWrite && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Input value={newInstrument.name} onChange={(e) => setNewInstrument((f) => ({ ...f, name: e.target.value }))} placeholder="Instrument name *" className="h-7 text-xs bg-background border-border" />
              <Input value={newInstrument.citation} onChange={(e) => setNewInstrument((f) => ({ ...f, citation: e.target.value }))} placeholder="Citation / Reference" className="h-7 text-xs bg-background border-border" />
              <div className="flex gap-1">
                <Input value={newInstrument.description} onChange={(e) => setNewInstrument((f) => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" className="h-7 text-xs bg-background border-border flex-1" />
                <Button size="sm" className="h-7 text-xs bg-primary hover:bg-primary/90 shrink-0" onClick={() => void addInstrument()} disabled={saving || !newInstrument.name.trim()}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Escalation Steps */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">Escalation Steps</h4>
        <div className="space-y-1">
          {escalationSteps.map((step, idx) => (
            <div key={step.id} className="flex items-start gap-2 p-2 rounded bg-secondary/40 border border-border text-xs">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">{idx + 1}</div>
              {editingId === step.id ? (
                <InlineEdit
                  value={{ who: step.who, whatRole: step.whatRole ?? "", instrument: step.instrument ?? "", notes: step.notes ?? "" }}
                  fields={[
                    { key: "who", label: "Who acts *" },
                    { key: "whatRole", label: "Their role (optional)" },
                    { key: "instrument", label: "Instrument used (optional)" },
                    { key: "notes", label: "Notes (optional)" },
                  ]}
                  onSave={(v) => void updateItem("escalation-steps", step.id, v)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{step.who}</p>
                    {step.whatRole && <p className="text-[10px] text-muted-foreground">Role: {step.whatRole}</p>}
                    {step.instrument && <p className="text-[10px] text-muted-foreground">Via: {step.instrument}</p>}
                    {step.notes && <p className="text-[10px] text-muted-foreground mt-0.5 italic">{step.notes}</p>}
                  </div>
                  {canWrite && (
                    <div className="flex gap-1 shrink-0 mt-0.5">
                      <button onClick={() => setEditingId(step.id)} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3 h-3" /></button>
                      <DeleteConfirm label={step.who} onConfirm={() => void deleteItem("escalation-steps", step.id)} />
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          {escalationSteps.length === 0 && <p className="text-[10px] text-muted-foreground">No escalation steps yet</p>}
          {canWrite && (
            <div className="space-y-1 mt-2">
              <div className="grid grid-cols-2 gap-2">
                <Input value={newStep.who} onChange={(e) => setNewStep((f) => ({ ...f, who: e.target.value }))} placeholder="Who acts *" className="h-7 text-xs bg-background border-border" />
                <Input value={newStep.whatRole} onChange={(e) => setNewStep((f) => ({ ...f, whatRole: e.target.value }))} placeholder="Their role (optional)" className="h-7 text-xs bg-background border-border" />
                <Input value={newStep.instrument} onChange={(e) => setNewStep((f) => ({ ...f, instrument: e.target.value }))} placeholder="Instrument used (optional)" className="h-7 text-xs bg-background border-border" />
                <div className="flex gap-1">
                  <Input value={newStep.notes} onChange={(e) => setNewStep((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)" className="h-7 text-xs bg-background border-border flex-1" />
                  <Button size="sm" className="h-7 text-xs bg-primary hover:bg-primary/90 shrink-0" onClick={() => void addEscalationStep()} disabled={saving || !newStep.who.trim()}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </CardContent>
  );
}
