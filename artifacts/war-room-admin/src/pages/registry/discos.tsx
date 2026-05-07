import { useState } from "react";
import { useGetDiscos, useGetDiscoFeeders } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FeederRecord {
  id: string;
  name: string;
  voltage?: string;
  customerCount?: number;
  supplyHours?: number;
  atccLossPct?: number;
}

function FeederRows({ discoId, canEdit, accessToken }: { discoId: string; canEdit: boolean; accessToken: string | null }) {
  const { data, isLoading, refetch } = useGetDiscoFeeders(discoId);
  const feeders = (data as unknown as { data?: FeederRecord[] })?.data ?? [];
  const { toast } = useToast();
  const [editFeeder, setEditFeeder] = useState<FeederRecord | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [createMode, setCreateMode] = useState(false);

  function authHeaders(): Record<string, string> {
    const h: Record<string, string> = {};
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    return h;
  }

  async function handleDeleteFeeder(feederId: string) {
    try {
      const res = await fetch(`/api/v1/admin/registry/feeders/${feederId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Feeder deleted" });
      void refetch();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  }

  return (
    <tr>
      <td colSpan={8} className="bg-secondary/20 p-0">
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-8 py-2 text-left text-muted-foreground uppercase tracking-wider font-bold">Feeder</th>
                <th className="px-4 py-2 text-left text-muted-foreground uppercase tracking-wider font-bold">Voltage</th>
                <th className="px-4 py-2 text-left text-muted-foreground uppercase tracking-wider font-bold">Customers</th>
                <th className="px-4 py-2 text-left text-muted-foreground uppercase tracking-wider font-bold">Supply Hrs</th>
                {canEdit && <th className="px-4 py-2 text-left text-muted-foreground uppercase tracking-wider font-bold">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {feeders.length === 0 ? (
                <tr><td colSpan={canEdit ? 5 : 4} className="px-8 py-3 text-muted-foreground">No feeders</td></tr>
              ) : feeders.map((feeder) => (
                <tr key={feeder.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                  <td className="px-8 py-2 text-foreground">{feeder.name}</td>
                  <td className="px-4 py-2 text-foreground">{feeder.voltage ?? "—"}</td>
                  <td className="px-4 py-2 text-foreground">{feeder.customerCount?.toLocaleString() ?? "—"}</td>
                  <td className="px-4 py-2 text-foreground">{feeder.supplyHours ?? "—"}</td>
                  {canEdit && (
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                          onClick={() => { setEditFeeder(feeder); setCreateMode(false); setShowModal(true); }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border">
                            <AlertDialogHeader><AlertDialogTitle className="text-foreground">Delete Feeder</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground">Delete feeder "{feeder.name}"?</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={() => void handleDeleteFeeder(feeder.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {canEdit && (
                <tr>
                  <td colSpan={5} className="px-8 py-2">
                    <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => { setEditFeeder(null); setCreateMode(true); setShowModal(true); }}>
                      <Plus className="w-3 h-3" /> Add feeder
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="bg-card border-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-foreground uppercase tracking-widest text-sm font-bold">
                {createMode ? "Add Feeder" : "Edit Feeder"}
              </DialogTitle>
            </DialogHeader>
            <FeederForm
              discoId={discoId}
              feeder={editFeeder}
              accessToken={accessToken}
              onSuccess={() => { setShowModal(false); void refetch(); }}
              onCancel={() => setShowModal(false)}
            />
          </DialogContent>
        </Dialog>
      </td>
    </tr>
  );
}

function FeederForm({ discoId, feeder, accessToken, onSuccess, onCancel }: {
  discoId: string;
  feeder: FeederRecord | null;
  accessToken: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: feeder?.name ?? "",
    voltage: feeder?.voltage ?? "",
    customerCount: String(feeder?.customerCount ?? ""),
    supplyHours: String(feeder?.supplyHours ?? ""),
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const url = feeder ? `/api/v1/admin/registry/feeders/${feeder.id}` : `/api/v1/admin/registry/feeders`;
      const body: Record<string, unknown> = { name: form.name, discoId };
      if (form.voltage) body["voltage"] = form.voltage;
      if (form.customerCount) body["customerCount"] = parseInt(form.customerCount, 10);
      if (form.supplyHours) body["supplyHours"] = parseFloat(form.supplyHours);
      const res = await fetch(url, { method: feeder ? "PATCH" : "POST", headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast({ title: feeder ? "Feeder updated" : "Feeder created" });
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
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Voltage</Label>
        <Input value={form.voltage} onChange={(e) => setForm((f) => ({ ...f, voltage: e.target.value }))} placeholder="e.g. 11KV" className="h-7 text-xs bg-background border-border" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Customers</Label>
          <Input type="number" value={form.customerCount} onChange={(e) => setForm((f) => ({ ...f, customerCount: e.target.value }))} className="h-7 text-xs bg-background border-border" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Supply Hrs/Day</Label>
          <Input type="number" step="0.1" value={form.supplyHours} onChange={(e) => setForm((f) => ({ ...f, supplyHours: e.target.value }))} className="h-7 text-xs bg-background border-border" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90" disabled={saving}>
          {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
          {feeder ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  );
}

export default function DiscosPage() {
  const { canWrite, accessToken } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const { toast } = useToast();

  const { data, isLoading, refetch } = useGetDiscos({ page: 1 });
  const discos = (data as unknown as { data?: unknown[] })?.data ?? [];

  function authHeaders(): Record<string, string> {
    const h: Record<string, string> = {};
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    return h;
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/v1/admin/registry/discos/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      toast({ title: "DisCo deleted" });
      void refetch();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest">Registry — DisCos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Distribution companies and their feeders</p>
        </div>
        {canWrite() && (
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => { setEditItem(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" />
            Add DisCo
          </Button>
        )}
      </div>

      <Card className="bg-card border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-border">
              <tr>
                <th className="p-3 w-8" />
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Licence #</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">ATCC %</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Metering %</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Collection Eff. %</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Badge</th>
                {canWrite() && <th className="p-3" />}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></td></tr>
              ) : discos.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No DisCos</td></tr>
              ) : discos.map((d: unknown) => {
                const disco = d as Record<string, unknown>;
                const did = disco.id as string;
                const isExpanded = expandedId === did;
                return (
                  <tr key={did}>
                    <td colSpan={8} className="p-0">
                      <table className="w-full">
                        <tbody>
                          <tr className="border-b border-border hover:bg-secondary/20 transition-colors">
                            <td className="p-3 w-8">
                              <button onClick={() => setExpandedId(isExpanded ? null : did)} className="text-muted-foreground hover:text-foreground">
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            </td>
                            <td className="p-3 font-medium text-foreground">{disco.name as string}</td>
                            <td className="p-3 text-muted-foreground font-mono text-[10px]">{(disco.licenceNumber as string) ?? "—"}</td>
                            <td className="p-3 text-foreground">{(disco.atccLossPct as number) !== undefined ? `${(disco.atccLossPct as number)}%` : "—"}</td>
                            <td className="p-3 text-foreground">{(disco.meteringRatePct as number) !== undefined ? `${(disco.meteringRatePct as number)}%` : "—"}</td>
                            <td className="p-3 text-foreground">{(disco.collectionEffPct as number) !== undefined ? `${(disco.collectionEffPct as number)}%` : "—"}</td>
                            <td className="p-3">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${(disco.badge as string) === "GOOD" ? "bg-green-600/20 text-green-400 border-green-600/40" : (disco.badge as string) === "BAD" ? "bg-destructive/20 text-destructive border-destructive/40" : "bg-yellow-600/20 text-yellow-400 border-yellow-600/40"}`}>
                                {disco.badge as string}
                              </span>
                            </td>
                            {canWrite() && (
                              <td className="p-3">
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditItem(disco); setShowModal(true); }}><Pencil className="w-3 h-3" /></Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-card border-border">
                                      <AlertDialogHeader><AlertDialogTitle className="text-foreground">Delete DisCo</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground">Soft-delete this DisCo and all associated feeders?</AlertDialogDescription></AlertDialogHeader>
                                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={() => void handleDelete(did)}>Delete</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </td>
                            )}
                          </tr>
                          {isExpanded && <FeederRows discoId={did} canEdit={canWrite()} accessToken={accessToken} />}
                        </tbody>
                      </table>
                    </td>
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
              {editItem ? "Edit DisCo" : "Add DisCo"}
            </DialogTitle>
          </DialogHeader>
          <DiscoForm
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

function DiscoForm({ item, accessToken, onSuccess, onCancel }: {
  item: Record<string, unknown> | null;
  accessToken: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: (item?.name as string) ?? "",
    licenceNumber: (item?.licenceNumber as string) ?? "",
    registeredOffice: (item?.registeredOffice as string) ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const url = item ? `/api/v1/admin/registry/discos/${item.id}` : `/api/v1/admin/registry/discos`;
      const res = await fetch(url, { method: item ? "PATCH" : "POST", headers, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast({ title: item ? "DisCo updated" : "DisCo created" });
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
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Licence Number</Label>
        <Input value={form.licenceNumber} onChange={(e) => setForm((f) => ({ ...f, licenceNumber: e.target.value }))} className="h-7 text-xs bg-background border-border" />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Registered Office</Label>
        <Input value={form.registeredOffice} onChange={(e) => setForm((f) => ({ ...f, registeredOffice: e.target.value }))} className="h-7 text-xs bg-background border-border" />
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
