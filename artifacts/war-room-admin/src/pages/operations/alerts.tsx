import { useState } from "react";
import { useGetActiveAlerts } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Pencil, Trash2, CheckCircle2, AlertTriangle, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

const SEVERITY_OPTIONS = ["CRITICAL", "HIGH", "MEDIUM", "INFO"] as const;
const CATEGORY_OPTIONS = ["GENERATION", "TRANSMISSION", "DISTRIBUTION", "FINANCIAL", "COMPLIANCE", "SECURITY", "OPERATIONS", "OTHER"];

function severityColor(severity: string) {
  switch (severity) {
    case "CRITICAL": return "bg-destructive/20 text-destructive border-destructive/40";
    case "HIGH": return "bg-orange-600/20 text-orange-400 border-orange-600/40";
    case "MEDIUM": return "bg-yellow-600/20 text-yellow-400 border-yellow-600/40";
    case "INFO": return "bg-blue-600/20 text-blue-400 border-blue-600/40";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export default function AlertsPage() {
  const { canWrite, accessToken } = useAuth();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);

  const { data, isLoading, refetch } = useGetActiveAlerts();
  const alerts = (data as unknown as { data?: unknown[] })?.data ?? [];

  function authHeaders(json = false): Record<string, string> {
    const h: Record<string, string> = {};
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    if (json) h["Content-Type"] = "application/json";
    return h;
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/v1/admin/alerts/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error();
      toast({ title: "Alert deleted" });
      void refetch();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  }

  async function handleResolve(id: string) {
    try {
      const res = await fetch(`/api/v1/admin/alerts/${id}`, {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({ status: "RESOLVED" }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Alert resolved" });
      void refetch();
    } catch {
      toast({ title: "Resolve failed", variant: "destructive" });
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest">Operations — Alerts</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{alerts.length} alerts</p>
        </div>
        {canWrite() && (
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => { setEditItem(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" />
            Create Alert
          </Button>
        )}
      </div>

      <Card className="bg-card border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-border">
              <tr>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Title</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Severity</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Category</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Created</th>
                {canWrite() && <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></td></tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Bell className="w-8 h-8 opacity-40" />
                      <p>No alerts</p>
                    </div>
                  </td>
                </tr>
              ) : alerts.map((a: unknown) => {
                const alert = a as Record<string, unknown>;
                return (
                  <tr key={alert.id as string} className="border-b border-border hover:bg-secondary/20">
                    <td className="p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${(alert.severity as string) === "CRITICAL" ? "text-destructive" : "text-yellow-400"}`} />
                        <div>
                          <p className="font-medium text-foreground">{alert.title as string}</p>
                          {(alert.message as string | undefined) && (
                            <p className="text-muted-foreground mt-0.5 line-clamp-1">{alert.message as string}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${severityColor(alert.severity as string)}`}>
                        {alert.severity as string}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{alert.category as string}</td>
                    <td className="p-3 text-muted-foreground font-mono text-[10px]">{alert.status as string}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(alert.createdAt as string)}</td>
                    {canWrite() && (
                      <td className="p-3">
                        <div className="flex gap-1">
                          {(alert.status as string) !== "RESOLVED" && (
                            <Button
                              variant="ghost" size="sm" className="h-6 w-6 p-0 text-green-400 hover:text-green-300"
                              onClick={() => void handleResolve(alert.id as string)} title="Resolve"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost" size="sm" className="h-6 w-6 p-0"
                            onClick={() => { setEditItem(alert); setShowModal(true); }}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-foreground">Delete Alert</AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground">
                                  Permanently delete "{alert.title as string}"? This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive" onClick={() => void handleDelete(alert.id as string)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground uppercase tracking-widest text-sm font-bold">
              {editItem ? "Edit Alert" : "Create Alert"}
            </DialogTitle>
          </DialogHeader>
          <AlertForm
            item={editItem}
            accessToken={accessToken}
            onSuccess={() => { setShowModal(false); void refetch(); }}
            onCancel={() => setShowModal(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AlertForm({
  item,
  accessToken,
  onSuccess,
  onCancel,
}: {
  item: Record<string, unknown> | null;
  accessToken: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: (item?.title as string) ?? "",
    message: (item?.message as string) ?? "",
    severity: (item?.severity as string) ?? "MEDIUM",
    category: (item?.category as string) ?? "OPERATIONS",
    actionRequired: (item?.actionRequired as string) ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.category.trim() || !form.message.trim()) {
      toast({ title: "Title, category, and message are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const url = item ? `/api/v1/admin/alerts/${item.id}` : `/api/v1/admin/alerts`;
      const res = await fetch(url, {
        method: item ? "PATCH" : "POST",
        headers,
        body: JSON.stringify({
          title: form.title.trim(),
          message: form.message.trim(),
          severity: form.severity,
          category: form.category,
          ...(form.actionRequired.trim() ? { actionRequired: form.actionRequired.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(errJson.error?.message ?? `Server ${res.status}`);
      }
      toast({ title: item ? "Alert updated" : "Alert created" });
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-xs">
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Title *</Label>
        <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required className="h-7 text-xs bg-background border-border" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Severity *</Label>
          <Select value={form.severity} onValueChange={(v) => setForm((f) => ({ ...f, severity: v }))}>
            <SelectTrigger className="h-7 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Category *</Label>
          <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
            <SelectTrigger className="h-7 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Message *</Label>
        <Textarea value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} required className="text-xs min-h-[70px] bg-background border-border" />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Action Required (optional)</Label>
        <Input value={form.actionRequired} onChange={(e) => setForm((f) => ({ ...f, actionRequired: e.target.value }))} className="h-7 text-xs bg-background border-border" placeholder="What action should be taken…" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90" disabled={saving}>
          {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
          {item ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  );
}
