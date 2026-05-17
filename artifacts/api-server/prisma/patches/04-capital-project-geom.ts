// Step 3 / Priority A3 — populate CapitalProject.geometry from lat/lng, and
// add the missing PPI Phase 1 sub-sites, Qua Iboe and Afam III.
//
// The dashboard map's Capital Projects layer needs an explicit GeoJSON
// point geometry so it can render alongside other GeoJSON layers without
// special-casing the lat/lng decimal fields.

import { PrismaClient } from "@prisma/client";
import type { ProjectCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type ProjectSeed = {
  name: string;
  category: ProjectCategory;
  status: string;
  latitude: number;
  longitude: number;
  capexUsd?: number;
  completionPct?: number;
  timeline?: string;
  funder?: string;
  notes?: string;
};

// PPI Phase 1 — 12 transmission rehabilitation sites delivered with Siemens
// Energy.  Coordinates approximated from the named TCN substations / IBEDC
// injection nodes.
const PPI_PHASE_1_SITES: ProjectSeed[] = [
  { name: "PPI Phase 1 — Apo Mobile (Abuja)",     category: "TRANSMISSION", status: "Implementation", latitude:  9.000, longitude: 7.450,
    capexUsd: 24_000_000, completionPct: 65, timeline: "2024-2026",
    funder: "FGN / Siemens Energy", notes: "Mobile substation deployed to Apo cluster under PPI Phase 1." },
  { name: "PPI Phase 1 — Ajah Mobile (Lagos)",    category: "TRANSMISSION", status: "Implementation", latitude:  6.466, longitude: 3.566,
    capexUsd: 24_000_000, completionPct: 70, timeline: "2024-2026",
    funder: "FGN / Siemens Energy", notes: "Mobile substation reinforcing Ikeja West-Aja corridor." },
  { name: "PPI Phase 1 — Okene Mobile (Kogi)",    category: "TRANSMISSION", status: "Implementation", latitude:  7.550, longitude: 6.235,
    capexUsd: 24_000_000, completionPct: 60, timeline: "2024-2026",
    funder: "FGN / Siemens Energy", notes: "Mobile substation for Kogi load centre." },
  { name: "PPI Phase 1 — Nike Lake Mobile (Enugu)", category: "TRANSMISSION", status: "Implementation", latitude: 6.470, longitude: 7.610,
    capexUsd: 24_000_000, completionPct: 60, timeline: "2024-2026",
    funder: "FGN / Siemens Energy", notes: "Mobile substation supporting Enugu metropolitan load." },
  { name: "PPI Phase 1 — Kwanar Dangora Mobile (Kano)", category: "TRANSMISSION", status: "Implementation", latitude: 11.700, longitude: 8.250,
    capexUsd: 24_000_000, completionPct: 55, timeline: "2024-2026",
    funder: "FGN / Siemens Energy", notes: "Mobile substation reinforcing Kano DisCo network." },
  { name: "PPI Phase 1 — Maryland Mobile (Lagos)", category: "TRANSMISSION", status: "Implementation", latitude:  6.566, longitude: 3.366,
    capexUsd: 24_000_000, completionPct: 70, timeline: "2024-2026",
    funder: "FGN / Siemens Energy", notes: "Mobile substation reinforcing Ikeja metro." },
  { name: "PPI Phase 1 — Omouaran Mobile (Kwara)", category: "TRANSMISSION", status: "Implementation", latitude:  8.150, longitude: 4.835,
    capexUsd: 24_000_000, completionPct: 55, timeline: "2024-2026",
    funder: "FGN / Siemens Energy", notes: "Mobile substation for north central distribution." },
  { name: "PPI Phase 1 — Ojo Mobile (Lagos)",     category: "TRANSMISSION", status: "Implementation", latitude:  6.460, longitude: 3.169,
    capexUsd: 24_000_000, completionPct: 70, timeline: "2024-2026",
    funder: "FGN / Siemens Energy", notes: "Mobile substation for Lagos south-western corridor." },
  { name: "PPI Phase 1 — Amukpe Mobile (Delta)",  category: "TRANSMISSION", status: "Implementation", latitude:  5.920, longitude: 5.650,
    capexUsd: 24_000_000, completionPct: 60, timeline: "2024-2026",
    funder: "FGN / Siemens Energy", notes: "Mobile substation reinforcing Sapele-Amukpe corridor." },
  { name: "PPI Phase 1 — Ihovbor Mobile (Edo)",   category: "TRANSMISSION", status: "Implementation", latitude:  6.420, longitude: 5.760,
    capexUsd: 24_000_000, completionPct: 60, timeline: "2024-2026",
    funder: "FGN / Siemens Energy", notes: "Mobile substation at Ihovbor NIPP injection node." },
  { name: "PPI Phase 1 — Potiskum Mobile (Yobe)", category: "TRANSMISSION", status: "Implementation", latitude: 11.713, longitude: 11.072,
    capexUsd: 24_000_000, completionPct: 55, timeline: "2024-2026",
    funder: "FGN / Siemens Energy", notes: "Mobile substation reinforcing north-eastern distribution." },
  { name: "PPI Phase 1 — Birnin Kebbi Mobile",    category: "TRANSMISSION", status: "Implementation", latitude: 12.450, longitude: 4.200,
    capexUsd: 24_000_000, completionPct: 55, timeline: "2024-2026",
    funder: "FGN / Siemens Energy", notes: "Mobile substation reinforcing Sokoto-Kebbi corridor." },
];

// Plus additional flagships — Qua Iboe and Afam III — referenced in the spec
// but missing from the existing 16-record set.
const FLAGSHIP_GAPS: ProjectSeed[] = [
  { name: "Qua Iboe Power Plant",                 category: "GENERATION",   status: "Construction", latitude:  4.580, longitude: 7.970,
    capexUsd: 1_300_000_000, completionPct: 35, timeline: "2024-2027",
    funder: "ExxonMobil / NCDMB", notes: "540 MW gas-fired plant on the Qua Iboe terminal complex; gas sourced from Mobil JV." },
  { name: "Afam III Fast Power (Afam VI Stage 2)", category: "GENERATION", status: "Construction", latitude:  4.926, longitude: 7.122,
    capexUsd: 750_000_000, completionPct: 50, timeline: "2023-2026",
    funder: "Shell / TAQA / FGN", notes: "Afam III fast-power addition adjacent to the existing Afam complex; ~240 MW first phase." },
];

const NEW_PROJECTS: ProjectSeed[] = [...PPI_PHASE_1_SITES, ...FLAGSHIP_GAPS];

async function main() {
  console.log("🚧 Patch 04 — CapitalProject geometries + missing flagships");

  // 1. Populate geometry on existing records from lat/lng.
  const existing = await prisma.capitalProject.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, latitude: true, longitude: true, geometry: true },
  });
  let geomUpdated = 0;
  for (const p of existing) {
    if (p.geometry != null) continue;
    if (p.latitude == null || p.longitude == null) continue;
    const geometry = { type: "Point", coordinates: [Number(p.longitude), Number(p.latitude)] };
    await prisma.capitalProject.update({ where: { id: p.id }, data: { geometry: geometry as any } });
    geomUpdated += 1;
  }
  console.log(`  ✓ geometry updated for ${geomUpdated} existing projects`);

  // 2. Upsert the new PPI Phase 1 sites + flagship gaps.
  let created = 0;
  let updated = 0;
  for (const p of NEW_PROJECTS) {
    const geometry = { type: "Point", coordinates: [p.longitude, p.latitude] };
    const data = {
      category: p.category,
      status: p.status,
      latitude: p.latitude,
      longitude: p.longitude,
      geometry: geometry as any,
      capexUsd: p.capexUsd ?? null,
      completionPct: p.completionPct ?? null,
      timeline: p.timeline ?? null,
      funder: p.funder ?? null,
      notes: p.notes ?? null,
    };
    const existingRow = await prisma.capitalProject.findFirst({ where: { name: p.name, deletedAt: null } });
    if (existingRow) {
      await prisma.capitalProject.update({ where: { id: existingRow.id }, data });
      updated += 1;
      console.log(`  ✓ updated ${p.name}`);
    } else {
      await prisma.capitalProject.create({ data: { name: p.name, ...data } });
      created += 1;
      console.log(`  ✓ created ${p.name}`);
    }
  }
  console.log(`\nDone — ${geomUpdated} geom backfilled, ${created} created, ${updated} updated`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
