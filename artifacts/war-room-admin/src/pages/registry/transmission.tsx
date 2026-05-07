import { useState } from "react";
import { useGetTransmissionLines, useGetSubstations } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const LINE_ENDPOINT = "/api/v1/admin/registry/transmission-lines";
const SUBSTATION_ENDPOINT = "/api/v1/admin/registry/substations";

export default function TransmissionPage() {
  const { canWrite, accessToken } = useAuth();
  const [tab, setTab] = useState<"lines" | "substations">("lines");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const { toast } = useToast();

  const { data: linesData, isLoading: linesLoading, refetch: refetchLines } = useGetTransmissionLines({ page: 1 });
  const { data: subsData, isLoading: subsLoading, refetch: refetchSubs } = useGetSubstations();

  const lines = (linesData as unknown as { data?: unknown[] })?.data ?? [];
  const substations = (subsData as unknown as { data?: unknown[] })?.data ?? [];

  function authHeaders(): Record<string, string> {
    const h: Record<string, string> = {};
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    return h;
  }

  async function handleDelete(id: string) {
    const endpoint = tab === "lines" ? LINE_ENDPOINT : SUBSTATION_ENDPOINT;
    try {
      const res = await fetch(`${endpoint}/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Deleted" });
      if (tab === "lines") void refetchLines(); else void refetchSubs();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest">Registry — Transmission</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Lines and substations registry</p>
        </div>
        {canWrite() && (
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => { setEditItem(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" />
            Add {tab === "lines" ? "Line" : "Substation"}
          </Button>
        )}
      </div>

      <div className="flex gap-1 border-b border-border pb-0">
        {(["lines", "substations"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      <Card className="bg-card border-border">
        <div className="overflow-x-auto">
          {tab === "lines" ? (
            <table className="w-full text-xs">
              <thead className="border-b border-border">
                <tr>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Voltage (kV)</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Length (km)</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Capacity (MVA)</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                  {canWrite() && <th className="p-3" />}
                </tr>
              </thead>
              <tbody>
                {linesLoading ? (
                  <tr><td colSpan={6} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></td></tr>
                ) : lines.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No transmission lines</td></tr>
                ) : lines.map((l: unknown) => {
                  const line = l as Record<string, unknown>;
                  return (
                    <tr key={line.id as string} className="border-b border-border hover:bg-secondary/20">
                      <td className="p-3 font-medium text-foreground">{line.name as string}</td>
                      <td className="p-3 text-foreground">{line.voltageKv as number}</td>
                      <td className="p-3 text-foreground">{line.lengthKm !== null ? String(line.lengthKm) : "—"}</td>
                      <td className="p-3 text-foreground">{line.capacityMva !== null ? String(line.capacityMva) : "—"}</td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${line.status === "ACTIVE" ? "bg-green-600/20 text-green-400 border-green-600/40" : "bg-muted text-muted-foreground border-border"}`}>
                          {line.status as string}
                        </span>
                      </td>
                      {canWrite() && (
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditItem(line); setShowModal(true); }}><Pencil className="w-3 h-3" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-card border-border">
                                <AlertDialogHeader><AlertDialogTitle className="text-foreground">Delete Line</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground">Delete this transmission line?</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={() => void handleDelete(line.id as string)}>Delete</AlertDialogAction></AlertDialogFooter>
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
          ) : (
            <table className="w-full text-xs">
              <thead className="border-b border-border">
                <tr>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Voltage Class</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">State</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Capacity (MVA)</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Circuits</th>
                  {canWrite() && <th className="p-3" />}
                </tr>
              </thead>
              <tbody>
                {subsLoading ? (
                  <tr><td colSpan={6} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></td></tr>
                ) : substations.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No substations</td></tr>
                ) : substations.map((s: unknown) => {
                  const sub = s as Record<string, unknown>;
                  return (
                    <tr key={sub.id as string} className="border-b border-border hover:bg-secondary/20">
                      <td className="p-3 font-medium text-foreground">{sub.name as string}</td>
                      <td className="p-3 text-foreground">{sub.voltageClass as string}</td>
                      <td className="p-3 text-muted-foreground">{(sub.state as string) ?? "—"}</td>
                      <td className="p-3 text-foreground">{String(sub.capacityMva)}</td>
                      <td className="p-3 text-foreground">{(sub.circuitCount as number) ?? "—"}</td>
                      {canWrite() && (
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditItem(sub); setShowModal(true); }}><Pencil className="w-3 h-3" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-card border-border">
                                <AlertDialogHeader><AlertDialogTitle className="text-foreground">Delete Substation</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground">Delete this substation?</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={() => void handleDelete(sub.id as string)}>Delete</AlertDialogAction></AlertDialogFooter>
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
          )}
        </div>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground uppercase tracking-widest text-sm font-bold">
              {editItem ? "Edit" : "Add"} {tab === "lines" ? "Transmission Line" : "Substation"}
            </DialogTitle>
          </DialogHeader>
          {tab === "lines" ? (
            <LineForm
              item={editItem}
              accessToken={accessToken}
              onSuccess={() => { setShowModal(false); void refetchLines(); }}
              onCancel={() => setShowModal(false)}
            />
          ) : (
            <SubstationForm
              item={editItem}
              accessToken={accessToken}
              onSuccess={() => { setShowModal(false); void refetchSubs(); }}
              onCancel={() => setShowModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LineForm({ item, accessToken, onSuccess, onCancel }: {
  item: Record<string, unknown> | null;
  accessToken: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: (item?.name as string) ?? "",
    voltageKv: String(item?.voltageKv ?? ""),
    lengthKm: String(item?.lengthKm ?? ""),
    capacityMva: String(item?.capacityMva ?? ""),
    fromSubstationId: (item?.fromSubstationId as string) ?? "",
    toSubstationId: (item?.toSubstationId as string) ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const url = item ? `${LINE_ENDPOINT}/${item.id}` : LINE_ENDPOINT;
      const body: Record<string, unknown> = { name: form.name };
      if (form.voltageKv) body["voltageKv"] = parseInt(form.voltageKv, 10);
      if (form.lengthKm) body["lengthKm"] = parseFloat(form.lengthKm);
      if (form.capacityMva) body["capacityMva"] = parseFloat(form.capacityMva);
      if (form.fromSubstationId) body["fromSubstationId"] = form.fromSubstationId;
      if (form.toSubstationId) body["toSubstationId"] = form.toSubstationId;
      const res = await fetch(url, { method: item ? "PATCH" : "POST", headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast({ title: item ? "Line updated" : "Line created" });
      onSuccess();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-xs">
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Name *</Label>
        <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="h-7 text-xs bg-background border-border" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Voltage kV</Label>
          <Input type="number" value={form.voltageKv} onChange={(e) => setForm((f) => ({ ...f, voltageKv: e.target.value }))} className="h-7 text-xs bg-background border-border" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Length km</Label>
          <Input type="number" step="0.01" value={form.lengthKm} onChange={(e) => setForm((f) => ({ ...f, lengthKm: e.target.value }))} className="h-7 text-xs bg-background border-border" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Capacity MVA</Label>
          <Input type="number" step="0.01" value={form.capacityMva} onChange={(e) => setForm((f) => ({ ...f, capacityMva: e.target.value }))} className="h-7 text-xs bg-background border-border" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90" disabled={saving}>
          {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}{item ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  );
}

function SubstationForm({ item, accessToken, onSuccess, onCancel }: {
  item: Record<string, unknown> | null;
  accessToken: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: (item?.name as string) ?? "",
    voltageClass: (item?.voltageClass as string) ?? "",
    state: (item?.state as string) ?? "",
    capacityMva: String(item?.capacityMva ?? ""),
    circuitCount: String(item?.circuitCount ?? ""),
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const url = item ? `${SUBSTATION_ENDPOINT}/${item.id}` : SUBSTATION_ENDPOINT;
      const body: Record<string, unknown> = { name: form.name };
      if (form.voltageClass) body["voltageClass"] = form.voltageClass;
      if (form.state) body["state"] = form.state;
      if (form.capacityMva) body["capacityMva"] = parseFloat(form.capacityMva);
      if (form.circuitCount) body["circuitCount"] = parseInt(form.circuitCount, 10);
      const res = await fetch(url, { method: item ? "PATCH" : "POST", headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast({ title: item ? "Substation updated" : "Substation created" });
      onSuccess();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-xs">
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Name *</Label>
        <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="h-7 text-xs bg-background border-border" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Voltage Class</Label>
          <Input value={form.voltageClass} onChange={(e) => setForm((f) => ({ ...f, voltageClass: e.target.value }))} placeholder="e.g. 330/132kV" className="h-7 text-xs bg-background border-border" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">State</Label>
          <Input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className="h-7 text-xs bg-background border-border" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Capacity MVA</Label>
          <Input type="number" step="0.01" value={form.capacityMva} onChange={(e) => setForm((f) => ({ ...f, capacityMva: e.target.value }))} className="h-7 text-xs bg-background border-border" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Circuit Count</Label>
          <Input type="number" value={form.circuitCount} onChange={(e) => setForm((f) => ({ ...f, circuitCount: e.target.value }))} className="h-7 text-xs bg-background border-border" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90" disabled={saving}>
          {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}{item ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  );
}
