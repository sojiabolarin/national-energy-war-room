import { useState } from "react";
import { useGetMiniGrids } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PROGRAMMES = ["REA", "NMPP", "NLDO", "OTHER"];

export default function MinigridsPage() {
  const { canWrite } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [filterProgramme, setFilterProgramme] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const { toast } = useToast();

  const { data, isLoading, refetch } = useGetMiniGrids();
  const allGrids = (data as unknown as { data?: unknown[] })?.data ?? [];

  const minigrids = allGrids.filter((g: unknown) => {
    const grid = g as Record<string, unknown>;
    return (filterProgramme === "all" || grid.programme === filterProgramme) &&
           (filterStatus === "all" || grid.status === filterStatus);
  });

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/v1/admin/registry/minigrids/${id}`, { method: "DELETE" });
      toast({ title: "Mini-Grid deleted" });
      refetch();
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  }

  function statusColor(status: string) {
    switch (status) {
      case "OPERATIONAL": return "bg-green-600/20 text-green-400 border-green-600/40";
      case "CONSTRUCTION": return "bg-yellow-600/20 text-yellow-400 border-yellow-600/40";
      case "PLANNED": return "bg-blue-600/20 text-blue-400 border-blue-600/40";
      default: return "bg-muted text-muted-foreground border-border";
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest">Registry — Mini-Grids</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{minigrids.length} of {allGrids.length} mini-grids</p>
        </div>
        {canWrite() && (
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => { setEditItem(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" />
            Add Mini-Grid
          </Button>
        )}
      </div>

      <div className="flex gap-3">
        <Select value={filterProgramme} onValueChange={setFilterProgramme}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Programme" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programmes</SelectItem>
            {PROGRAMMES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {["OPERATIONAL", "CONSTRUCTION", "PLANNED", "DECOMMISSIONED"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-card border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-border">
              <tr>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">State</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Programme</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Capacity (kW)</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Beneficiaries</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                {canWrite() && <th className="p-3" />}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></td></tr>
              ) : minigrids.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No mini-grids match the selected filters</td></tr>
              ) : minigrids.map((g: unknown) => {
                const grid = g as Record<string, unknown>;
                return (
                  <tr key={grid.id as string} className="border-b border-border hover:bg-secondary/20">
                    <td className="p-3 font-medium text-foreground">{grid.name as string}</td>
                    <td className="p-3 text-muted-foreground">{grid.state as string}</td>
                    <td className="p-3 text-foreground">{grid.programme as string}</td>
                    <td className="p-3 text-foreground">{grid.capacityKw as number}</td>
                    <td className="p-3 text-foreground">{(grid.beneficiaryCount as number)?.toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${statusColor(grid.status as string)}`}>
                        {grid.status as string}
                      </span>
                    </td>
                    {canWrite() && (
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditItem(grid); setShowModal(true); }}><Pencil className="w-3 h-3" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border">
                              <AlertDialogHeader><AlertDialogTitle className="text-foreground">Delete Mini-Grid</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground">Soft-delete this mini-grid record?</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={() => handleDelete(grid.id as string)}>Delete</AlertDialogAction></AlertDialogFooter>
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
            <DialogTitle className="text-foreground uppercase tracking-widest text-sm font-bold">{editItem ? "Edit" : "Add"} Mini-Grid</DialogTitle>
          </DialogHeader>
          <MinigridForm item={editItem} onSuccess={() => { setShowModal(false); refetch(); }} onCancel={() => setShowModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MinigridForm({ item, onSuccess, onCancel }: { item: Record<string, unknown> | null; onSuccess: () => void; onCancel: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: (item?.name as string) ?? "", state: (item?.state as string) ?? "", programme: (item?.programme as string) ?? "", capacityKw: String(item?.capacityKw ?? "") });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = item ? `/api/v1/admin/registry/minigrids/${item.id}` : `/api/v1/admin/registry/minigrids`;
      const res = await fetch(url, { method: item ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, capacityKw: parseFloat(form.capacityKw) }) });
      if (!res.ok) throw new Error();
      toast({ title: item ? "Updated" : "Created" });
      onSuccess();
    } catch { toast({ title: "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-xs">
      <div className="space-y-1"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Name *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="h-7 text-xs bg-background border-border" /></div>
      <div className="space-y-1"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">State</Label><Input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className="h-7 text-xs bg-background border-border" /></div>
      <div className="space-y-1"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Programme</Label>
        <Select value={form.programme} onValueChange={(v) => setForm((f) => ({ ...f, programme: v }))}>
          <SelectTrigger className="h-7 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
          <SelectContent>{PROGRAMMES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Capacity (kW)</Label><Input type="number" value={form.capacityKw} onChange={(e) => setForm((f) => ({ ...f, capacityKw: e.target.value }))} className="h-7 text-xs bg-background border-border" /></div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90" disabled={saving}>{saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}{item ? "Save" : "Create"}</Button>
      </div>
    </form>
  );
}
