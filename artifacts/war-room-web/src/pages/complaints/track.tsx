import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTrackComplaint } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";

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
    if (ticket && phone4.length === 4) {
      setQueryKey({ ticket, phone: phone4 });
    }
  };

  // API wraps the record in { data: { ... } }
  const complaint = (complaintData as unknown as { data?: ComplaintRecord })?.data;
  const events: ComplaintEvent[] = complaint?.events ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center justify-center gap-3">
          <span className="inline-flex items-center justify-center bg-white rounded-full p-0.5 shrink-0">
            <img src="/ministry-logo.png" alt="Ministry of Power" className="h-8 w-8 rounded-full object-cover" />
          </span>
          <h1 className="text-xl font-bold uppercase tracking-wider">Track Complaint</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 mt-6">
        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <div className="flex-1 space-y-2">
            <Input
              placeholder="Ticket Number (e.g. WR-20260507-000001)"
              value={ticket}
              onChange={(e) => setTicket(e.target.value)}
              className="bg-card font-mono uppercase"
              required
            />
            <Input
              placeholder="Phone Last 4 Digits"
              value={phone4}
              onChange={(e) => setPhone4(e.target.value)}
              maxLength={4}
              className="bg-card font-mono"
              required
            />
          </div>
          <Button type="submit" className="h-auto px-6 bg-primary" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </Button>
        </form>

        {isError && (
          <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-bold">Not Found</h4>
              <p className="text-sm">Could not find a complaint matching that ticket number and phone combination.</p>
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
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Status</div>
                    <div className="text-xl font-bold text-primary flex items-center gap-2">
                      {String(complaint.status) === "RESOLVED"
                        ? <CheckCircle2 className="w-5 h-5 text-primary" />
                        : <Clock className="w-5 h-5 text-muted-foreground" />}
                      {String(complaint.status ?? "IN PROGRESS")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Ticket</div>
                    <div className="font-mono font-bold text-sm">{String(complaint.ticketNumber ?? ticket)}</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {complaint.disco?.name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">DisCo</span>
                      <span className="font-bold">{complaint.disco.name}</span>
                    </div>
                  )}
                  {complaint.feeder?.name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Feeder</span>
                      <span className="font-bold">{complaint.feeder.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-bold">{String(complaint.category ?? "Unknown")}</span>
                  </div>
                  {complaint.severity && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Severity</span>
                      <span className="font-bold">{complaint.severity}</span>
                    </div>
                  )}
                  {complaint.slaBreached && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SLA</span>
                      <span className="font-bold text-destructive">BREACHED</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Filed On</span>
                    <span className="font-mono">
                      {complaint.createdAt
                        ? new Date(String(complaint.createdAt)).toLocaleDateString("en-GB")
                        : "Unknown"}
                    </span>
                  </div>
                  {complaint.resolvedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Resolved</span>
                      <span className="font-mono">
                        {new Date(String(complaint.resolvedAt)).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                  )}
                  {complaint.resolutionText && (
                    <div className="pt-2 border-t border-border">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Resolution</div>
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
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Activity Timeline ({events.length})
                    </span>
                    {showTimeline
                      ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {showTimeline && (
                    <ol className="relative border-l border-border ml-2 space-y-4">
                      {[...events].reverse().map((ev, i) => (
                        <li key={ev.id ?? i} className="ml-4">
                          {/* Dot */}
                          <span className="absolute -left-[5px] flex items-center justify-center w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-card mt-0.5" />
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-xs font-bold uppercase tracking-wide">
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
          </div>
        )}
      </div>
    </div>
  );
}
