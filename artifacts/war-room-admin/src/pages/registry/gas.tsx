import { useState } from "react";
import { useGetGasPipelines, useGetDiversionOpportunities } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function pipelineStatusColor(status: string) {
  switch (status) {
    case "OPERATIONAL": return "bg-green-600/20 text-green-400 border-green-600/40";
    case "DISRUPTED": return "bg-destructive/20 text-destructive border-destructive/40";
    case "MAINTENANCE": return "bg-yellow-600/20 text-yellow-400 border-yellow-600/40";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export default function GasPage() {
  const { canWrite } = useAuth();
  const [tab, setTab] = useState<"pipelines" | "diversions">("pipelines");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const { toast } = useToast();

  const { data: pipelinesData, isLoading: pipelinesLoading, refetch: refetchPipelines } = useGetGasPipelines();
  const { data: diversionsData, isLoading: diversionsLoading, refetch: refetchDiversions } = useGetDiversionOpportunities();

  const pipelines = (pipelinesData as unknown as { data?: unknown[] })?.data ?? [];
  const diversions = (diversionsData as unknown as { data?: unknown[] })?.data ?? [];

  async function handleDelete(type: string, id: string) {
    try {
      await fetch(`/api/v1/admin/registry/gas/${type}/${id}`, { method: "DELETE" });
      toast({ title: "Deleted" });
      if (type === "pipelines") refetchPipelines(); else refetchDiversions();
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest">Registry — Gas</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Gas pipelines and diversion opportunities</p>
        </div>
        {canWrite() && (
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => { setEditItem(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" />
            Add {tab === "pipelines" ? "Pipeline" : "Diversion"}
          </Button>
        )}
      </div>

      <div className="flex gap-1 border-b border-border">
        {(["pipelines", "diversions"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      <Card className="bg-card border-border">
        <div className="overflow-x-auto">
          {tab === "pipelines" ? (
            <table className="w-full text-xs">
              <thead className="border-b border-border">
                <tr>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Pipeline</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Operator</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Capacity (MMscfd)</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Current Flow</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                  {canWrite() && <th className="p-3" />}
                </tr>
              </thead>
              <tbody>
                {pipelinesLoading ? (
                  <tr><td colSpan={6} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></td></tr>
                ) : pipelines.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No pipelines</td></tr>
                ) : pipelines.map((p: unknown) => {
                  const pipe = p as Record<string, unknown>;
                  return (
                    <tr key={pipe.id as string} className="border-b border-border hover:bg-secondary/20">
                      <td className="p-3 font-medium text-foreground">{pipe.name as string}</td>
                      <td className="p-3 text-muted-foreground">{pipe.operator as string}</td>
                      <td className="p-3 text-foreground">{pipe.capacityMmscfd as number}</td>
                      <td className="p-3 text-foreground">{pipe.currentFlowMmscfd as number}</td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${pipelineStatusColor(pipe.status as string)}`}>
                          {pipe.status as string}
                        </span>
                      </td>
                      {canWrite() && (
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditItem(pipe); setShowModal(true); }}><Pencil className="w-3 h-3" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-card border-border">
                                <AlertDialogHeader><AlertDialogTitle className="text-foreground">Delete Pipeline</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground">Soft-delete this pipeline record?</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={() => handleDelete("pipelines", pipe.id as string)}>Delete</AlertDialogAction></AlertDialogFooter>
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
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Opportunity</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Pipeline</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Volume (MMscfd)</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                  {canWrite() && <th className="p-3" />}
                </tr>
              </thead>
              <tbody>
                {diversionsLoading ? (
                  <tr><td colSpan={5} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></td></tr>
                ) : diversions.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No diversions</td></tr>
                ) : diversions.map((d: unknown) => {
                  const div = d as Record<string, unknown>;
                  return (
                    <tr key={div.id as string} className="border-b border-border hover:bg-secondary/20">
                      <td className="p-3 font-medium text-foreground">{div.name as string}</td>
                      <td className="p-3 text-muted-foreground">{div.pipelineName as string}</td>
                      <td className="p-3 text-foreground">{div.volumeMmscfd as number}</td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-blue-600/20 text-blue-400 border-blue-600/40">
                          {div.status as string}
                        </span>
                      </td>
                      {canWrite() && (
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Pencil className="w-3 h-3" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-card border-border">
                                <AlertDialogHeader><AlertDialogTitle className="text-foreground">Delete Diversion</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground">Delete this diversion opportunity?</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={() => handleDelete("diversions", div.id as string)}>Delete</AlertDialogAction></AlertDialogFooter>
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
              {editItem ? "Edit" : "Add"} {tab === "pipelines" ? "Pipeline" : "Diversion"}
            </DialogTitle>
          </DialogHeader>
          <SimpleForm
            fields={tab === "pipelines"
              ? [{ key: "name", label: "Name", required: true }, { key: "operator", label: "Operator" }, { key: "capacityMmscfd", label: "Capacity (MMscfd)", type: "number" }, { key: "currentFlowMmscfd", label: "Current Flow (MMscfd)", type: "number" }]
              : [{ key: "name", label: "Name", required: true }, { key: "volumeMmscfd", label: "Volume (MMscfd)", type: "number" }]
            }
            item={editItem}
            endpoint={`/api/v1/admin/registry/gas/${tab}`}
            onSuccess={() => { setShowModal(false); if (tab === "pipelines") refetchPipelines(); else refetchDiversions(); }}
            onCancel={() => setShowModal(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SimpleForm({ fields, item, endpoint, onSuccess, onCancel }: {
  fields: Array<{ key: string; label: string; type?: string; required?: boolean }>;
  item: Record<string, unknown> | null;
  endpoint: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.key, String(item?.[f.key] ?? "")])));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = item ? `${endpoint}/${item.id}` : endpoint;
      const body: Record<string, unknown> = {};
      fields.forEach((f) => { body[f.key] = f.type === "number" ? parseFloat(form[f.key]) : form[f.key]; });
      const res = await fetch(url, { method: item ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast({ title: item ? "Updated" : "Created" });
      onSuccess();
    } catch { toast({ title: "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-xs">
      {fields.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}{f.required ? " *" : ""}</Label>
          <Input type={f.type ?? "text"} value={form[f.key]} onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))} required={f.required} className="h-7 text-xs bg-background border-border" />
        </div>
      ))}
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
