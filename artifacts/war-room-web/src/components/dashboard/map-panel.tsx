import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Layers, X, Maximize2, Minimize2 } from "lucide-react";
import { useGetPlants, useGetDiscos, useGetActiveAlerts } from "@workspace/api-client-react";

interface Plant {
  id?: string;
  name?: string;
  type?: string;
  installedMw?: string | number;
  availableMw?: string | number;
  status?: string;
  latitude?: string | number;
  longitude?: string | number;
  state?: string;
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

const LAYER_DEFS = [
  { id: "plants",       label: "Generation Plants",      defaultOn: true  },
  { id: "transmission", label: "Transmission Corridors", defaultOn: true  },
  { id: "substations",  label: "330kV Substations",      defaultOn: true  },
  { id: "gas",          label: "Gas Pipeline Routes",    defaultOn: true  },
  { id: "disco",        label: "DisCo Service Areas",    defaultOn: false },
  { id: "alerts",       label: "Active Alert Zones",     defaultOn: false },
  { id: "projects",     label: "Capital Projects",       defaultOn: false },
  { id: "minigrids",    label: "Mini-Grid Clusters",     defaultOn: false },
  { id: "diversion",    label: "Diversion Opportunities",defaultOn: false },
  { id: "stakeholders", label: "Stakeholder Locations",  defaultOn: false },
  { id: "frequency",    label: "Frequency Zones",        defaultOn: false },
];

// Brand palette only: #E85426 (primary), #1A1A1A (dark), #F4F4F4 (light), greys
const BRAND_PRIMARY  = "#E85426";
const BRAND_PARTIAL  = "#c46a3e"; // muted primary
const BRAND_MUTED    = "#888888";
const BRAND_DARK     = "#555555";

const PLANT_COLORS: Record<string, string> = {
  OPERATIONAL: BRAND_PRIMARY,
  PARTIAL:     BRAND_PARTIAL,
};

// Major Nigerian 330 kV transmission corridors [lat, lng]
const TRANSMISSION_LINES: [number, number][][] = [
  [[6.55, 3.58], [7.73, 4.52]],         // Egbin–Oshogbo
  [[7.73, 4.52], [9.12, 4.82]],         // Oshogbo–Jebba
  [[9.12, 4.82], [9.87, 4.63]],         // Jebba–Kainji
  [[5.74, 5.90], [6.33, 5.63]],         // Delta–Benin
  [[5.74, 5.90], [6.15, 6.79]],         // Delta–Onitsha
  [[6.15, 6.79], [5.23, 7.35]],         // Onitsha–Alaoji
  [[9.05, 7.47], [10.52, 7.44]],        // Abuja–Kaduna
  [[10.52, 7.44], [12.00, 8.52]],       // Kaduna–Kano
  [[9.90, 6.83], [9.05, 7.47]],         // Shiroro–Abuja
  [[9.12, 4.82], [9.90, 6.83]],         // Jebba–Shiroro
  [[6.33, 5.63], [7.73, 4.52]],         // Benin–Oshogbo
];

// Major Nigerian 330kV substation nodes
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

// NGC gas pipeline routes grouped by operational status
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

// Representative capital project sites (REA/NERC listed off-grid projects)
const PROJECT_SITES: { pos: [number, number]; name: string }[] = [
  { pos: [11.85, 13.15], name: "Maiduguri Solar Mini-Grid" },
  { pos: [10.28, 9.72],  name: "Gombe Embedded Generation" },
  { pos: [7.72, 8.52],   name: "Makurdi Gas-to-Power" },
  { pos: [5.11, 7.36],   name: "Owerri Distribution Upgrade" },
  { pos: [12.15, 15.22], name: "Mubi Solar Park" },
];

// Mini-grid cluster centroids (REA data-approximate)
const MINIGRID_SITES: { pos: [number, number]; name: string }[] = [
  { pos: [12.65, 8.28],  name: "Kano Rural Mini-Grid Cluster" },
  { pos: [6.88, 3.72],   name: "Lagos Island Micro-Grid" },
  { pos: [9.55, 6.62],   name: "Nassarawa Mini-Grid Zone" },
  { pos: [6.72, 7.50],   name: "Enugu Peri-Urban Cluster" },
];

// Diversion opportunity points (where stranded gas can be redirected to power)
const DIVERSION_SITES: { pos: [number, number]; name: string }[] = [
  { pos: [5.40, 6.13],   name: "Warri Gas Diversion Pt." },
  { pos: [4.98, 7.90],   name: "Aba Industrial Offtake" },
  { pos: [7.50, 4.54],   name: "Oshogbo Transmission Spur" },
];

// Stakeholder office locations (NERC, TCN, NBET, NEMSF)
const STAKEHOLDER_SITES: { pos: [number, number]; name: string; org: string }[] = [
  { pos: [9.07, 7.39],   name: "NERC Head Office",  org: "Regulator"   },
  { pos: [9.03, 7.47],   name: "TCN HQ",            org: "Transmission" },
  { pos: [9.06, 7.45],   name: "NBET HQ",           org: "Bulk Trader" },
  { pos: [9.04, 7.40],   name: "Ministry of Power", org: "Policy"      },
  { pos: [6.45, 3.40],   name: "IKEDC Lagos",       org: "DisCo"       },
];

// Alert indicator positions spread across economic zones
const ALERT_ANCHORS: [number, number][] = [
  [6.45, 3.40], [9.07, 7.40], [12.00, 8.52], [4.82, 7.04],
  [7.40, 3.90], [6.15, 6.79], [10.52, 7.44], [7.73, 4.52],
];

function plantColor(status?: string): string {
  return PLANT_COLORS[status?.toUpperCase() ?? ""] ?? BRAND_DARK;
}

function discoColor(badge?: string | null): string {
  switch (badge) {
    case "CRITICAL": return BRAND_PRIMARY;
    case "WARN":     return BRAND_PARTIAL;
    default:         return BRAND_DARK;
  }
}

function alertColor(severity?: string): string {
  switch (severity) {
    case "CRITICAL": return BRAND_PRIMARY;
    case "HIGH":     return BRAND_PARTIAL;
    default:         return BRAND_MUTED;
  }
}

function InvalidateSize({ trigger }: { trigger: unknown }) {
  const map = useMap();
  useEffect(() => {
    // Small delay allows the DOM to finish layout before Leaflet recalculates
    const id = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(id);
  }, [map, trigger]);
  return null;
}

export function MapPanel() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>(
    Object.fromEntries(LAYER_DEFS.map((l) => [l.id, l.defaultOn]))
  );

  const { data: rawPlantsData } = useGetPlants();
  const { data: rawDiscosData } = useGetDiscos();
  const { data: rawAlertsData } = useGetActiveAlerts();

  const plantsData = rawPlantsData as unknown as { data?: Plant[] };
  const discosData = rawDiscosData as unknown as { data?: Disco[] };
  const alertsData = rawAlertsData as unknown as { data?: Alert[] };

  const plants: Plant[] = plantsData?.data ?? [];
  const discos: Disco[] = discosData?.data ?? [];
  const alerts: Alert[] = alertsData?.data ?? [];

  const toggleLayer = useCallback((id: string) => {
    setActiveLayers((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") setIsFullscreen((v) => !v);
      if (e.key === "Escape") { setIsFullscreen(false); setShowLayers(false); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const LayerPanel = (
    <div className="space-y-2">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-1">
        <span className="font-bold uppercase tracking-wider text-xs">Layers</span>
        <button onClick={() => setShowLayers(false)} className="text-muted-foreground hover:text-foreground md:hidden">
          <X size={16} />
        </button>
      </div>
      {LAYER_DEFS.map((l) => (
        <label key={l.id} className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={!!activeLayers[l.id]}
            onChange={() => toggleLayer(l.id)}
            className="accent-primary"
          />
          <span>{l.label}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className={`relative ${isFullscreen ? "fixed inset-0 z-[100] bg-background" : "h-[500px] w-full"}`}>
      <div className="absolute top-3 right-3 z-[400] flex gap-1">
        <button
          onClick={() => setIsFullscreen((v) => !v)}
          className="p-2 bg-card border border-border rounded-sm hover:bg-secondary transition-colors text-foreground shadow-md"
          title="Toggle Fullscreen (F)"
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
        <button
          onClick={() => setShowLayers((v) => !v)}
          className="p-2 bg-card border border-border rounded-sm hover:bg-secondary transition-colors text-foreground shadow-md md:hidden"
          title="Layers"
        >
          <Layers size={18} />
        </button>
      </div>

      {showLayers && (
        <div className="fixed inset-x-0 bottom-0 z-[500] bg-card border-t border-border p-4 rounded-t-lg shadow-2xl md:hidden">
          {LayerPanel}
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-[400] bg-card border border-border p-4 rounded-sm shadow-md w-56 hidden md:block">
        {LayerPanel}
      </div>

      <MapContainer
        center={[9.082, 8.675]}
        zoom={6}
        className="w-full h-full z-0"
        style={{ filter: "grayscale(100%) invert(100%) hue-rotate(180deg) brightness(85%) contrast(115%)" }}
      >
        <InvalidateSize trigger={[isFullscreen, showLayers]} />
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

        {/* ── Generation plants (live API data) ── */}
        {activeLayers.plants && plants.map((plant, idx) => {
          const lat = plant.latitude != null ? Number(plant.latitude) : null;
          const lng = plant.longitude != null ? Number(plant.longitude) : null;
          if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) return null;
          return (
            <CircleMarker
              key={plant.id ?? idx}
              center={[lat, lng]}
              radius={8}
              pathOptions={{ color: plantColor(plant.status), fillColor: plantColor(plant.status), fillOpacity: 0.85, weight: 1.5 }}
            >
              <Popup>
                <div className="text-sm p-1" style={{ filter: "invert(100%)" }}>
                  <div className="font-bold mb-1">{plant.name ?? "Unknown"}</div>
                  <div className="text-xs opacity-80">Type: {plant.type ?? "N/A"}</div>
                  <div className="text-xs opacity-80">State: {plant.state ?? "N/A"}</div>
                  <div className="text-xs opacity-80">Installed: {Number(plant.installedMw ?? 0).toLocaleString()} MW</div>
                  <div className="text-xs opacity-80">Available: {Number(plant.availableMw ?? 0).toLocaleString()} MW</div>
                  <div className="text-xs font-bold mt-1">{plant.status ?? "Unknown"}</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* ── DisCo service area centroids (live API data with lat/lng) ── */}
        {activeLayers.disco && discos.map((disco, idx) => {
          const lat = disco.latitude != null ? Number(disco.latitude) : null;
          const lng = disco.longitude != null ? Number(disco.longitude) : null;
          if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) return null;
          const hrs = Number(disco.hoursOfSupplyDaily ?? 12);
          const radius = Math.max(6, Math.min(24, hrs * 1.5));
          return (
            <CircleMarker
              key={disco.id ?? idx}
              center={[lat, lng]}
              radius={radius}
              pathOptions={{ color: discoColor(disco.badge), fillColor: discoColor(disco.badge), fillOpacity: 0.35, weight: 2 }}
            >
              <Popup>
                <div className="text-sm p-1" style={{ filter: "invert(100%)" }}>
                  <div className="font-bold mb-1">{disco.name} DisCo</div>
                  <div className="text-xs opacity-80">{disco.operatorOrg?.name ?? ""}</div>
                  <div className="text-xs opacity-80">Hours/Day: {Number(disco.hoursOfSupplyDaily ?? 0).toFixed(1)} h</div>
                  <div className="text-xs opacity-80">ATC&C Loss: {Number(disco.atccLossPct ?? 0).toFixed(1)}%</div>
                  <div className="text-xs font-bold mt-1">Status: {disco.badge ?? "N/A"}</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* ── Active alert zones (live API data) ── */}
        {activeLayers.alerts && alerts.slice(0, ALERT_ANCHORS.length).map((alert, idx) => {
          const [lat, lng] = ALERT_ANCHORS[idx];
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
        {activeLayers.minigrids && MINIGRID_SITE_ITEMS}

        {/* ── Diversion opportunities ── */}
        {activeLayers.diversion && DIVERSION_SITE_ITEMS}

        {/* ── Stakeholder locations ── */}
        {activeLayers.stakeholders && STAKEHOLDER_SITE_ITEMS}

        {/* ── Frequency zone overlays (generation hub circles) ── */}
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

      {/* Legend */}
      <div className="absolute top-3 left-3 z-[400] bg-card/90 border border-border rounded-sm px-3 py-2 text-[10px] uppercase tracking-wider space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: BRAND_PRIMARY }} />
          Operational
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: BRAND_PARTIAL }} />
          Partial
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-muted-foreground inline-block" />
          Offline
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <span className="inline-block w-6 border-t-2 border-dashed border-primary opacity-70" />
          330kV
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-6 border-t-2 border-dashed border-muted-foreground opacity-60" />
          Gas
        </div>
      </div>
    </div>
  );
}

// Extracted JSX arrays to keep the return block clean
const MINIGRID_SITE_ITEMS = MINIGRID_SITES.map((site, i) => (
  <CircleMarker
    key={`mg-${i}`}
    center={site.pos}
    radius={6}
    pathOptions={{ color: BRAND_MUTED, fillColor: BRAND_MUTED, fillOpacity: 0.65, weight: 1.5 }}
  >
    <Popup>
      <div style={{ filter: "invert(100%)" }}>
        <div className="font-bold text-sm">{site.name}</div>
        <div className="text-xs">Mini-Grid Cluster</div>
      </div>
    </Popup>
  </CircleMarker>
));

const DIVERSION_SITE_ITEMS = DIVERSION_SITES.map((site, i) => (
  <CircleMarker
    key={`div-${i}`}
    center={site.pos}
    radius={8}
    pathOptions={{ color: BRAND_PARTIAL, fillColor: BRAND_PARTIAL, fillOpacity: 0.5, weight: 2, dashArray: "3 2" }}
  >
    <Popup>
      <div style={{ filter: "invert(100%)" }}>
        <div className="font-bold text-sm">{site.name}</div>
        <div className="text-xs">Diversion Opportunity</div>
      </div>
    </Popup>
  </CircleMarker>
));

const STAKEHOLDER_SITE_ITEMS = STAKEHOLDER_SITES.map((site, i) => (
  <CircleMarker
    key={`stk-${i}`}
    center={site.pos}
    radius={6}
    pathOptions={{ color: BRAND_DARK, fillColor: BRAND_DARK, fillOpacity: 0.8, weight: 1 }}
  >
    <Popup>
      <div style={{ filter: "invert(100%)" }}>
        <div className="font-bold text-sm">{site.name}</div>
        <div className="text-xs">{site.org}</div>
      </div>
    </Popup>
  </CircleMarker>
));
