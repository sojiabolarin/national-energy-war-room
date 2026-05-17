// Step 1 — populate the gas pipeline network with multi-waypoint geometries.
//
// Coordinates are GeoJSON convention: [longitude, latitude].  Existing 12
// records are reshaped to richer routes; missing operational, construction
// and proposed corridors are added.  Match by `name` (not @unique, so we
// emulate upsert via findFirst + update/create).

import { PrismaClient } from "@prisma/client";
import type { PipelineStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type Pipe = {
  name: string;
  operator: string;
  capacityMmscfd?: number;
  capacity?: string;
  status: PipelineStatus;
  fromPoint: string;
  toPoint: string;
  lengthKm?: number;
  notes?: string;
  route: [number, number][]; // [lng, lat]
  dataSource?: string;
};

const W = {
  escravos:    [5.18, 5.62],
  forcados:    [5.36, 5.35],
  warri:       [5.75, 5.52],
  sapele:      [5.69, 5.89],
  oben:        [5.78, 6.39],
  benin:       [5.62, 6.34],
  auchi:       [6.27, 7.07],
  ajaokuta:    [6.65, 7.55],
  abuja:       [7.48, 9.07],
  kaduna:      [7.44, 10.52],
  zaria:       [7.71, 11.07],
  kano:        [8.52, 12.00],
  maiduguri:   [13.15, 11.85],
  damaturu:    [11.96, 11.74],
  potiskum:    [11.07, 11.71],
  niger_border:[8.20, 13.30],
  cotonou:     [2.40, 6.35],
  lome:        [1.21, 6.13],
  lagos:       [3.40, 6.45],
  itoki:       [3.42, 6.85],
  olorunsogo:  [3.45, 7.13],
  alaoji:      [7.35, 5.20],
  aba:         [7.36, 5.12],
  owerri:      [7.03, 5.48],
  onitsha:     [6.79, 6.15],
  bonny:       [7.17, 4.43],
  soku:        [6.66, 4.71],
  obiafu:      [6.69, 5.36],
  calabar:     [8.32, 4.95],
} as const;

const NEP = "NGIC operational pipeline register; routes approximated from published wayleave maps";

const PIPELINES: Pipe[] = [
  {
    name: "Escravos-Lagos Pipeline System (ELPS)",
    operator: "NGIC",
    capacityMmscfd: 1100,
    capacity: "1.1 Bcf/d",
    status: "OPERATIONAL",
    fromPoint: "Escravos",
    toPoint: "Lagos (Olorunsogo)",
    lengthKm: 342,
    notes: "Primary western trunk; Niger Delta to Olorunsogo cluster via Warri-Sapele coastal route.",
    route: [W.escravos, W.warri, W.sapele, W.benin, [4.95, 6.55], [4.30, 6.50], [3.80, 6.48], W.lagos, W.itoki, W.olorunsogo],
    dataSource: NEP,
  },
  {
    name: "OB3 Pipeline (Obiafu-Obrikom-Oben)",
    operator: "NGIC",
    capacityMmscfd: 2000,
    capacity: "2.0 Bcf/d",
    status: "OPERATIONAL",
    fromPoint: "Obiafu/Obrikom",
    toPoint: "Oben",
    lengthKm: 127,
    notes: "Eastern leg connecting Niger Delta gas hub to ELPS network at Oben.",
    route: [W.obiafu, [6.55, 5.60], [6.30, 5.85], [6.00, 6.10], W.oben],
    dataSource: NEP,
  },
  {
    name: "Oben-Ajaokuta Pipeline",
    operator: "NGIC",
    capacityMmscfd: 800,
    capacity: "800 Mmscfd",
    status: "OPERATIONAL",
    fromPoint: "Oben",
    toPoint: "Ajaokuta",
    lengthKm: 196,
    notes: "OB3 Phase 1 southern leg of AKK; feeds AKK head station at Ajaokuta.",
    route: [W.oben, [5.95, 6.62], W.auchi, [6.45, 7.30], W.ajaokuta],
    dataSource: NEP,
  },
  {
    name: "Trans-Forcados Pipeline",
    operator: "NNPC / Joint Venture",
    capacityMmscfd: 400,
    capacity: "400 Mmscfd",
    status: "OPERATIONAL",
    fromPoint: "Forcados",
    toPoint: "Sapele",
    lengthKm: 80,
    notes: "Forcados terminal feeder to Delta plants via Sapele.",
    route: [W.forcados, [5.45, 5.55], W.warri, W.sapele],
    dataSource: NEP,
  },
  {
    name: "Escravos-Warri Spur",
    operator: "NGIC",
    capacityMmscfd: 220,
    capacity: "220 Mmscfd",
    status: "OPERATIONAL",
    fromPoint: "Escravos",
    toPoint: "Warri",
    lengthKm: 65,
    notes: "Short cluster connector linking Escravos terminal to Warri industrial gas.",
    route: [W.escravos, [5.40, 5.55], W.warri],
    dataSource: NEP,
  },
  {
    name: "Calabar Spur (Alaoji-Calabar)",
    operator: "NGIC",
    capacityMmscfd: 150,
    capacity: "150 Mmscfd",
    status: "OPERATIONAL",
    fromPoint: "Alaoji",
    toPoint: "Calabar",
    lengthKm: 110,
    notes: "Eastern spur from Alaoji NIPP through Aba to Calabar NIPP.",
    route: [W.alaoji, W.aba, [7.65, 5.05], [7.95, 5.00], W.calabar],
    dataSource: NEP,
  },
  {
    name: "Itoki-Olorunsogo Distribution",
    operator: "NGIC",
    capacityMmscfd: 120,
    capacity: "120 Mmscfd",
    status: "OPERATIONAL",
    fromPoint: "Itoki",
    toPoint: "Olorunsogo",
    lengthKm: 35,
    notes: "Short Olorunsogo NIPP feeder from Itoki city-gate station.",
    route: [W.itoki, [3.43, 6.95], W.olorunsogo],
    dataSource: NEP,
  },
  {
    name: "Aba-Owerri-Onitsha Distribution",
    operator: "NGIC",
    capacityMmscfd: 90,
    capacity: "90 Mmscfd",
    status: "OPERATIONAL",
    fromPoint: "Aba",
    toPoint: "Onitsha",
    lengthKm: 130,
    notes: "Eastern distribution backbone serving Aba, Owerri and Onitsha industrial loads.",
    route: [W.aba, W.owerri, [6.91, 5.78], W.onitsha],
    dataSource: NEP,
  },
  {
    name: "Bonny-Soku-Obiafu Connectivity",
    operator: "NGIC",
    capacityMmscfd: 350,
    capacity: "350 Mmscfd",
    status: "OPERATIONAL",
    fromPoint: "Bonny",
    toPoint: "Obiafu",
    lengthKm: 95,
    notes: "Bonny / Soku gas processing connectivity to OB3 head at Obiafu.",
    route: [W.bonny, W.soku, [6.68, 5.05], W.obiafu],
    dataSource: NEP,
  },

  // ── Construction ─────────────────────────────────────────────────────────
  {
    name: "AKK Pipeline",
    operator: "NGIC / NNPC",
    capacityMmscfd: 2200,
    capacity: "2.2 Bcf/d",
    status: "CONSTRUCTION",
    fromPoint: "Ajaokuta",
    toPoint: "Kano",
    lengthKm: 614,
    notes: "Mainline welding completed Dec 2025 including River Niger crossing; first gas to Abuja target Jul 2026; midline compressor at Ajaokuta still required per NGIC Jul 2025 letter. Capex US$2.8 bn.",
    route: [W.ajaokuta, [7.10, 8.20], W.abuja, [7.46, 9.80], W.kaduna, W.zaria, [7.95, 11.55], W.kano],
    dataSource: "NGIC AKK programme office",
  },

  // ── Proposed ─────────────────────────────────────────────────────────────
  {
    name: "Nigeria-Morocco Gas Pipeline (Proposed)",
    operator: "NNPC / ONHYM",
    capacity: "~3 Bcf/d (planned)",
    status: "PROPOSED",
    fromPoint: "Lagos",
    toPoint: "Lome (proposed transit)",
    lengthKm: 5660,
    notes: "Proposed 5,660 km regional pipeline; rendered as a stub heading west from Lagos for visibility.",
    route: [W.lagos, [3.10, 6.42], W.cotonou, [1.80, 6.25], W.lome],
    dataSource: "NNPC project memorandum",
  },
  {
    name: "Trans-Saharan Gas Pipeline (Proposed)",
    operator: "NNPC / Sonatrach / SONIDEP",
    capacity: "~3 Bcf/d (planned)",
    status: "PROPOSED",
    fromPoint: "Kano",
    toPoint: "Niger border (proposed transit)",
    lengthKm: 4128,
    notes: "Proposed 4,128 km Nigeria-Niger-Algeria pipeline; rendered as a stub heading north from Kano.",
    route: [W.kano, [8.40, 12.50], [8.30, 13.00], W.niger_border],
    dataSource: "NNPC / GME-MOU project file",
  },
  {
    name: "AKK Eastern Extension (Proposed)",
    operator: "NGIC",
    capacity: "TBD",
    status: "PROPOSED",
    fromPoint: "Kano",
    toPoint: "Maiduguri (proposed)",
    lengthKm: 690,
    notes: "Proposed AKK extension east towards Borno; rendered as stub from Kano.",
    route: [W.kano, [9.40, 11.95], W.potiskum, W.damaturu, W.maiduguri],
    dataSource: "NGIC corporate plan 2025-2029",
  },
];

function geoJsonLineString(route: [number, number][]) {
  return { type: "LineString", coordinates: route } as const;
}

async function upsertPipeline(p: Pipe) {
  const geometry = geoJsonLineString(p.route);
  const data = {
    operator: p.operator,
    capacityMmscfd: p.capacityMmscfd ?? null,
    capacity: p.capacity ?? null,
    status: p.status,
    fromPoint: p.fromPoint,
    toPoint: p.toPoint,
    lengthKm: p.lengthKm ?? null,
    notes: p.notes ?? null,
    geometry,
    routeCoordinates: p.route,
    dataSource: p.dataSource ?? null,
  } as const;
  const existing = await prisma.gasPipeline.findFirst({ where: { name: p.name, deletedAt: null } });
  if (existing) {
    await prisma.gasPipeline.update({ where: { id: existing.id }, data });
    return "updated";
  }
  await prisma.gasPipeline.create({ data: { name: p.name, ...data } });
  return "created";
}

async function main() {
  console.log("🚧 Patch 01 — gas pipeline network");
  let created = 0;
  let updated = 0;
  for (const p of PIPELINES) {
    const action = await upsertPipeline(p);
    if (action === "created") created += 1;
    else updated += 1;
    console.log(`  ✓ ${action.padEnd(8)} ${p.status.padEnd(13)} ${p.name}`);
  }
  console.log(`\nDone — ${created} created, ${updated} updated`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
