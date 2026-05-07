import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Pencil, Trash2, GitBranch, ChevronUp, ChevronDown, Code, FormInput } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

interface EscalationRule {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  priority: number;
  category?: string;
  ageHours?: number;
  currentLevel?: number;
  action?: string;
  rawDsl?: string;
}

export default function EscalationRulesPage() {
  const { toast } = useToast();
  const { accessToken, canWrite } = useAuth();
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [reorderLoading, setReorderLoading] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule] = useState<EscalationRule | null>(null);

  function authHeaders(json = false): Record<string, string> {
    const h: Record<string, string> = {};
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    if (json) h["Content-Type"] = "application/json";
    return h;
  }

  async function loadRules() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/registry/escalation-rules", { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load rules");
      const json = await res.json() as { data?: EscalationRule[] };
      setRules((json.data ?? []).sort((a, b) => a.priority - b.priority));
    } catch {
      toast({ title: "Could not load escalation rules", variant: "destructive" });
      setRules([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRules();
  }, []);

  async function handleToggle(rule: EscalationRule) {
    const original = rule.active;
    setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, active: !r.active } : r));
    try {
      const res = await fetch(`/api/v1/admin/registry/escalation-rules/${rule.id}`, {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({ active: !original }),
      });
      if (!res.ok) throw new Error();
      toast({ title: `Rule ${!original ? "activated" : "deactivated"}` });
    } catch {
      setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, active: original } : r));
      toast({ title: "Update failed", variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
    try {
      const res = await fetch(`/api/v1/admin/registry/escalation-rules/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error();
      toast({ title: "Rule deleted" });
    } catch {
      toast({ title: "Delete failed — refreshing", variant: "destructive" });
      void loadRules();
    }
  }

  async function handleReorder(rule: EscalationRule, direction: "up" | "down") {
    const sorted = [...rules].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex((r) => r.id === rule.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const swapWith = sorted[swapIdx];
    const newPriorityA = swapWith.priority;
    const newPriorityB = rule.priority;

    // Optimistic update
    setRules((prev) => prev.map((r) => {
      if (r.id === rule.id) return { ...r, priority: newPriorityA };
      if (r.id === swapWith.id) return { ...r, priority: newPriorityB };
      return r;
    }));

    setReorderLoading(rule.id);
    try {
      await Promise.all([
        fetch(`/api/v1/admin/registry/escalation-rules/${rule.id}`, {
          method: "PATCH", headers: authHeaders(true),
          body: JSON.stringify({ priority: newPriorityA }),
        }),
        fetch(`/api/v1/admin/registry/escalation-rules/${swapWith.id}`, {
          method: "PATCH", headers: authHeaders(true),
          body: JSON.stringify({ priority: newPriorityB }),
        }),
      ]);
    } catch {
      toast({ title: "Reorder failed", variant: "destructive" });
      void loadRules();
    } finally {
      setReorderLoading(null);
    }
  }

  async function handleSave(payload: Omit<EscalationRule, "id">, existingId?: string) {
    try {
      if (existingId) {
        const res = await fetch(`/api/v1/admin/registry/escalation-rules/${existingId}`, {
          method: "PATCH", headers: authHeaders(true), body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        const json = await res.json() as { data?: EscalationRule };
        setRules((prev) => prev.map((r) => r.id === existingId ? (json.data ?? { ...payload, id: existingId }) : r));
      } else {
        const res = await fetch("/api/v1/admin/registry/escalation-rules", {
          method: "POST", headers: authHeaders(true), body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        const json = await res.json() as { data?: EscalationRule };
        setRules((prev) => [...prev, json.data ?? { ...payload, id: String(Date.now()) }]);
      }
      setShowModal(false);
      toast({ title: existingId ? "Rule updated" : "Rule created" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  }

  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest">Escalation Rules</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loading ? "Loading…" : `${rules.filter((r) => r.active).length} of ${rules.length} rules active`}
          </p>
        </div>
        {canWrite() && (
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => { setEditRule(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" />
            Create Rule
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : sortedRules.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No escalation rules configured</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedRules.map((rule, idx) => (
            <Card key={rule.id} className={`bg-card border-border transition-opacity ${!rule.active ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {canWrite() && (
                    <div className="flex flex-col gap-0.5 pt-1 shrink-0">
                      <button
                        disabled={idx === 0 || reorderLoading === rule.id}
                        onClick={() => void handleReorder(rule, "up")}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        {reorderLoading === rule.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ChevronUp className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        disabled={idx === sortedRules.length - 1 || reorderLoading === rule.id}
                        onClick={() => void handleReorder(rule, "down")}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-3.5 h-3.5 text-primary shrink-0" />
                      <p className="text-sm font-bold text-foreground">{rule.name}</p>
                      <span className="text-[10px] font-mono text-muted-foreground border border-border px-1.5 py-0.5 rounded ml-auto shrink-0">
                        Priority {rule.priority}
                      </span>
                    </div>
                    {rule.description && (
                      <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {rule.category && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-border text-muted-foreground">
                          Category: {rule.category}
                        </span>
                      )}
                      {rule.ageHours !== undefined && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-border text-muted-foreground">
                          Age ≥ {rule.ageHours}h
                        </span>
                      )}
                      {rule.currentLevel !== undefined && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-border text-muted-foreground">
                          Level {rule.currentLevel}
                        </span>
                      )}
                      {rule.action && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary">
                          → {rule.action}
                        </span>
                      )}
                    </div>
                  </div>
                  {canWrite() && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={rule.active} onCheckedChange={() => void handleToggle(rule)} />
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditRule(rule); setShowModal(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-foreground">Delete Rule</AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                              This will permanently delete "{rule.name}". This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive" onClick={() => void handleDelete(rule.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground uppercase tracking-widest text-sm font-bold">
              {editRule ? "Edit Rule" : "Create Rule"}
            </DialogTitle>
          </DialogHeader>
          <RuleForm
            rule={editRule}
            nextPriority={rules.length + 1}
            onSuccess={(payload) => handleSave(payload, editRule?.id)}
            onCancel={() => setShowModal(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RuleForm({
  rule,
  nextPriority,
  onSuccess,
  onCancel,
}: {
  rule: EscalationRule | null;
  nextPriority: number;
  onSuccess: (r: Omit<EscalationRule, "id">) => Promise<void>;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"guided" | "json">("guided");
  const [form, setForm] = useState({
    name: rule?.name ?? "",
    description: rule?.description ?? "",
    category: rule?.category ?? "any",
    ageHours: String(rule?.ageHours ?? ""),
    currentLevel: rule?.currentLevel ? String(rule.currentLevel) : "any",
    action: rule?.action ?? "",
    active: rule?.active ?? true,
    priority: String(rule?.priority ?? nextPriority),
  });
  const [rawDsl, setRawDsl] = useState(
    rule?.rawDsl ?? JSON.stringify({ category: "", ageHours: 0, currentLevel: 1, action: "ESCALATE_TO_LEVEL_2" }, null, 2),
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    let parsed: Omit<EscalationRule, "id">;
    if (mode === "json") {
      try {
        parsed = JSON.parse(rawDsl) as Omit<EscalationRule, "id">;
      } catch {
        setSaving(false);
        return;
      }
    } else {
      parsed = {
        name: form.name,
        description: form.description || undefined,
        category: (form.category && form.category !== "any") ? form.category : undefined,
        ageHours: form.ageHours ? parseInt(form.ageHours) : undefined,
        currentLevel: (form.currentLevel && form.currentLevel !== "any") ? parseInt(form.currentLevel) : undefined,
        action: form.action || undefined,
        active: form.active,
        priority: parseInt(form.priority) || nextPriority,
      };
    }
    await onSuccess(parsed);
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-1 border border-border rounded overflow-hidden">
        {(["guided", "json"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {m === "guided" ? <FormInput className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
            {m === "guided" ? "Guided Form" : "JSON DSL"}
          </button>
        ))}
      </div>

      {mode === "guided" ? (
        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Rule Name *</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="h-7 text-xs bg-background border-border" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Description</Label>
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="h-7 text-xs bg-background border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="h-7 text-xs bg-background border-border"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {["BILLING", "OUTAGE", "METERING", "QUALITY", "CONNECTION"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Age ≥ (hours)</Label>
              <Input type="number" value={form.ageHours} onChange={(e) => setForm((f) => ({ ...f, ageHours: e.target.value }))} className="h-7 text-xs bg-background border-border" placeholder="—" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Current Level</Label>
              <Select value={form.currentLevel} onValueChange={(v) => setForm((f) => ({ ...f, currentLevel: v }))}>
                <SelectTrigger className="h-7 text-xs bg-background border-border"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {[1, 2, 3, 4, 5].map((l) => <SelectItem key={l} value={String(l)}>Level {l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Action</Label>
              <Select value={form.action} onValueChange={(v) => setForm((f) => ({ ...f, action: v }))}>
                <SelectTrigger className="h-7 text-xs bg-background border-border"><SelectValue placeholder="Select action" /></SelectTrigger>
                <SelectContent>
                  {["ESCALATE_TO_LEVEL_2", "ESCALATE_TO_LEVEL_3", "ESCALATE_TO_LEVEL_4", "ESCALATE_TO_LEVEL_5", "NOTIFY_MINISTER", "CLOSE"].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Priority</Label>
              <Input type="number" min={1} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className="h-7 text-xs bg-background border-border" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
            <Label className="text-xs text-muted-foreground">Active</Label>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">JSON DSL</Label>
          <Textarea value={rawDsl} onChange={(e) => setRawDsl(e.target.value)} className="font-mono text-xs min-h-[200px] bg-background border-border" />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90" disabled={saving}>
          {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
          {rule ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  );
}
