// Step 3 / Priority C2 — populate gas-pipeline diversion opportunities
// from stranded / constrained / out-of-service plants to nearby trunk
// gas pipelines.  Each gets a tap point and a LineString geometry from
// the tap point to the plant for the map's diversion overlay.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type Diversion = {
  plantName: string;
  tapPoint: string;
  tapLatitude: number;
  tapLongitude: number;
  lengthKm: number;
  capacityRequired: number;
  indicativeCapex: number;
  priority: number;
  note: string;
};

const DIVERSIONS: Diversion[] = [
  {
    plantName: "Alaoji NIPP",
    tapPoint: "Calabar Spur @ Aba",
    tapLatitude:  5.12, tapLongitude: 7.36,
    lengthKm: 12, capacityRequired: 120, indicativeCapex: 18_000_000, priority: 1,
    note: "Short tie-in from Calabar Spur (Aba) to Alaoji NIPP — recover ~500 MW.",
  },
  {
    plantName: "Omoku Power",
    tapPoint: "OB3 @ Obiafu",
    tapLatitude:  5.36, tapLongitude: 6.69,
    lengthKm: 35, capacityRequired: 80, indicativeCapex: 42_000_000, priority: 1,
    note: "OB3 tap at Obiafu to Omoku Power Plant — recover ~225 MW stranded capacity.",
  },
  {
    plantName: "Sapele NIPP",
    tapPoint: "OB3 @ Oben",
    tapLatitude:  6.39, tapLongitude: 5.78,
    lengthKm: 65, capacityRequired: 220, indicativeCapex: 95_000_000, priority: 2,
    note: "OB3 tap from Oben to Sapele NIPP — unlock 450 MW constrained capacity.",
  },
  {
    plantName: "Sapele Steam",
    tapPoint: "OB3 @ Oben",
    tapLatitude:  6.39, tapLongitude: 5.78,
    lengthKm: 65, capacityRequired: 180, indicativeCapex: 90_000_000, priority: 3,
    note: "Shared Oben-Sapele corridor; co-built with Sapele NIPP diversion.",
  },
  {
    plantName: "Olorunsogo NIPP",
    tapPoint: "AKK @ Abuja takeoff (planned)",
    tapLatitude:  7.13, tapLongitude: 3.45,
    lengthKm: 8, capacityRequired: 280, indicativeCapex: 14_000_000, priority: 1,
    note: "Reinforced ELPS feed; current Itoki spur is undersized at 120 Mmscfd.",
  },
  {
    plantName: "Gbarain NIPP",
    tapPoint: "Bonny-Soku-Obiafu @ Gbarain",
    tapLatitude:  4.96, tapLongitude: 6.30,
    lengthKm: 6, capacityRequired: 100, indicativeCapex: 9_000_000, priority: 2,
    note: "In-field tap from Bonny-Soku-Obiafu connector — 225 MW.",
  },
  {
    plantName: "Omotosho NIPP",
    tapPoint: "ELPS @ Itoki",
    tapLatitude:  6.85, tapLongitude: 3.42,
    lengthKm: 75, capacityRequired: 180, indicativeCapex: 110_000_000, priority: 3,
    note: "Long ELPS extension to Omotosho cluster; capex high; recovers ~250 MW.",
  },
  {
    plantName: "Afam IV-V",
    tapPoint: "Bonny-Soku-Obiafu @ Soku",
    tapLatitude:  4.71, tapLongitude: 6.66,
    lengthKm: 55, capacityRequired: 150, indicativeCapex: 60_000_000, priority: 2,
    note: "Backfill Afam IV/V from Soku gas processing complex.",
  },
];

async function main() {
  console.log("🚧 Patch 09 — Diversion opportunities");

  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const d of DIVERSIONS) {
    const plant = await prisma.plant.findFirst({
      where: { name: d.plantName, deletedAt: null },
      select: { id: true, latitude: true, longitude: true },
    });
    if (!plant || !plant.latitude || !plant.longitude) {
      console.log(`  ⚠ skip ${d.plantName} — plant missing or no coords`);
      skipped += 1;
      continue;
    }
    const geometry = {
      type: "LineString",
      coordinates: [
        [d.tapLongitude, d.tapLatitude],
        [Number(plant.longitude), Number(plant.latitude)],
      ],
    };
    const data = {
      tapPoint: d.tapPoint,
      tapLatitude: d.tapLatitude,
      tapLongitude: d.tapLongitude,
      lengthKm: d.lengthKm,
      capacityRequired: d.capacityRequired,
      indicativeCapex: d.indicativeCapex,
      priority: d.priority,
      note: d.note,
      geometry: geometry as any,
    };
    const existing = await prisma.diversionOpportunity.findFirst({
      where: { plantId: plant.id, tapPoint: d.tapPoint, deletedAt: null },
    });
    if (existing) {
      await prisma.diversionOpportunity.update({ where: { id: existing.id }, data });
      updated += 1;
      console.log(`  ✓ updated ${d.plantName.padEnd(20)} ← ${d.tapPoint}`);
    } else {
      await prisma.diversionOpportunity.create({ data: { plantId: plant.id, ...data } });
      created += 1;
      console.log(`  ✓ created ${d.plantName.padEnd(20)} ← ${d.tapPoint}`);
    }
  }
  console.log(`\nDone — ${created} created, ${updated} updated, ${skipped} skipped`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
