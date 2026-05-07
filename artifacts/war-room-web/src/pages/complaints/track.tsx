import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTrackComplaint } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search, Loader2, CheckCircle2, Clock, AlertCircle,
  ChevronDown, ChevronRight, ChevronLeft, XCircle,
} from "lucide-react";

interface ComplaintEvent {
  id: string;
  eventType: string;
  notes?: string | null;
  createdAt: string;
}

interface ComplaintRecord {
  ticketNumber?: string;
  status?: string;
  category?: string;
  subCategory?: string;
  description?: string;
  severity?: string;
  escalationLevel?: number;
  slaBreached?: boolean;
  resolvedAt?: string;
  resolutionText?: string;
  location?: string;
  createdAt?: string;
  disco?: { name?: string };
  feeder?: { name?: string; code?: string };
  events?: ComplaintEvent[];
}

const EVENT_LABELS: Record<string, string> = {
  CREATED:           "Complaint Filed",
  ASSIGNED:          "Assigned to Staff",
  STATUS_CHANGED:    "Status Updated",
  NOTE_ADDED:        "Note Added",
  ESCALATED:         "Escalated",
  RESOLVED:          "Resolved",
  CITIZEN_RESPONDED: "Citizen Responded",
  SATISFACTION:      "Feedback Received",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  FILED:       { label: "Filed",       color: "text-muted-foreground",  icon: <Clock className="w-4 h-4" /> },
  ASSIGNED:    { label: "Assigned",    color: "text-blue-400",          icon: <Clock className="w-4 h-4" /> },
  IN_PROGRESS: { label: "In Progress", color: "text-yellow-400",        icon: <Clock className="w-4 h-4" /> },
  ESCALATED:   { label: "Escalated",   color: "text-orange-400",        icon: <AlertCircle className="w-4 h-4" /> },
  RESOLVED:    { label: "Resolved",    color: "text-primary",           icon: <CheckCircle2 className="w-4 h-4" /> },
  CLOSED:      { label: "Closed",      color: "text-muted-foreground",  icon: <CheckCircle2 className="w-4 h-4" /> },
  REJECTED:    { label: "Rejected",    color: "text-destructive",       icon: <XCircle className="w-4 h-4" /> },
};

const CATEGORY_LABELS: Record<string, string> = {
  SUPPLY_INTERRUPTION:  "Power Outage",
  BILLING:              "Billing Issue",
  METERING:             "Metering Issue",
  ESTIMATED_BILLING:    "Estimated Billing",
  VOLTAGE:              "Voltage Problem",
  ELECTROCUTION:        "Safety / Electrocution",
  INFRASTRUCTURE_DAMAGE:"Infrastructure Damage",
  CONNECTION_DELAY:     "Connection Delay",
  DISCONNECTION:        "Wrongful Disconnection",
  REFUND:               "Refund Request",
  ENERGY_THEFT_REPORT:  "Energy Theft Report",
  OTHER:                "Other",
};

function eventLabel(type: string): string {
  return EVENT_LABELS[type] ?? type.replace(/_/g, " ");
}

export default function TrackComplaint() {
  const [searchParams] = useSearchParams();
  const [ticket, setTicket] = useState(searchParams.get("ticket") ?? "");
  const [phone4, setPhone4] = useState(searchParams.get("phone") ?? "");
  const [queryKey, setQueryKey] = useState<{ ticket: string; phone: string } | null>(
    searchParams.get("ticket") && searchParams.get("phone")
      ? { ticket: searchParams.get("ticket")!, phone: searchParams.get("phone")! }
      : null
  );
  const [showTimeline, setShowTimeline] = useState(true);

  const { data: complaintData, isLoading, isError } = useTrackComplaint(
    queryKey?.ticket ?? "",
    { phoneLast4: queryKey?.phone ?? "" },
    { query: { queryKey: ["trackComplaint", queryKey?.ticket, queryKey?.phone], enabled: !!queryKey } }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTicket = ticket.trim().toUpperCase();
    if (trimmedTicket && phone4.length === 4) {
      setQueryKey({ ticket: trimmedTicket, phone: phone4 });
    }
  };

  const complaint = (complaintData as unknown as { data?: ComplaintRecord })?.data;
  const events: ComplaintEvent[] = complaint?.events ?? [];
  const statusCfg = STATUS_CONFIG[String(complaint?.status ?? "")] ?? STATUS_CONFIG["FILED"];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link to="/complaints" className="text-primary-foreground/80 hover:text-primary-foreground">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 flex-1 justify-center">
            <span className="inline-flex items-center justify-center bg-white rounded-full p-0.5 shrink-0">
              <img src="/ministry-logo.png" alt="WestMetro" className="h-7 w-7 rounded-full object-cover" />
            </span>
            <div>
              <div className="text-sm font-black uppercase tracking-widest leading-none">WestMetro</div>
              <div className="text-[10px] opacity-85 uppercase tracking-wider">Track Complaint</div>
            </div>
          </div>
          <div className="w-5" />
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 mt-4">
        {/* Search form */}
        <Card className="bg-card border-border mb-6">
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                  Ticket Number
                </label>
                <Input
                  placeholder="e.g. WR-20260507-000001"
                  value={ticket}
                  onChange={(e) => setTicket(e.target.value)}
                  className="bg-background font-mono uppercase"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                  Last 4 Digits of Phone Number
                </label>
                <Input
                  placeholder="e.g. 5678"
                  value={phone4}
                  onChange={(e) => setPhone4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  maxLength={4}
                  className="bg-background font-mono tracking-widest"
                  inputMode="numeric"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-primary font-bold py-5 uppercase tracking-wider" disabled={isLoading}>
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Searching…</>
                  : <><Search className="w-4 h-4 mr-2" /> Find My Complaint</>
                }
              </Button>
            </form>
          </CardContent>
        </Card>

        {isError && (
          <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Not Found</h4>
              <p className="text-sm mt-0.5">
                No complaint found matching that ticket number and phone combination. Please check your details and try again.
              </p>
            </div>
          </div>
        )}

        {complaint && !isLoading && !isError && (
          <div className="space-y-4">
            {/* Status card */}
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4 border-b border-border pb-4">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Status</div>
                    <div className={`text-lg font-black flex items-center gap-1.5 ${statusCfg.color}`}>
                      {statusCfg.icon}
                      {statusCfg.label}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Ticket</div>
                    <div className="font-mono font-bold text-xs">{String(complaint.ticketNumber ?? ticket)}</div>
                  </div>
                </div>

                <div className="space-y-2.5 text-sm">
                  {complaint.disco?.name && (
                    <div className="flex justify-between items-baseline gap-4">
                      <span className="text-muted-foreground shrink-0">DisCo</span>
                      <span className="font-bold text-right">{complaint.disco.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline gap-4">
                    <span className="text-muted-foreground shrink-0">Category</span>
                    <span className="font-bold text-right">
                      {CATEGORY_LABELS[String(complaint.category ?? "")] ?? String(complaint.category ?? "Unknown")}
                    </span>
                  </div>
                  {complaint.severity && (
                    <div className="flex justify-between items-baseline gap-4">
                      <span className="text-muted-foreground shrink-0">Severity</span>
                      <span className={`font-bold ${complaint.severity === "CRITICAL" ? "text-destructive" : ""}`}>
                        {complaint.severity}
                      </span>
                    </div>
                  )}
                  {complaint.slaBreached && (
                    <div className="flex justify-between items-baseline gap-4">
                      <span className="text-muted-foreground shrink-0">SLA Status</span>
                      <span className="font-bold text-destructive">BREACHED — escalated to NERC</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline gap-4">
                    <span className="text-muted-foreground shrink-0">Filed On</span>
                    <span className="font-mono text-xs">
                      {complaint.createdAt
                        ? new Date(String(complaint.createdAt)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                        : "Unknown"}
                    </span>
                  </div>
                  {complaint.resolvedAt && (
                    <div className="flex justify-between items-baseline gap-4">
                      <span className="text-muted-foreground shrink-0">Resolved</span>
                      <span className="font-mono text-xs">
                        {new Date(String(complaint.resolvedAt)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  )}
                  {complaint.location && (
                    <div className="flex justify-between items-baseline gap-4">
                      <span className="text-muted-foreground shrink-0">Location</span>
                      <span className="font-bold text-right text-xs">{complaint.location}</span>
                    </div>
                  )}
                  {complaint.description && (
                    <div className="pt-2 border-t border-border">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Description</div>
                      <p className="text-sm">{complaint.description}</p>
                    </div>
                  )}
                  {complaint.resolutionText && (
                    <div className="pt-2 border-t border-border">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Resolution</div>
                      <p className="text-sm">{complaint.resolutionText}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Event timeline */}
            {events.length > 0 && (
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <button
                    className="flex w-full items-center justify-between mb-3"
                    onClick={() => setShowTimeline((v) => !v)}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Activity Timeline ({events.length})
                    </span>
                    {showTimeline
                      ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {showTimeline && (
                    <ol className="relative border-l border-primary/30 ml-2 space-y-5">
                      {[...events].reverse().map((ev, i) => (
                        <li key={ev.id ?? i} className="ml-5">
                          <span className="absolute -left-[5px] flex items-center justify-center w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-card mt-1" />
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-xs font-black uppercase tracking-wide">
                              {eventLabel(ev.eventType)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(ev.createdAt).toLocaleString("en-GB", {
                                day: "2-digit", month: "short", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {ev.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5">{ev.notes}</p>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            )}

            <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest font-mono pt-2">
              WestMetro · NERC Consumer Protection
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
