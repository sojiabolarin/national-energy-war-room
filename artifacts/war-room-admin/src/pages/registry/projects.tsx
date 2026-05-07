import { useState } from "react";
import { useGetCapitalProjects } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";

export default function ProjectsPage() {
  const { canWrite } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [view, setView] = useState<"card" | "table">("card");
  const { toast } = useToast();

  const { data, isLoading, refetch } = useGetCapitalProjects();
  const projects = (data as unknown as { data?: unknown[] })?.data ?? [];

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/v1/admin/registry/projects/${id}`, { method: "DELETE" });
      toast({ title: "Project deleted" });
      refetch();
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  }

  async function handlePctChange(id: string, pct: number) {
    try {
      await fetch(`/api/v1/admin/registry/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completionPct: pct }),
      });
    } catch { /* silent */ }
  }

  function statusColor(status: string) {
    switch (status) {
      case "COMPLETED": return "bg-green-600/20 text-green-400 border-green-600/40";
      case "ACTIVE": return "bg-blue-600/20 text-blue-400 border-blue-600/40";
      case "ON_HOLD": return "bg-yellow-600/20 text-yellow-400 border-yellow-600/40";
      case "CANCELLED": return "bg-destructive/20 text-destructive border-destructive/40";
      default: return "bg-muted text-muted-foreground border-border";
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest">Registry — Capital Projects</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{projects.length} projects</p>
        </div>
        <div className="flex gap-2">
          <div className="flex border border-border rounded overflow-hidden">
            {(["card", "table"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {v}
              </button>
            ))}
          </div>
          {canWrite() && (
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => { setEditItem(null); setShowModal(true); }}>
              <Plus className="w-4 h-4" />
              Add Project
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : view === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p: unknown) => {
            const proj = p as Record<string, unknown>;
            return (
              <Card key={proj.id as string} className="bg-card border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-foreground leading-tight">{proj.name as string}</h3>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${statusColor(proj.status as string)}`}>
                      {proj.status as string}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-bold text-foreground">{proj.completionPct as number}%</span>
                    </div>
                    {canWrite() ? (
                      <Slider
                        value={[proj.completionPct as number]}
                        onValueChange={([v]) => handlePctChange(proj.id as string, v)}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    ) : (
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-2 bg-primary rounded-full" style={{ width: `${proj.completionPct as number}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Budget</p>
                      <p className="font-bold text-foreground">₦{((proj.budgetNgn as number) / 1e9).toFixed(1)}B</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-bold text-foreground">{proj.type as string}</p>
                    </div>
                  </div>
                  {canWrite() && (
                    <div className="flex gap-1 pt-1 border-t border-border">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs flex-1 justify-start gap-1" onClick={() => { setEditItem(proj); setShowModal(true); }}>
                        <Pencil className="w-3 h-3" /> Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader><AlertDialogTitle className="text-foreground">Delete Project</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground">Soft-delete this capital project?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={() => handleDelete(proj.id as string)}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-card border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-border">
                <tr>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Completion %</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Budget (₦B)</th>
                  {canWrite() && <th className="p-3" />}
                </tr>
              </thead>
              <tbody>
                {projects.map((p: unknown) => {
                  const proj = p as Record<string, unknown>;
                  return (
                    <tr key={proj.id as string} className="border-b border-border hover:bg-secondary/20">
                      <td className="p-3 font-medium text-foreground">{proj.name as string}</td>
                      <td className="p-3 text-muted-foreground">{proj.type as string}</td>
                      <td className="p-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${statusColor(proj.status as string)}`}>{proj.status as string}</span></td>
                      <td className="p-3 text-foreground">{proj.completionPct as number}%</td>
                      <td className="p-3 text-foreground">{((proj.budgetNgn as number) / 1e9).toFixed(1)}</td>
                      {canWrite() && (
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditItem(proj); setShowModal(true); }}><Pencil className="w-3 h-3" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"><Trash2 className="w-3 h-3" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-card border-border">
                                <AlertDialogHeader><AlertDialogTitle className="text-foreground">Delete Project</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground">Soft-delete this capital project?</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={() => handleDelete(proj.id as string)}>Delete</AlertDialogAction></AlertDialogFooter>
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
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground uppercase tracking-widest text-sm font-bold">
              {editItem ? "Edit Project" : "Add Project"}
            </DialogTitle>
          </DialogHeader>
          <ProjectForm item={editItem} onSuccess={() => { setShowModal(false); refetch(); }} onCancel={() => setShowModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectForm({ item, onSuccess, onCancel }: { item: Record<string, unknown> | null; onSuccess: () => void; onCancel: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: (item?.name as string) ?? "", type: (item?.type as string) ?? "", budgetNgn: String(item?.budgetNgn ?? ""), completionPct: String(item?.completionPct ?? "0") });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = item ? `/api/v1/admin/registry/projects/${item.id}` : `/api/v1/admin/registry/projects`;
      const res = await fetch(url, { method: item ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, budgetNgn: parseFloat(form.budgetNgn), completionPct: parseFloat(form.completionPct) }) });
      if (!res.ok) throw new Error();
      toast({ title: item ? "Updated" : "Created" });
      onSuccess();
    } catch { toast({ title: "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-xs">
      <div className="space-y-1"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Name *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="h-7 text-xs bg-background border-border" /></div>
      <div className="space-y-1"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Type</Label><Input value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="h-7 text-xs bg-background border-border" /></div>
      <div className="space-y-1"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Budget (₦)</Label><Input type="number" value={form.budgetNgn} onChange={(e) => setForm((f) => ({ ...f, budgetNgn: e.target.value }))} className="h-7 text-xs bg-background border-border" /></div>
      <div className="space-y-1"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Completion %</Label><Input type="number" min={0} max={100} value={form.completionPct} onChange={(e) => setForm((f) => ({ ...f, completionPct: e.target.value }))} className="h-7 text-xs bg-background border-border" /></div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90" disabled={saving}>{saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}{item ? "Save" : "Create"}</Button>
      </div>
    </form>
  );
}
