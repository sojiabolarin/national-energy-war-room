import { useState, useRef, useCallback } from "react";
import { useGetPlants, useGetPlantUnits } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PlantUnit {
  id: string;
  unitName: string;
  capacityMw: number;
  status: string;
  fuelStatus?: string;
}

const UNIT_STATUS_OPTIONS = ["OPERATIONAL", "DECOMMISSIONED", "UNDER_MAINTENANCE", "OFFLINE"];

function PlantUnitsRow({
  plantId,
  canEdit,
  accessToken,
}: {
  plantId: string;
  canEdit: boolean;
  accessToken: string | null;
}) {
  const { data, isLoading, refetch } = useGetPlantUnits(plantId);
  const units = (data as unknown as { data?: PlantUnit[] })?.data ?? [];
  const { toast } = useToast();
  const [editUnit, setEditUnit] = useState<PlantUnit | null>(null);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [createMode, setCreateMode] = useState(false);

  function authHeaders(json = false): Record<string, string> {
    const h: Record<string, string> = {};
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    if (json) h["Content-Type"] = "application/json";
    return h;
  }

  async function handleDeleteUnit(unitId: string) {
    try {
      const res = await fetch(
        `/api/v1/admin/registry/plant-units/${unitId}`,
        { method: "DELETE", headers: authHeaders() },
      );
      if (!res.ok) throw new Error();
      toast({ title: "Unit deleted" });
      void refetch();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  }

  return (
    <tr>
      <td colSpan={9} className="bg-secondary/20 p-0">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-8 py-2 text-left text-muted-foreground uppercase tracking-wider font-bold">Unit</th>
                <th className="px-4 py-2 text-left text-muted-foreground uppercase tracking-wider font-bold">Capacity MW</th>
                <th className="px-4 py-2 text-left text-muted-foreground uppercase tracking-wider font-bold">Fuel Type</th>
                <th className="px-4 py-2 text-left text-muted-foreground uppercase tracking-wider font-bold">Status</th>
                {canEdit && <th className="px-4 py-2 text-left text-muted-foreground uppercase tracking-wider font-bold">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {units.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 5 : 4} className="px-8 py-3 text-muted-foreground">No units</td>
                </tr>
              ) : (
                units.map((unit) => (
                  <tr key={unit.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                    <td className="px-8 py-2 text-foreground font-medium">{unit.unitName}</td>
                    <td className="px-4 py-2 text-foreground">{unit.capacityMw}</td>
                    <td className="px-4 py-2 text-muted-foreground">{unit.fuelStatus ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${unit.status === "OPERATIONAL" ? "bg-green-600/20 text-green-400 border-green-600/40" : "bg-muted text-muted-foreground border-border"}`}>
                        {unit.status}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost" size="sm" className="h-6 w-6 p-0"
                            onClick={() => { setEditUnit(unit); setCreateMode(false); setShowUnitModal(true); }}
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
                                <AlertDialogTitle className="text-foreground">Delete Unit</AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground">
                                  Delete unit "{unit.unitName}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive" onClick={() => void handleDeleteUnit(unit.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
              {canEdit && (
                <tr>
                  <td colSpan={5} className="px-8 py-2">
                    <Button
                      size="sm" variant="ghost" className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => { setEditUnit(null); setCreateMode(true); setShowUnitModal(true); }}
                    >
                      <Plus className="w-3 h-3" /> Add unit
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        <Dialog open={showUnitModal} onOpenChange={setShowUnitModal}>
          <DialogContent className="bg-card border-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-foreground uppercase tracking-widest text-sm font-bold">
                {createMode ? "Add Unit" : "Edit Unit"}
              </DialogTitle>
            </DialogHeader>
            <UnitForm
              plantId={plantId}
              unit={editUnit}
              accessToken={accessToken}
              onSuccess={() => {
                setShowUnitModal(false);
                void refetch();
              }}
              onCancel={() => setShowUnitModal(false)}
            />
          </DialogContent>
        </Dialog>
      </td>
    </tr>
  );
}

function UnitForm({
  plantId,
  unit,
  accessToken,
  onSuccess,
  onCancel,
}: {
  plantId: string;
  unit: PlantUnit | null;
  accessToken: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    unitName: unit?.unitName ?? "",
    capacityMw: String(unit?.capacityMw ?? ""),
    fuelStatus: unit?.fuelStatus ?? "",
    status: unit?.status ?? "OPERATIONAL",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const url = unit
        ? `/api/v1/admin/registry/plant-units/${unit.id}`
        : `/api/v1/admin/registry/plant-units`;
      const res = await fetch(url, {
        method: unit ? "PATCH" : "POST",
        headers,
        body: JSON.stringify({ ...form, capacityMw: parseFloat(form.capacityMw), plantId }),
      });
      if (!res.ok) throw new Error();
      toast({ title: unit ? "Unit updated" : "Unit created" });
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
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Unit Name *</Label>
        <Input value={form.unitName} onChange={(e) => setForm((f) => ({ ...f, unitName: e.target.value }))} required className="h-7 text-xs bg-background border-border" />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Capacity MW</Label>
        <Input type="number" value={form.capacityMw} onChange={(e) => setForm((f) => ({ ...f, capacityMw: e.target.value }))} className="h-7 text-xs bg-background border-border" />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fuel Status</Label>
        <Input value={form.fuelStatus} onChange={(e) => setForm((f) => ({ ...f, fuelStatus: e.target.value }))} placeholder="GAS_AVAILABLE, GAS_CONSTRAINED…" className="h-7 text-xs bg-background border-border" />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</Label>
        <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
          <SelectTrigger className="h-7 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            {UNIT_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90" disabled={saving}>
          {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
          {unit ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  );
}

export default function PlantsPage() {
  const { canWrite, accessToken } = useAuth();
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Record<string, unknown> | null>(null);
  const [utilEdits, setUtilEdits] = useState<Record<string, string>>({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const { toast } = useToast();

  const { data, isLoading, refetch } = useGetPlants({ page, pageSize: 20 });
  const plants = (data as unknown as { data?: unknown[] })?.data ?? [];
  const pagination = (data as unknown as { pagination?: { page: number; totalPages: number } })?.pagination;

  function authHeaders(json = false): Record<string, string> {
    const h: Record<string, string> = {};
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    if (json) h["Content-Type"] = "application/json";
    return h;
  }

  const handleUtilChange = useCallback((plantId: string, value: string) => {
    setUtilEdits((prev) => ({ ...prev, [plantId]: value }));
    clearTimeout(debounceTimers.current[plantId]);
    debounceTimers.current[plantId] = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/admin/registry/plants/${plantId}`, {
          method: "PATCH",
          headers: authHeaders(true),
          body: JSON.stringify({ paf: parseFloat(value) }),
        });
        if (!res.ok) throw new Error();
        toast({ title: "Utilisation saved" });
      } catch {
        toast({ title: "Save failed", variant: "destructive" });
      }
    }, 800);
  }, [toast, accessToken]);

  async function handleDelete(plantId: string) {
    try {
      const res = await fetch(`/api/v1/admin/registry/plants/${plantId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Plant deleted" });
      void refetch();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest">Registry — Plants</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Generation plant registry · expand row to manage units</p>
        </div>
        {canWrite() && (
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => { setEditingPlant(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" />
            Add Plant
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
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Installed MW</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Available MW</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Utilisation %</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                {canWrite() && <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></td></tr>
              ) : plants.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No plants found</td></tr>
              ) : plants.map((p: unknown) => {
                const plant = p as Record<string, unknown>;
                const pid = plant.id as string;
                const isExpanded = expandedId === pid;
                const utilVal = utilEdits[pid] ?? String(plant.paf ?? "");
                return (
                  <>
                    <tr key={pid} className="border-b border-border hover:bg-secondary/20 transition-colors">
                      <td className="p-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : pid)}
                          className="text-muted-foreground hover:text-foreground"
                          title={isExpanded ? "Collapse units" : "Expand units"}
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="p-3 font-medium text-foreground">{plant.name as string}</td>
                      <td className="p-3 text-muted-foreground">{plant.type as string}</td>
                      <td className="p-3 text-foreground">{plant.installedMw as number}</td>
                      <td className="p-3 text-foreground">{plant.availableMw as number}</td>
                      <td className="p-3">
                        {canWrite() ? (
                          <Input
                            type="number"
                            value={utilVal}
                            onChange={(e) => handleUtilChange(pid, e.target.value)}
                            className="h-6 w-20 text-xs bg-background border-border"
                            min={0} max={100} step={0.1}
                          />
                        ) : (
                          <span className="text-foreground">{plant.paf as number}%</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${plant.status === "OPERATIONAL" ? "bg-green-600/20 text-green-400 border-green-600/40" : "bg-muted text-muted-foreground border-border"}`}>
                          {plant.status as string}
                        </span>
                      </td>
                      {canWrite() && (
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditingPlant(plant); setShowModal(true); }}>
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
                                  <AlertDialogTitle className="text-foreground">Delete Plant</AlertDialogTitle>
                                  <AlertDialogDescription className="text-muted-foreground">
                                    This will soft-delete the plant and all its units. This action is reversible by an administrator.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction className="bg-destructive" onClick={() => void handleDelete(pid)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      )}
                    </tr>
                    {isExpanded && (
                      <PlantUnitsRow plantId={pid} canEdit={canWrite()} accessToken={accessToken} />
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <span className="text-xs text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-7 w-7 p-0">
                <ChevronRight className="w-4 h-4 rotate-180" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="h-7 w-7 p-0">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground uppercase tracking-widest text-sm font-bold">
              {editingPlant ? "Edit Plant" : "Add Plant"}
            </DialogTitle>
          </DialogHeader>
          <PlantForm
            plant={editingPlant}
            accessToken={accessToken}
            onSuccess={() => { setShowModal(false); void refetch(); }}
            onCancel={() => setShowModal(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlantForm({
  plant,
  accessToken,
  onSuccess,
  onCancel,
}: {
  plant: Record<string, unknown> | null;
  accessToken: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: (plant?.name as string) ?? "",
    type: (plant?.type as string) ?? "",
    installedMw: String(plant?.installedMw ?? ""),
    availableMw: String(plant?.availableMw ?? ""),
    state: (plant?.state as string) ?? "",
    operator: (plant?.operator as string) ?? "",
    status: (plant?.status as string) ?? "OPERATIONAL",
  });
  const [saving, setSaving] = useState(false);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const url = plant ? `/api/v1/admin/registry/plants/${plant.id}` : `/api/v1/admin/registry/plants`;
      const res = await fetch(url, {
        method: plant ? "PATCH" : "POST",
        headers,
        body: JSON.stringify({
          ...form,
          installedMw: parseFloat(form.installedMw),
          availableMw: parseFloat(form.availableMw),
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: plant ? "Plant updated" : "Plant created" });
      onSuccess();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Name *</Label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} required className="h-7 text-xs bg-background border-border" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Type</Label>
          <Input value={form.type} onChange={(e) => set("type", e.target.value)} className="h-7 text-xs bg-background border-border" placeholder="GAS, HYDRO, COAL…" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Installed MW</Label>
          <Input type="number" value={form.installedMw} onChange={(e) => set("installedMw", e.target.value)} className="h-7 text-xs bg-background border-border" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Available MW</Label>
          <Input type="number" value={form.availableMw} onChange={(e) => set("availableMw", e.target.value)} className="h-7 text-xs bg-background border-border" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">State</Label>
          <Input value={form.state} onChange={(e) => set("state", e.target.value)} className="h-7 text-xs bg-background border-border" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Operator</Label>
          <Input value={form.operator} onChange={(e) => set("operator", e.target.value)} className="h-7 text-xs bg-background border-border" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90" disabled={saving}>
          {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
          {plant ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  );
}
