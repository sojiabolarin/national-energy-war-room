import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Maximize2, Minimize2 } from "lucide-react";
import { useGetPlants, useGetDiscos, useGetActiveAlerts } from "@workspace/api-client-react";
import { useAuth } from "../../lib/auth";

interface Plant {
  id?: string;
  name?: string;
  type?: string;
  installedMw?: string | number;
  availableMw?: string | number;
  actualMw?: string | number;
  status?: string;
  latitude?: string | number;
  longitude?: string | number;
  state?: string;
  paf?: string | number;
}

interface Disco {
  id?: string;
  name?: string;
  badge?: string | null;
  hoursOfSupplyDaily?: string | number;
  atccLossPct?: string | number;
  latitude?: string | number;
  longitude?: string | number;
  operatorOrg?: { name?: string };
}

interface Alert {
  id?: string;
  severity?: string;
  title?: string;
  message?: string;
}

export type ConnState = "connecting" | "live" | "reconnecting" | "offline";

interface MapPanelProps {
  onConnectionState?: (state: ConnState) => void;
}

const LAYER_DEFS = [
  { id: "plants",       label: "Generation Plants",      defaultOn: true  },
  { id: "transmission", label: "Transmission Corridors", defaultOn: true  },
  { id: "substations",  label: "330kV Substations",      defaultOn: true  },
  { id: "gas",          label: "Gas Pipeline Routes",    defaultOn: true  },
  { id: "disco",        label: "DisCo ATC&C Heat Layer", defaultOn: true  },
  { id: "alerts",       label: "Active Alert Zones",     defaultOn: false },
  { id: "projects",     label: "Capital Projects",       defaultOn: false },
  { id: "minigrids",    label: "Mini-Grid Clusters",     defaultOn: false },
  { id: "diversion",    label: "Diversion Opportunities",defaultOn: false },
  { id: "stakeholders", label: "Stakeholder Locations",  defaultOn: false },
  { id: "frequency",    label: "Frequency Zones",        defaultOn: false },
];

// ── Plant status colours — spec-compliant ───────────────────────────────────
const PLANT_STATUS_COLORS: Record<string, string> = {
  OPERATING:    "#2E7D32",  // dark green  — fully operational
  OPERATIONAL:  "#2E7D32",  // alias
  PARTIAL:      "#ED6C02",  // amber       — partial output
  CONSTRAINED:  "#E85426",  // brand orange — gas/fuel constrained
  OUT:          "#C62828",  // dark red    — zero output / tripped
  MAINTENANCE:  "#C62828",  // dark red    — scheduled maintenance
};

const BRAND_PRIMARY = "#E85426";
const BRAND_PARTIAL = "#c46a3e";
const BRAND_MUTED   = "#888888";
const BRAND_DARK    = "#555555";

function plantColor(status?: string): string {
  return PLANT_STATUS_COLORS[status?.toUpperCase() ?? ""] ?? BRAND_DARK;
}

function plantRadius(installedMw: string | number | undefined): number {
  const mw = Math.max(0, Number(installedMw ?? 50));
  return 6 + Math.sqrt(mw) / 8;
}

// Choropleth colour by ATC&C loss %
function discoHeatColor(atcc: number): string {
  if (atcc < 30) return "#22c55e";
  if (atcc < 45) return "#f59e0b";
  if (atcc < 60) return BRAND_PRIMARY;
  return "#dc2626";
}

function alertColor(severity?: string): string {
  switch (severity) {
    case "CRITICAL": return BRAND_PRIMARY;
    case "HIGH":     return BRAND_PARTIAL;
    default:         return BRAND_MUTED;
  }
}

// Major Nigerian 330 kV transmission corridors [lat, lng]
const TRANSMISSION_LINES: [number, number][][] = [
  [[6.55, 3.58], [7.73, 4.52]],
  [[7.73, 4.52], [9.12, 4.82]],
  [[9.12, 4.82], [9.87, 4.63]],
  [[5.74, 5.90], [6.33, 5.63]],
  [[5.74, 5.90], [6.15, 6.79]],
  [[6.15, 6.79], [5.23, 7.35]],
  [[9.05, 7.47], [10.52, 7.44]],
  [[10.52, 7.44], [12.00, 8.52]],
  [[9.90, 6.83], [9.05, 7.47]],
  [[9.12, 4.82], [9.90, 6.83]],
  [[6.33, 5.63], [7.73, 4.52]],
];

const SUBSTATION_SITES: { pos: [number, number]; name: string; kv: number }[] = [
  { pos: [6.55,  3.58], name: "Egbin",       kv: 330 },
  { pos: [7.73,  4.52], name: "Oshogbo",     kv: 330 },
  { pos: [9.12,  4.82], name: "Jebba",       kv: 330 },
  { pos: [9.87,  4.63], name: "Kainji",      kv: 330 },
  { pos: [5.74,  5.90], name: "Delta",       kv: 330 },
  { pos: [6.33,  5.63], name: "Benin",       kv: 330 },
  { pos: [6.15,  6.79], name: "Onitsha",     kv: 330 },
  { pos: [5.23,  7.35], name: "Alaoji",      kv: 330 },
  { pos: [9.05,  7.47], name: "Abuja",       kv: 330 },
  { pos: [10.52, 7.44], name: "Kaduna",      kv: 330 },
  { pos: [12.00, 8.52], name: "Kano",        kv: 330 },
  { pos: [9.90,  6.83], name: "Shiroro",     kv: 330 },
  { pos: [7.55,  6.65], name: "Ajaokuta",    kv: 330 },
  { pos: [6.30,  7.50], name: "New Haven",   kv: 330 },
];

type GasStatus = "OPERATIONAL" | "PARTIAL" | "MAINTENANCE";
const GAS_PIPELINES_BY_STATUS: { coords: [number, number][][]; label: string; status: GasStatus }[] = [
  {
    label: "ELPS: Escravos–Lagos",
    status: "OPERATIONAL",
    coords: [[[5.57, 5.17], [5.83, 4.85], [6.20, 4.20], [6.45, 3.40]]],
  },
  {
    label: "OB3: Obiafu–Oben",
    status: "PARTIAL",
    coords: [[[5.80, 7.00], [6.00, 6.30], [6.25, 5.70]]],
  },
  {
    label: "Ajaokuta–Delta Spur",
    status: "MAINTENANCE",
    coords: [[[7.55, 6.65], [6.93, 6.74], [5.74, 5.90]], [[5.55, 5.72], [5.74, 5.90]]],
  },
];

const PROJECT_SITES: { pos: [number, number]; name: string }[] = [
  { pos: [11.85, 13.15], name: "Maiduguri Solar Mini-Grid" },
  { pos: [10.28, 9.72],  name: "Gombe Embedded Generation" },
  { pos: [7.72, 8.52],   name: "Makurdi Gas-to-Power" },
  { pos: [5.11, 7.36],   name: "Owerri Distribution Upgrade" },
  { pos: [12.15, 15.22], name: "Mubi Solar Park" },
];

const MINIGRID_SITES: { pos: [number, number]; name: string }[] = [
  { pos: [12.65, 8.28],  name: "Kano Rural Mini-Grid Cluster" },
  { pos: [6.88, 3.72],   name: "Lagos Island Micro-Grid" },
  { pos: [9.55, 6.62],   name: "Nassarawa Mini-Grid Zone" },
  { pos: [6.72, 7.50],   name: "Enugu Peri-Urban Cluster" },
];

const DIVERSION_SITES: { pos: [number, number]; name: string }[] = [
  { pos: [5.40, 6.13],   name: "Warri Gas Diversion Pt." },
  { pos: [4.98, 7.90],   name: "Aba Industrial Offtake" },
  { pos: [7.50, 4.54],   name: "Oshogbo Transmission Spur" },
];

const STAKEHOLDER_SITES: { pos: [number, number]; name: string; org: string }[] = [
  { pos: [9.07, 7.39],   name: "NERC Head Office",  org: "Regulator"    },
  { pos: [9.03, 7.47],   name: "TCN HQ",            org: "Transmission" },
  { pos: [9.06, 7.45],   name: "NBET HQ",           org: "Bulk Trader"  },
  { pos: [9.04, 7.40],   name: "Ministry of Power", org: "Policy"       },
  { pos: [6.45, 3.40],   name: "IKEDC Lagos",       org: "DisCo"        },
];

const ALERT_ANCHORS: [number, number][] = [
  [6.45, 3.40], [9.07, 7.40], [12.00, 8.52], [4.82, 7.04],
  [7.40, 3.90], [6.15, 6.79], [10.52, 7.44], [7.73, 4.52],
];

// ── Mock data generator for ?mock=1 ─────────────────────────────────────────
const MOCK_PLANTS: Plant[] = [
  { id: "m1", name: "Egbin Thermal",    type: "STEAM",  installedMw: 1320, availableMw: 900,  actualMw: 820,  status: "OPERATING",   latitude: 6.54, longitude: 3.57, state: "Lagos"    },
  { id: "m2", name: "Kainji Hydro",     type: "HYDRO",  installedMw: 760,  availableMw: 480,  actualMw: 460,  status: "OPERATING",   latitude: 9.87, longitude: 4.63, state: "Niger"    },
  { id: "m3", name: "Jebba Hydro",      type: "HYDRO",  installedMw: 578,  availableMw: 400,  actualMw: 380,  status: "PARTIAL",     latitude: 9.12, longitude: 4.82, state: "Niger"    },
  { id: "m4", name: "Shiroro Hydro",    type: "HYDRO",  installedMw: 600,  availableMw: 350,  actualMw: 320,  status: "OPERATING",   latitude: 9.90, longitude: 6.83, state: "Niger"    },
  { id: "m5", name: "AES Barge",        type: "GAS",    installedMw: 270,  availableMw: 0,    actualMw: 0,    status: "OUT",         latitude: 6.43, longitude: 3.42, state: "Lagos"    },
  { id: "m6", name: "Afam VI",          type: "GAS",    installedMw: 650,  availableMw: 200,  actualMw: 160,  status: "CONSTRAINED", latitude: 4.90, longitude: 7.17, state: "Rivers"   },
  { id: "m7", name: "Geregu NIPP",      type: "GAS",    installedMw: 414,  availableMw: 300,  actualMw: 240,  status: "PARTIAL",     latitude: 7.55, longitude: 6.65, state: "Kogi"     },
  { id: "m8", name: "Omotosho NIPP",    type: "GAS",    installedMw: 335,  availableMw: 280,  actualMw: 260,  status: "OPERATING",   latitude: 6.00, longitude: 4.73, state: "Ondo"     },
];

let mockFreq = 50.02;

function getMockGridData() {
  mockFreq += (Math.random() - 0.5) * 0.04;
  mockFreq = Math.max(49.6, Math.min(50.4, mockFreq));
  return {
    plants: MOCK_PLANTS.map((p) => ({ ...p })),
    frequencyHz: mockFreq,
  };
}

function InvalidateSize({ trigger }: { trigger: unknown }) {
  const map = useMap();
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(id);
  }, [map, trigger]);
  return null;
}

export function MapPanel({ onConnectionState }: MapPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>(
    Object.fromEntries(LAYER_DEFS.map((l) => [l.id, l.defaultOn]))
  );
  const [livePlants, setLivePlants] = useState<Plant[] | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMock = new URLSearchParams(window.location.search).get("mock") === "1";

  const { accessToken } = useAuth();

  const { data: rawPlantsData } = useGetPlants();
  const { data: rawDiscosData } = useGetDiscos();
  const { data: rawAlertsData } = useGetActiveAlerts();

  const plantsData = rawPlantsData as unknown as { data?: Plant[] };
  const discosData = rawDiscosData as unknown as { data?: Disco[] };
  const alertsData = rawAlertsData as unknown as { data?: Alert[] };

  const apiPlants: Plant[] = plantsData?.data ?? [];
  const discos: Disco[] = discosData?.data ?? [];
  const alerts: Alert[] = alertsData?.data ?? [];

  const plants: Plant[] = livePlants ?? apiPlants;

  const emitState = useCallback((s: ConnState) => {
    onConnectionState?.(s);
  }, [onConnectionState]);

  // ── Mock mode: poll with a timer ────────────────────────────────────────
  useEffect(() => {
    if (!isMock) return;
    emitState("live");
    const id = setInterval(() => {
      const d = getMockGridData();
      setLivePlants(d.plants);
    }, 2000);
    setLivePlants(getMockGridData().plants);
    return () => clearInterval(id);
  }, [isMock, emitState]);

  // ── Live SSE stream ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isMock || !accessToken) return;

    let active = true;
    let retryTimer: ReturnType<typeof setTimeout>;

    const scheduleOffline = () => {
      if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
      offlineTimerRef.current = setTimeout(() => {
        if (active) emitState("offline");
      }, 5000);
    };

    async function connect() {
      emitState("connecting");
      scheduleOffline();

      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetch("/api/v1/sector/grid/stream", {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: ac.signal,
        });

        if (!res.ok || !res.body) throw new Error(`Stream error: ${res.status}`);

        if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
        emitState("live");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (active) {
          const { done, value } = await reader.read();
          if (done) {
            emitState("reconnecting");
            if (active) {
              scheduleOffline();
              retryTimer = setTimeout(connect, 5000);
            }
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const payload = JSON.parse(line.slice(6)) as { plants?: Plant[] };
                if (Array.isArray(payload.plants)) setLivePlants(payload.plants);
              } catch { /* ignore */ }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        emitState("reconnecting");
        scheduleOffline();
        if (active) retryTimer = setTimeout(connect, 10000);
      }
    }

    connect();

    return () => {
      active = false;
      abortRef.current?.abort();
      clearTimeout(retryTimer);
      if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
    };
  }, [accessToken, isMock, emitState]);

  const toggleLayer = useCallback((id: string) => {
    setActiveLayers((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") setIsFullscreen((v) => !v);
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const mapHeight = isFullscreen ? "calc(100vh - 6rem)" : "500px";

  return (
    <div className={isFullscreen ? "fixed inset-0 z-[100] bg-background flex flex-col" : "flex flex-col"}>
      {/* ── Layer toggle pill row ──────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-card border-b border-border overflow-x-auto flex-shrink-0">
        {LAYER_DEFS.map((l) => (
          <button
            key={l.id}
            onClick={() => toggleLayer(l.id)}
            className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-full border whitespace-nowrap transition-colors ${
              activeLayers[l.id]
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {l.label}
          </button>
        ))}
        <button
          onClick={() => setIsFullscreen((v) => !v)}
          className="ml-auto flex-shrink-0 p-1.5 bg-secondary border border-border rounded-sm hover:border-primary/50 transition-colors text-muted-foreground hover:text-foreground"
          title="Toggle Fullscreen (F)"
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>

      {/* ── Map canvas ────────────────────────────────────────────────────── */}
      <div style={{ height: mapHeight }} className="relative flex-1 min-h-0">
        <MapContainer
          center={[9.082, 8.675]}
          zoom={6}
          className="w-full h-full z-0"
          style={{ filter: "grayscale(100%) invert(100%) hue-rotate(180deg) brightness(85%) contrast(115%)" }}
        >
          <InvalidateSize trigger={[isFullscreen]} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* ── Transmission 330kV corridors ── */}
          {activeLayers.transmission && TRANSMISSION_LINES.map((positions, i) => (
            <Polyline
              key={`tx-${i}`}
              positions={positions}
              pathOptions={{ color: BRAND_PRIMARY, weight: 2, opacity: 0.7, dashArray: "6 4" }}
            />
          ))}

          {/* ── 330kV Substations ── */}
          {activeLayers.substations && SUBSTATION_SITES.map((sub, i) => (
            <CircleMarker
              key={`sub-${i}`}
              center={sub.pos}
              radius={5}
              pathOptions={{ color: BRAND_PRIMARY, fillColor: "#F4F4F4", fillOpacity: 1, weight: 2 }}
            >
              <Popup>
                <div style={{ filter: "invert(100%)" }}>
                  <div className="font-bold text-sm">{sub.name} Substation</div>
                  <div className="text-xs">{sub.kv} kV</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* ── Gas pipelines by operational status ── */}
          {activeLayers.gas && GAS_PIPELINES_BY_STATUS.map((pipe) =>
            pipe.coords.map((positions, ci) => {
              const pathOptions =
                pipe.status === "OPERATIONAL"
                  ? { color: BRAND_MUTED, weight: 2, opacity: 0.75 }
                  : pipe.status === "PARTIAL"
                  ? { color: BRAND_PARTIAL, weight: 2, opacity: 0.65, dashArray: "6 4" }
                  : { color: BRAND_DARK,   weight: 2, opacity: 0.45, dashArray: "3 6" };
              return (
                <Polyline
                  key={`gas-${pipe.label}-${ci}`}
                  positions={positions}
                  pathOptions={pathOptions}
                >
                  <Popup>
                    <div style={{ filter: "invert(100%)" }}>
                      <div className="font-bold text-sm">{pipe.label}</div>
                      <div className="text-xs">Status: {pipe.status}</div>
                    </div>
                  </Popup>
                </Polyline>
              );
            })
          )}

          {/* ── DisCo ATC&C choropleth heat layer ── */}
          {activeLayers.disco && discos.map((disco, idx) => {
            const lat = disco.latitude != null ? Number(disco.latitude) : null;
            const lng = disco.longitude != null ? Number(disco.longitude) : null;
            if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) return null;
            const atcc = Number(disco.atccLossPct ?? 50);
            const color = discoHeatColor(atcc);
            const hrs = Number(disco.hoursOfSupplyDaily ?? 12);
            const radius = Math.max(14, Math.min(32, hrs * 2));
            return (
              <CircleMarker
                key={disco.id ?? idx}
                center={[lat, lng]}
                radius={radius}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.28, weight: 2 }}
              >
                <Popup>
                  <div className="text-sm p-1" style={{ filter: "invert(100%)" }}>
                    <div className="font-bold mb-1">{disco.name} DisCo</div>
                    <div className="text-xs opacity-80">{disco.operatorOrg?.name ?? ""}</div>
                    <div className="text-xs opacity-80">Hours/Day: {Number(disco.hoursOfSupplyDaily ?? 0).toFixed(1)} h</div>
                    <div className="text-xs font-semibold mt-1">ATC&C Loss: {atcc.toFixed(1)}%</div>
                    <div className="text-xs font-bold mt-1">Status: {disco.badge ?? "N/A"}</div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* ── Generation plants — spec colours + scaled radius ── */}
          {activeLayers.plants && plants.map((plant, idx) => {
            const lat = plant.latitude != null ? Number(plant.latitude) : null;
            const lng = plant.longitude != null ? Number(plant.longitude) : null;
            if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) return null;
            const color = plantColor(plant.status);
            const r = plantRadius(plant.installedMw);
            return (
              <CircleMarker
                key={plant.id ?? idx}
                center={[lat, lng]}
                radius={r}
                pathOptions={{ color: "white", fillColor: color, fillOpacity: 0.85, weight: 1.5 }}
              >
                <Popup>
                  <div className="text-sm p-1" style={{ filter: "invert(100%)" }}>
                    <div className="font-bold mb-1">{plant.name ?? "Unknown"}</div>
                    <div className="text-xs opacity-80">Type: {plant.type ?? "N/A"}</div>
                    <div className="text-xs opacity-80">State: {plant.state ?? "N/A"}</div>
                    <div className="text-xs opacity-80">Installed: {Number(plant.installedMw ?? 0).toLocaleString()} MW</div>
                    <div className="text-xs opacity-80">Available: {Number(plant.availableMw ?? 0).toLocaleString()} MW</div>
                    <div className="text-xs opacity-80">Output: {Number(plant.actualMw ?? 0).toLocaleString()} MW</div>
                    <div className="text-xs font-bold mt-1" style={{ color }}>
                      {plant.status ?? "Unknown"}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* ── Active alert zones ── */}
          {activeLayers.alerts && alerts.slice(0, ALERT_ANCHORS.length).map((alert, idx) => {
            const anchor = ALERT_ANCHORS[idx];
            if (!anchor) return null;
            const [lat, lng] = anchor;
            return (
              <CircleMarker
                key={alert.id ?? idx}
                center={[lat, lng]}
                radius={10}
                pathOptions={{ color: alertColor(alert.severity), fillColor: alertColor(alert.severity), fillOpacity: 0.5, weight: 2, dashArray: "4 3" }}
              >
                <Popup>
                  <div className="text-sm p-1" style={{ filter: "invert(100%)" }}>
                    <div className="font-bold mb-1">{alert.title ?? "Grid Alert"}</div>
                    <div className="text-xs opacity-80">Severity: {alert.severity ?? "N/A"}</div>
                    <div className="text-xs opacity-80 mt-1">{alert.message ?? ""}</div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* ── Capital projects ── */}
          {activeLayers.projects && PROJECT_SITES.map((site, i) => (
            <CircleMarker
              key={`proj-${i}`}
              center={site.pos}
              radius={7}
              pathOptions={{ color: BRAND_PARTIAL, fillColor: BRAND_PARTIAL, fillOpacity: 0.7, weight: 2 }}
            >
              <Popup>
                <div style={{ filter: "invert(100%)" }}>
                  <div className="font-bold text-sm">{site.name}</div>
                  <div className="text-xs">Capital Project</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* ── Mini-grid clusters ── */}
          {activeLayers.minigrids && MINIGRID_SITES.map((site, i) => (
            <CircleMarker
              key={`mg-${i}`}
              center={site.pos}
              radius={6}
              pathOptions={{ color: "#6366f1", fillColor: "#6366f1", fillOpacity: 0.7, weight: 1.5 }}
            >
              <Popup>
                <div style={{ filter: "invert(100%)" }}>
                  <div className="font-bold text-sm">{site.name}</div>
                  <div className="text-xs">Mini-Grid Cluster</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* ── Diversion opportunities ── */}
          {activeLayers.diversion && DIVERSION_SITES.map((site, i) => (
            <CircleMarker
              key={`div-${i}`}
              center={site.pos}
              radius={7}
              pathOptions={{ color: "#0ea5e9", fillColor: "#0ea5e9", fillOpacity: 0.6, weight: 2 }}
            >
              <Popup>
                <div style={{ filter: "invert(100%)" }}>
                  <div className="font-bold text-sm">{site.name}</div>
                  <div className="text-xs">Diversion Opportunity</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* ── Stakeholder locations ── */}
          {activeLayers.stakeholders && STAKEHOLDER_SITES.map((site, i) => (
            <CircleMarker
              key={`stk-${i}`}
              center={site.pos}
              radius={6}
              pathOptions={{ color: "#a3a3a3", fillColor: "#a3a3a3", fillOpacity: 0.8, weight: 1.5 }}
            >
              <Popup>
                <div style={{ filter: "invert(100%)" }}>
                  <div className="font-bold text-sm">{site.name}</div>
                  <div className="text-xs">{site.org}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* ── Frequency zone overlays ── */}
          {activeLayers.frequency && [
            { center: [6.55, 3.58] as [number, number], label: "Lagos Hub" },
            { center: [9.82, 4.60] as [number, number], label: "Kainji Hub" },
            { center: [9.05, 7.47] as [number, number], label: "Abuja Hub" },
          ].map((hub, i) => (
            <CircleMarker
              key={`freq-${i}`}
              center={hub.center}
              radius={28}
              pathOptions={{ color: BRAND_PRIMARY, fillColor: BRAND_PRIMARY, fillOpacity: 0.06, weight: 1, dashArray: "2 4" }}
            >
              <Popup>
                <div style={{ filter: "invert(100%)" }}>
                  <div className="font-bold">{hub.label} — Frequency Zone</div>
                  <div className="text-xs">Nominal: 50.0 Hz</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* ── Legend (bottom-left of map) ─────────────────────────────────── */}
        <div className="absolute bottom-4 left-4 z-[400] bg-card/90 border border-border rounded-sm px-3 py-2 text-[10px] uppercase tracking-wider space-y-1 pointer-events-none">
          <div className="text-[9px] font-bold opacity-60 pb-0.5">Plant Status</div>
          {[
            { color: "#2E7D32", label: "Operating"   },
            { color: "#ED6C02", label: "Partial"      },
            { color: "#E85426", label: "Constrained"  },
            { color: "#C62828", label: "Out"          },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: color }} />
              {label}
            </div>
          ))}
          <div className="text-[9px] font-bold opacity-60 pt-1 pb-0.5 border-t border-border">ATC&amp;C Loss</div>
          {[
            { color: "#22c55e", label: "<30%" },
            { color: "#f59e0b", label: "30-45%" },
            { color: "#E85426", label: "45-60%" },
            { color: "#dc2626", label: ">60%"  },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
