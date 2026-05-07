import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";

const MIN_FREQ = 49.0;
const MAX_FREQ = 51.0;
const SPAN = MAX_FREQ - MIN_FREQ;

// Brand-compliant zone definitions (no green/yellow/blue)
interface Zone { from: number; to: number; color: string; label: string }
const ZONES: Zone[] = [
  { from: 49.0, to: 49.5, color: "hsl(var(--destructive))", label: "CRITICAL LOW" },
  { from: 49.5, to: 49.8, color: "hsl(var(--primary))", label: "WARNING LOW" },
  { from: 49.8, to: 50.2, color: "hsl(var(--primary))", label: "NORMAL" },
  { from: 50.2, to: 50.5, color: "hsl(var(--primary))", label: "WARNING HIGH" },
  { from: 50.5, to: 51.0, color: "hsl(var(--destructive))", label: "CRITICAL HIGH" },
];

const CX = 120;
const CY = 120;
const R = 90;

const polar = (angle: number, r: number = R) => {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
};

const arcPath = (startAngle: number, endAngle: number) => {
  const s = polar(endAngle);
  const e = polar(startAngle);
  const large = endAngle - startAngle > 180 ? "1" : "0";
  return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 0 ${e.x} ${e.y}`;
};

const pct = (freq: number) =>
  Math.max(0, Math.min(1, (freq - MIN_FREQ) / SPAN));

const freqToAngle = (freq: number) => 180 + pct(freq) * 180;

export function FrequencyGauge() {
  const [frequency, setFrequency] = useState<number | null>(null);
  const [streamStatus, setStreamStatus] = useState<"connecting" | "live" | "error">("connecting");
  const { accessToken } = useAuth();
  const activeRef = useRef(true);

  useEffect(() => {
    if (!accessToken) return;
    activeRef.current = true;
    setStreamStatus("connecting");

    const run = async () => {
      try {
        // Use the dedicated SSE endpoint that always streams (no Accept negotiation needed)
        const res = await fetch("/api/v1/sector/grid/live", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "text/event-stream",
          },
        });
        if (!res.ok || !res.body) { setStreamStatus("error"); return; }

        setStreamStatus("live");
        const reader = res.body.getReader();
        const dec = new TextDecoder();

        while (activeRef.current) {
          const { value, done } = await reader.read();
          if (done) break;
          for (const line of dec.decode(value).split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const d = JSON.parse(line.substring(6)) as Record<string, unknown>;
              // frequencyHz may be a Prisma Decimal serialised as string
              const hz = d.frequencyHz != null ? Number(d.frequencyHz) : null;
              if (hz !== null && !isNaN(hz)) setFrequency(hz);
            } catch { /* skip malformed line */ }
          }
        }
      } catch {
        setStreamStatus("error");
      }
    };

    run();
    return () => { activeRef.current = false; };
  }, [accessToken]);

  const val = frequency;
  const angle = val !== null ? freqToAngle(val) : freqToAngle(50.0);

  const zone = val !== null
    ? ZONES.find((z) => val >= z.from && val <= z.to) ?? ZONES[2]
    : null;

  const isCritical = zone && (zone.label.includes("CRITICAL"));
  const isLive = streamStatus === "live";

  // Needle tip
  const needleTip = polar(angle, R - 20);

  return (
    <div className="flex flex-col items-center justify-center py-6 gap-4">
      {/* Gauge SVG */}
      <svg width={240} height={145} viewBox="0 0 240 145" className="overflow-visible">
        {/* Background track */}
        <path
          d={arcPath(180, 360)}
          stroke="hsl(var(--border))"
          strokeWidth={18}
          fill="none"
          strokeLinecap="butt"
        />

        {/* Colored zones */}
        {ZONES.map((z) => (
          <path
            key={z.label}
            d={arcPath(freqToAngle(z.from), freqToAngle(z.to))}
            stroke={z.color}
            strokeWidth={18}
            fill="none"
            strokeOpacity={zone?.label === z.label ? 1 : 0.2}
            strokeLinecap="butt"
          />
        ))}

        {/* Live value indicator arc */}
        {val !== null && (
          <path
            d={arcPath(freqToAngle(50.0), angle)}
            stroke={zone?.color ?? "hsl(var(--primary))"}
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
          />
        )}

        {/* Needle */}
        <line
          x1={CX}
          y1={CY}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r={7} fill="currentColor" />
        <circle cx={CX} cy={CY} r={3} fill="hsl(var(--background))" />

        {/* Tick marks and labels */}
        {[49.0, 49.5, 50.0, 50.5, 51.0].map((hz) => {
          const a = freqToAngle(hz);
          const inner = polar(a, R + 4);
          const outer = polar(a, R + 18);
          const labelPt = polar(a, R + 28);
          return (
            <g key={hz}>
              <line
                x1={inner.x} y1={inner.y}
                x2={outer.x} y2={outer.y}
                stroke="currentColor" strokeWidth={1} strokeOpacity={0.5}
              />
              <text
                x={labelPt.x} y={labelPt.y + 3}
                textAnchor="middle"
                fill="currentColor"
                fontSize={8}
                fontFamily="Arial"
                opacity={0.5}
              >
                {hz.toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Frequency value */}
      <div className={`text-4xl font-mono font-bold tabular-nums transition-colors ${isCritical ? "text-destructive" : val !== null ? "text-primary" : "text-muted-foreground"}`}>
        {val !== null ? val.toFixed(3) : "—.———"}{" "}
        <span className="text-xl text-muted-foreground">Hz</span>
      </div>

      {/* Zone label + live indicator */}
      <div className="flex items-center gap-3">
        <div className={`text-xs font-bold uppercase tracking-widest ${isCritical ? "text-destructive" : val !== null ? "text-primary" : "text-muted-foreground"}`}>
          {zone?.label ?? "NO SIGNAL"}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Pulse dot */}
          {isLive ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-muted-foreground opacity-40" />
          )}
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
            {streamStatus === "live" ? "LIVE SSE" : streamStatus === "error" ? "STREAM ERR" : "CONNECTING"}
          </span>
        </div>
      </div>

      <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
        Live Grid Frequency — Nigerian National Grid
      </div>
    </div>
  );
}
