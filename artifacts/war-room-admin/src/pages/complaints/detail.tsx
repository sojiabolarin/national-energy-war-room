import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useAdminGetComplaint,
  useUpdateComplaint,
  useEscalateComplaint,
  useResolveComplaint,
  useReopenComplaint,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  ArrowLeft,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Paperclip,
  CheckCircle2,
  RotateCcw,
  TrendingUp,
  UserCheck,
  MessageSquare,
  Send,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS = ["FILED", "IN_REVIEW", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED", "REJECTED"] as const;

interface ComplaintRecord {
  id?: string;
  ticketNumber?: string;
  status?: string;
  category?: string;
  severity?: string;
  discoId?: string;
  disco?: { id?: string; name?: string };
  escalationLevel?: number;
  slaBreached?: boolean;
  createdAt?: string;
  assignedToUserId?: string;
  assignments?: Array<{ assignedTo?: { id?: string; fullName?: string } }>;
  description?: string;
  citizenName?: string;
  citizenPhone?: string;
  citizenEmail?: string;
  location?: string;
  events?: ComplaintEvent[];
  attachments?: ComplaintAttachment[];
}

interface ComplaintEvent {
  eventType?: string;
  createdAt?: string;
  notes?: string;
  actor?: { fullName?: string };
}

interface ComplaintAttachment {
  url?: string;
  filename?: string;
  mimeType?: string;
}

function statusColor(status: string) {
  switch (status) {
    case "FILED": return "bg-blue-600/20 text-blue-400 border-blue-600/40";
    case "IN_REVIEW": return "bg-sky-600/20 text-sky-400 border-sky-600/40";
    case "IN_PROGRESS": return "bg-yellow-600/20 text-yellow-400 border-yellow-600/40";
    case "ESCALATED": return "bg-orange-600/20 text-orange-400 border-orange-600/40";
    case "RESOLVED": return "bg-green-600/20 text-green-400 border-green-600/40";
    case "CLOSED": return "bg-muted text-muted-foreground border-border";
    case "REJECTED": return "bg-destructive/20 text-destructive border-destructive/40";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canWrite, accessToken } = useAuth();
  const { toast } = useToast();

  const [resolutionText, setResolutionText] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [noteText, setNoteText] = useState("");
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);

  const { data, isLoading, refetch } = useAdminGetComplaint(id!);
  const updateMutation = useUpdateComplaint();
  const escalateMutation = useEscalateComplaint();
  const resolveMutation = useResolveComplaint();
  const reopenMutation = useReopenComplaint();

  interface ComplaintResponse { data?: ComplaintRecord }
  const rawComplaint = ((data as unknown) as ComplaintResponse | undefined)?.data ?? null;
  const complaint: ComplaintRecord | null = rawComplaint
    ? { ...rawComplaint, ...(optimisticStatus ? { status: optimisticStatus } : {}) }
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!complaint) {
    return <div className="p-6 text-center text-muted-foreground">Complaint not found.</div>;
  }

  const timeline = complaint.events ?? [];
  const notes = timeline.filter((e) => e.eventType === "NOTE_ADDED");
  const activityLog = timeline.filter((e) => e.eventType !== "NOTE_ADDED");
  const attachments = complaint.attachments ?? [];
  const currentStatus = complaint.status ?? "FILED";
  const escalationLevel = complaint.escalationLevel ?? 1;
  const isMinisterialEscalation = escalationLevel >= 4;
  const latestAssignee = complaint.assignments?.[0]?.assignedTo;

  function authHeaders(json = false): Record<string, string> {
    const h: Record<string, string> = {};
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    if (json) h["Content-Type"] = "application/json";
    return h;
  }

  function handleStatusChange(newStatus: string) {
    const previousStatus = currentStatus;
    setOptimisticStatus(newStatus);
    updateMutation.mutate(
      { id: id!, data: { status: newStatus } },
      {
        onSuccess: () => { toast({ title: "Status updated" }); void refetch(); setOptimisticStatus(null); },
        onError: () => { setOptimisticStatus(previousStatus); toast({ title: "Update failed", variant: "destructive" }); },
      },
    );
  }

  function handleEscalate() {
    const previousStatus = currentStatus;
    setOptimisticStatus("ESCALATED");
    escalateMutation.mutate(
      { id: id! },
      {
        onSuccess: () => { toast({ title: "Complaint escalated" }); void refetch(); setOptimisticStatus(null); },
        onError: () => { setOptimisticStatus(previousStatus); toast({ title: "Escalation failed", variant: "destructive" }); },
      },
    );
  }

  function handleResolve() {
    if (!resolutionText.trim()) { toast({ title: "Resolution text is required", variant: "destructive" }); return; }
    const previousStatus = currentStatus;
    setOptimisticStatus("RESOLVED");
    resolveMutation.mutate(
      { id: id!, data: { resolutionText: resolutionText.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Complaint resolved" });
          setResolutionText("");
          void refetch();
          setOptimisticStatus(null);
        },
        onError: (err) => {
          setOptimisticStatus(previousStatus);
          const message = err instanceof Error ? err.message : "Resolution failed";
          toast({ title: "Resolution failed", description: message, variant: "destructive" });
        },
      },
    );
  }

  function handleReopen() {
    const previousStatus = currentStatus;
    setOptimisticStatus("IN_REVIEW");
    reopenMutation.mutate(
      { id: id! },
      {
        onSuccess: () => { toast({ title: "Complaint reopened" }); void refetch(); setOptimisticStatus(null); },
        onError: () => { setOptimisticStatus(previousStatus); toast({ title: "Reopen failed", variant: "destructive" }); },
      },
    );
  }

  async function handleAssign() {
    if (!assigneeId.trim()) { toast({ title: "Enter a staff ID to assign", variant: "destructive" }); return; }
    setAssignLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/complaints/${id}/assign`, {
        method: "POST", headers: authHeaders(true), body: JSON.stringify({ assignedToUserId: assigneeId.trim() }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Complaint assigned" });
      setAssigneeId("");
      void refetch();
    } catch {
      toast({ title: "Assignment failed", variant: "destructive" });
    } finally {
      setAssignLoading(false);
    }
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setNoteLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/complaints/${id}/note`, {
        method: "POST", headers: authHeaders(true), body: JSON.stringify({ notes: noteText.trim() }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Note added" });
      setNoteText("");
      void refetch();
    } catch {
      toast({ title: "Failed to add note", variant: "destructive" });
    } finally {
      setNoteLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/complaints")} className="gap-2 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold uppercase tracking-widest text-foreground">Complaint Detail</h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">{complaint.ticketNumber ?? id}</p>
        </div>
        <span className={`px-3 py-1 rounded border text-xs font-bold uppercase tracking-wider ${statusColor(currentStatus)}`}>
          {currentStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Complaint Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider mb-1">Category</p>
                  <p className="font-bold text-foreground">{complaint.category ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider mb-1">Severity</p>
                  <p className="font-bold text-foreground">{complaint.severity ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider mb-1">DisCo</p>
                  <p className="font-bold text-foreground">{complaint.disco?.name ?? complaint.discoId ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider mb-1">Escalation Level</p>
                  <p className={`font-bold ${isMinisterialEscalation ? "text-destructive" : "text-foreground"}`}>
                    Level {escalationLevel}
                    {isMinisterialEscalation && <span className="ml-1 text-[10px] border border-destructive/50 px-1 py-0.5 rounded">MINISTERIAL</span>}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider mb-1">SLA Status</p>
                  <p className={`font-bold ${complaint.slaBreached ? "text-destructive" : "text-green-400"}`}>
                    {complaint.slaBreached ? "BREACHED" : "WITHIN SLA"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider mb-1">Filed At</p>
                  <p className="font-bold text-foreground">{formatDate(complaint.createdAt ?? "")}</p>
                </div>
                {latestAssignee && (
                  <div>
                    <p className="text-muted-foreground uppercase tracking-wider mb-1">Assigned To</p>
                    <p className="font-bold text-foreground">{latestAssignee.fullName ?? latestAssignee.id ?? "—"}</p>
                  </div>
                )}
              </div>
              {complaint.description && (
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider text-xs mb-1">Description</p>
                  <p className="text-sm text-foreground leading-relaxed">{complaint.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Internal Notes Thread */}
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Internal Notes ({notes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {notes.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No internal notes yet</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {notes.map((note, i) => (
                    <div key={i} className="p-3 rounded bg-secondary/40 border border-border space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-foreground">{note.actor?.fullName ?? "Staff"}</span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(note.createdAt ?? "")}</span>
                      </div>
                      <p className="text-xs text-foreground">{note.notes}</p>
                    </div>
                  ))}
                </div>
              )}
              {canWrite("complaints") && (
                <div className="flex gap-2 pt-1">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add internal note (visible to staff only)…"
                    className="text-xs min-h-[60px] bg-background border-border resize-none flex-1"
                    onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); void handleAddNote(); } }}
                  />
                  <Button
                    size="sm"
                    className="gap-1 bg-primary hover:bg-primary/90 self-end"
                    onClick={() => void handleAddNote()}
                    disabled={noteLoading || !noteText.trim()}
                  >
                    {noteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {activityLog.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No events recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {activityLog.map((event, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        {i < activityLog.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground uppercase tracking-wider">{event.eventType}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDate(event.createdAt ?? "")}</span>
                        </div>
                        {event.notes && <p className="text-xs text-muted-foreground mt-0.5">{event.notes}</p>}
                        {event.actor?.fullName && <p className="text-[10px] text-muted-foreground mt-0.5">by {event.actor.fullName}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {attachments.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-primary" />
                  Attachments
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {attachments.map((att, i) => (
                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded bg-secondary/40 border border-border text-xs hover:bg-secondary/60 transition-colors">
                      <Paperclip className="w-3 h-3 text-muted-foreground" />
                      <span className="flex-1 text-foreground truncate">{att.filename}</span>
                      <span className="text-muted-foreground shrink-0">{att.mimeType}</span>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Citizen Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {complaint.citizenName && (
                <div className="flex items-center gap-2 text-xs">
                  <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-foreground">{complaint.citizenName}</span>
                </div>
              )}
              {complaint.citizenPhone && (
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-foreground">{complaint.citizenPhone}</span>
                </div>
              )}
              {complaint.citizenEmail && (
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-foreground">{complaint.citizenEmail}</span>
                </div>
              )}
              {complaint.location && (
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-foreground">{complaint.location}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {canWrite("complaints") && (
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider">Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Change Status</p>
                  <Select value={currentStatus} onValueChange={handleStatusChange} disabled={updateMutation.isPending}>
                    <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {updateMutation.isPending && (
                    <p className="text-[10px] text-primary flex items-center gap-1">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> Saving…
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Assign to Staff</p>
                  <div className="flex gap-2">
                    <Input
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      placeholder="Staff user ID…"
                      className="h-7 text-xs bg-background border-border flex-1"
                    />
                    <Button size="sm" variant="outline" className="h-7 text-xs shrink-0 gap-1"
                      onClick={() => void handleAssign()} disabled={assignLoading || !assigneeId.trim()}>
                      {assignLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                      Assign
                    </Button>
                  </div>
                </div>

                {currentStatus !== "ESCALATED" && currentStatus !== "RESOLVED" && currentStatus !== "CLOSED" && currentStatus !== "REJECTED" && (
                  isMinisterialEscalation ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" className="w-full gap-2 bg-orange-600 hover:bg-orange-700 text-white" disabled={escalateMutation.isPending}>
                          {escalateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
                          Escalate to Minister
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-foreground">Ministerial Escalation</AlertDialogTitle>
                          <AlertDialogDescription className="text-muted-foreground">
                            This complaint is at Level {escalationLevel}. Escalating will formally notify the Minister's office. This action is logged.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction className="bg-orange-600 hover:bg-orange-700" onClick={handleEscalate}>
                            Confirm Ministerial Escalation
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full gap-2 border-orange-600/40 text-orange-400 hover:bg-orange-600/10"
                      onClick={handleEscalate} disabled={escalateMutation.isPending}>
                      {escalateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
                      Escalate
                    </Button>
                  )
                )}

                {currentStatus !== "RESOLVED" && currentStatus !== "CLOSED" && currentStatus !== "REJECTED" && (
                  <div className="space-y-2">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Resolution Note <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      value={resolutionText}
                      onChange={(e) => setResolutionText(e.target.value)}
                      placeholder="Describe how this complaint was resolved (required)…"
                      className="text-xs min-h-[80px] bg-background border-border resize-none"
                    />
                    <Button size="sm" className="w-full gap-2 bg-green-700 hover:bg-green-600 text-white"
                      onClick={handleResolve} disabled={resolveMutation.isPending || !resolutionText.trim()}>
                      {resolveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Mark Resolved
                    </Button>
                  </div>
                )}

                {(currentStatus === "RESOLVED" || currentStatus === "CLOSED") && (
                  <Button size="sm" variant="outline" className="w-full gap-2" onClick={handleReopen} disabled={reopenMutation.isPending}>
                    {reopenMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    Reopen Complaint
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
