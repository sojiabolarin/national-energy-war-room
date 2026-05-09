import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Pencil, Trash2, Search, ShieldCheck, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { formatDateShort } from "@/lib/utils";

interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  organisationId?: string;
  organisationName?: string;
  lastLoginAt?: string;
  createdAt: string;
}

interface Organisation {
  id: string;
  name: string;
  type: string;
  website?: string;
  createdAt: string;
}

const ROLES = ["ADMIN", "MINISTRY_STAFF", "MINISTER", "NERC_VIEWER", "DISCO_AGENT", "CITIZEN"];

const ORG_TYPES = [
  "GENCO", "DISCO", "TCN", "NBET", "NERC",
  "NMDPRA", "NGIC", "REA", "FMP", "FGN_POWER_CO", "NDPHC", "OTHER",
] as const;

const ORG_TYPE_LABELS: Record<string, string> = {
  GENCO: "GenCo (Generation)",
  DISCO: "DisCo (Distribution)",
  TCN: "TCN (Transmission)",
  NBET: "NBET (Bulk Trading)",
  NERC: "NERC (Regulator)",
  NMDPRA: "NMDPRA (Midstream/Downstream)",
  NGIC: "NGIC (Gas Infrastructure)",
  REA: "REA (Rural Electrification)",
  FMP: "FMP (Federal Ministry of Power)",
  FGN_POWER_CO: "FGN Power Co.",
  NDPHC: "NDPHC (Niger Delta Power)",
  OTHER: "Other",
};

function roleBadge(role: string) {
  switch (role) {
    case "ADMIN": return "bg-primary/20 text-primary border-primary/40";
    case "MINISTRY_STAFF": return "bg-blue-600/20 text-blue-400 border-blue-600/40";
    case "MINISTER": return "bg-purple-600/20 text-purple-400 border-purple-600/40";
    case "NERC_VIEWER": return "bg-yellow-600/20 text-yellow-400 border-yellow-600/40";
    case "DISCO_AGENT": return "bg-green-600/20 text-green-400 border-green-600/40";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export default function UsersPage() {
  const { toast } = useToast();
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<"users" | "orgs">("users");
  const [showModal, setShowModal] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editOrg, setEditOrg] = useState<Organisation | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [users, setUsers] = useState<User[]>([]);
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [orgsLoading, setOrgsLoading] = useState(true);

  function authHeaders(): Record<string, string> {
    const h: Record<string, string> = {};
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    return h;
  }

  useEffect(() => {
    async function fetchUsers() {
      setUsersLoading(true);
      try {
        const res = await fetch("/api/v1/admin/users", { headers: authHeaders() });
        if (!res.ok) throw new Error();
        const json = await res.json() as { data?: User[] };
        setUsers(json.data ?? []);
      } catch {
        toast({ title: "Could not load users", variant: "destructive" });
      } finally {
        setUsersLoading(false);
      }
    }
    void fetchUsers();
  }, [accessToken]);

  useEffect(() => {
    async function fetchOrgs() {
      setOrgsLoading(true);
      try {
        const res = await fetch("/api/v1/admin/registry/organisations", { headers: authHeaders() });
        if (!res.ok) throw new Error();
        const json = await res.json() as { data?: Organisation[] };
        setOrgs(json.data ?? []);
      } catch {
        toast({ title: "Could not load organisations", variant: "destructive" });
      } finally {
        setOrgsLoading(false);
      }
    }
    void fetchOrgs();
  }, [accessToken]);

  const filteredUsers = users.filter((u) =>
    (roleFilter === "all" || u.role === roleFilter) &&
    (search === "" || u.email.toLowerCase().includes(search.toLowerCase()) || u.fullName.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleToggleActive(user: User) {
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (!res.ok) throw new Error();
      toast({ title: `User ${user.isActive ? "deactivated" : "activated"}` });
    } catch {
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isActive: user.isActive } : u));
      toast({ title: "Update failed", variant: "destructive" });
    }
  }

  async function handleDeleteUser(id: string) {
    try {
      const res = await fetch(`/api/v1/admin/users/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error();
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast({ title: "User deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  }

  async function handleDeleteOrg(id: string) {
    try {
      const res = await fetch(`/api/v1/admin/registry/organisations/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error();
      setOrgs((prev) => prev.filter((o) => o.id !== id));
      toast({ title: "Organisation deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Users & Organisations
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeTab === "users" ? `${filteredUsers.length} users` : `${orgs.length} organisations`}
          </p>
        </div>
        {activeTab === "users" ? (
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => { setEditUser(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" />Add User
          </Button>
        ) : (
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => { setEditOrg(null); setShowOrgModal(true); }}>
            <Plus className="w-4 h-4" />Add Organisation
          </Button>
        )}
      </div>

      <div className="flex gap-1 border-b border-border">
        {(["users", "orgs"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {tab === "users" ? <ShieldCheck className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
            {tab === "users" ? "Users" : "Organisations"}
          </button>
        ))}
      </div>

      {activeTab === "users" && (
        <>
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-8 h-8 text-xs bg-background border-border" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card className="bg-card border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border">
                  <tr>
                    <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Email</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Role</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Organisation</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Last Login</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Active</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr><td colSpan={7} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No users found</td></tr>
                  ) : filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-border hover:bg-secondary/20">
                      <td className="p-3 font-medium text-foreground">{user.fullName}</td>
                      <td className="p-3 font-mono text-muted-foreground">{user.email}</td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${roleBadge(user.role)}`}>{user.role}</span>
                      </td>
                      <td className="p-3 text-muted-foreground">{user.organisationName ?? "—"}</td>
                      <td className="p-3 text-muted-foreground">{formatDateShort(user.lastLoginAt) ?? "Never"}</td>
                      <td className="p-3">
                        <Switch checked={user.isActive} onCheckedChange={() => void handleToggleActive(user)} />
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditUser(user); setShowModal(true); }}>
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
                                <AlertDialogTitle className="text-foreground">Delete User</AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground">
                                  Permanently delete {user.fullName}? This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive" onClick={() => void handleDeleteUser(user.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {activeTab === "orgs" && (
        <Card className="bg-card border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-border">
                <tr>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Website</th>
                  <th className="p-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Created</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {orgsLoading ? (
                  <tr><td colSpan={5} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></td></tr>
                ) : orgs.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No organisations found</td></tr>
                ) : orgs.map((org) => (
                  <tr key={org.id} className="border-b border-border hover:bg-secondary/20">
                    <td className="p-3 font-medium text-foreground">{org.name}</td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-blue-600/20 text-blue-400 border-blue-600/40">
                        {ORG_TYPE_LABELS[org.type] ?? org.type}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground font-mono text-[10px]">{org.website ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{formatDateShort(org.createdAt) ?? "—"}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditOrg(org); setShowOrgModal(true); }}>
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
                              <AlertDialogTitle className="text-foreground">Delete Organisation</AlertDialogTitle>
                              <AlertDialogDescription className="text-muted-foreground">
                                Delete {org.name}? All associated users will lose their organisation link.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive" onClick={() => void handleDeleteOrg(org.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground uppercase tracking-widest text-sm font-bold">
              {editUser ? "Edit User" : "Add User"}
            </DialogTitle>
          </DialogHeader>
          <UserForm
            user={editUser}
            orgs={orgs}
            accessToken={accessToken}
            onSuccess={(updated) => {
              setUsers((prev) => editUser ? prev.map((u) => u.id === updated.id ? updated : u) : [...prev, updated]);
              setShowModal(false);
              toast({ title: editUser ? "User updated" : "User created" });
            }}
            onCancel={() => setShowModal(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showOrgModal} onOpenChange={setShowOrgModal}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground uppercase tracking-widest text-sm font-bold">
              {editOrg ? "Edit Organisation" : "Add Organisation"}
            </DialogTitle>
          </DialogHeader>
          <OrgForm
            org={editOrg}
            accessToken={accessToken}
            onSuccess={(updated) => {
              setOrgs((prev) => editOrg ? prev.map((o) => o.id === updated.id ? updated : o) : [...prev, updated]);
              setShowOrgModal(false);
              toast({ title: editOrg ? "Organisation updated" : "Organisation created" });
            }}
            onCancel={() => setShowOrgModal(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserForm({ user, orgs, accessToken, onSuccess, onCancel }: {
  user: User | null;
  orgs: Organisation[];
  accessToken: string | null;
  onSuccess: (u: User) => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    role: user?.role ?? "MINISTRY_STAFF",
    organisationId: user?.organisationId ?? "",
    password: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const url = user ? `/api/v1/admin/users/${user.id}` : `/api/v1/admin/users`;
      const body: Record<string, unknown> = { ...form };
      if (!form.password) delete body.password;
      if (!form.organisationId || form.organisationId === "none") delete body.organisationId;
      const res = await fetch(url, { method: user ? "PATCH" : "POST", headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      const json = await res.json() as { data?: User };
      onSuccess(json.data ?? ({ ...user, ...form } as User));
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-xs">
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Full Name *</Label>
        <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required className="h-7 text-xs bg-background border-border" />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Email *</Label>
        <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required className="h-7 text-xs bg-background border-border font-mono" />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Phone</Label>
        <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="h-7 text-xs bg-background border-border" />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Role</Label>
        <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
          <SelectTrigger className="h-7 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
          <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {orgs.length > 0 && (
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Organisation</Label>
          <Select value={form.organisationId} onValueChange={(v) => setForm((f) => ({ ...f, organisationId: v }))}>
            <SelectTrigger className="h-7 text-xs bg-background border-border"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{user ? "New Password (leave blank to keep)" : "Password *"}</Label>
        <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          required={!user} minLength={8} className="h-7 text-xs bg-background border-border font-mono" placeholder="min. 8 characters" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90" disabled={saving}>
          {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
          {user ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  );
}

function OrgForm({ org, accessToken, onSuccess, onCancel }: {
  org: Organisation | null;
  accessToken: string | null;
  onSuccess: (o: Organisation) => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: org?.name ?? "",
    type: org?.type ?? "DISCO",
    website: org?.website ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const url = org ? `/api/v1/admin/registry/organisations/${org.id}` : `/api/v1/admin/registry/organisations`;
      const res = await fetch(url, { method: org ? "PATCH" : "POST", headers, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      const json = await res.json() as { data?: Organisation };
      onSuccess(json.data ?? ({ ...org, ...form } as Organisation));
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-xs">
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Organisation Name *</Label>
        <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="h-7 text-xs bg-background border-border" />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Type</Label>
        <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
          <SelectTrigger className="h-7 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
          <SelectContent>{ORG_TYPES.map((t) => <SelectItem key={t} value={t}>{ORG_TYPE_LABELS[t] ?? t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Website</Label>
        <Input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://example.gov.ng" className="h-7 text-xs bg-background border-border" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90" disabled={saving}>
          {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
          {org ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  );
}
