import { useState, useEffect, useRef } from "react";
import { useGetActiveAlerts } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info, Bell } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface Alert {
  id?: string;
  severity: string;
  title: string;
  message: string;
  timestamp?: string;
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case "CRITICAL": return <AlertCircle className="w-5 h-5 text-destructive" />;
    case "HIGH":     return <AlertTriangle className="w-5 h-5 text-primary" />;
    case "MEDIUM":   return <Bell className="w-5 h-5 text-muted-foreground" />;
    default:         return <Info className="w-5 h-5 text-muted-foreground" />;
  }
}

function getSeverityBadgeClass(severity: string) {
  switch (severity) {
    case "CRITICAL": return "bg-destructive text-destructive-foreground";
    case "HIGH":     return "bg-primary text-primary-foreground";
    case "MEDIUM":   return "bg-secondary text-secondary-foreground";
    default:         return "bg-muted text-muted-foreground";
  }
}

export function LiveAlerts() {
  const { data: rawAlertsData, isLoading } = useGetActiveAlerts();
  const [streamAlerts, setStreamAlerts] = useState<Alert[]>([]);
  const { accessToken } = useAuth();
  const activeRef = useRef(true);

  useEffect(() => {
    if (!accessToken) return;

    activeRef.current = true;

    const readStream = async () => {
      try {
        // Use /alerts/active with SSE Accept header per API contract
        const response = await fetch("/api/v1/alerts/active", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "text/event-stream",
          },
        });
        if (!response.ok) return;

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) return;

        while (activeRef.current) {
          const { value, done } = await reader.read();
          if (done) break;

          const lines = decoder.decode(value).split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.substring(6)) as Alert[] | Alert | { alert?: Alert };
              if (Array.isArray(data)) {
                // Stream sends the full alert array — prepend new items
                const incoming = data.slice(0, 5) as Alert[];
                if (incoming.length > 0) {
                  setStreamAlerts((prev) => {
                    const existingIds = new Set(prev.map((a) => a.id));
                    const fresh = incoming.filter((a) => a.id && !existingIds.has(a.id));
                    return [...fresh, ...prev].slice(0, 10);
                  });
                }
              } else if ((data as { alert?: Alert }).alert) {
                const alert = (data as { alert: Alert }).alert;
                setStreamAlerts((prev) => [alert, ...prev].slice(0, 10));
              }
            } catch {
              // skip malformed SSE line
            }
          }
        }
      } catch {
        // stream unavailable — fall through silently
      }
    };

    readStream();
    return () => { activeRef.current = false; };
  }, [accessToken]);

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const rawList = rawAlertsData as unknown as { data?: Alert[] };
  const initialAlerts: Alert[] = rawList?.data ?? [];
  const alerts = [...streamAlerts, ...initialAlerts].slice(0, 10);

  return (
    <div className="space-y-4">
      {alerts.map((alert, i) => (
        <div
          key={alert.id ?? i}
          className="flex items-start gap-4 p-4 border border-border bg-card rounded-sm hover:bg-secondary/20 transition-colors"
        >
          <div className="mt-1 shrink-0">
            {getSeverityIcon(alert.severity)}
          </div>
          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge className={`${getSeverityBadgeClass(alert.severity)} font-mono text-[10px]`}>
                  {alert.severity}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  {new Date(alert.timestamp ?? Date.now()).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex gap-1 flex-wrap">
                <button className="text-[10px] font-bold uppercase tracking-wider bg-destructive/80 text-destructive-foreground px-2 py-1 rounded-sm hover:bg-destructive transition-colors">
                  Brief Minister
                </button>
                <button className="text-[10px] font-bold uppercase tracking-wider bg-secondary text-foreground px-2 py-1 rounded-sm hover:bg-secondary/80 transition-colors">
                  Press Brief
                </button>
                <button className="text-[10px] font-bold uppercase tracking-wider border border-border text-foreground px-2 py-1 rounded-sm hover:bg-secondary transition-colors">
                  Open
                </button>
              </div>
            </div>
            <h4 className="font-bold text-foreground">{alert.title || "Grid Alert"}</h4>
            <p className="text-sm text-muted-foreground line-clamp-2">{alert.message || "Operational alert from grid monitoring system."}</p>
          </div>
        </div>
      ))}

      {alerts.length === 0 && (
        <div className="text-center text-muted-foreground py-8 border border-border rounded-sm border-dashed">
          No active alerts.
        </div>
      )}
    </div>
  );
}
