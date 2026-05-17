// Step 3 / Priority A1 — populate DisCo franchise polygons.
//
// The DisCo ATC&C Heat Layer toggle is on but no polygons render because
// `territoryGeom` is null for all 11 DisCos.  This patch writes a GeoJSON
// Polygon (or MultiPolygon, where the licence area is non-contiguous) per
// DisCo, approximated from state bounding rectangles unioned together.
//
// `geomQuality` is set to 'approximate' so the admin UI can flag these for
// refinement when proper LGA-level boundary data is loaded later.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// State bounding rectangles (lon-min, lat-min, lon-max, lat-max) drawn to
// roughly cover each state's published boundary.  Approximate — good enough
// for the choropleth heat layer at country zoom.
type Box = [number, number, number, number];

const STATE: Record<string, Box> = {
  // Lagos — split into south and north of the Lagos lagoon for Eko vs Ikeja
  "Lagos-South":     [2.70, 6.35, 4.30, 6.50],   // Badagry → Lekki coastal strip
  "Lagos-North":     [2.85, 6.50, 4.40, 6.85],   // Ikorodu / Epe / Ikeja inland
  Ogun:              [2.65, 6.40, 4.45, 7.95],
  Oyo:               [2.85, 7.05, 4.50, 9.20],
  Osun:              [4.00, 7.05, 5.20, 8.20],
  Ondo:              [4.30, 5.85, 6.05, 7.85],
  Ekiti:             [4.70, 7.30, 5.85, 8.10],
  Kwara:             [2.70, 7.85, 6.20, 9.45],
  Edo:               [5.05, 5.85, 6.70, 7.65],
  Delta:             [4.95, 5.05, 6.80, 6.55],
  Bayelsa:           [5.10, 4.10, 6.85, 5.50],
  Rivers:            [6.30, 4.30, 7.85, 5.65],
  "Rivers-no-Aba":   [6.30, 4.30, 7.20, 5.65],   // PHED area, excludes the Aba ringfence
  CrossRiver:        [7.65, 4.50, 9.50, 7.05],
  AkwaIbom:          [7.30, 4.30, 8.45, 5.55],
  Abia:              [7.10, 4.85, 8.05, 6.10],
  Imo:               [6.60, 5.10, 7.55, 6.20],
  Anambra:           [6.55, 5.65, 7.40, 6.95],
  Enugu:             [6.95, 5.85, 7.90, 7.10],
  Ebonyi:            [7.60, 5.85, 8.55, 6.95],
  // Middle belt / north central
  Kogi:              [5.60, 6.45, 8.10, 8.90],
  Niger:             [3.45, 8.00, 7.95, 11.45],
  Nasarawa:          [7.10, 7.65, 9.80, 9.45],
  Benue:             [7.40, 6.40, 10.10, 8.20],
  Plateau:           [8.35, 8.10, 10.50, 10.30],
  FCT:               [6.85, 8.45, 7.85, 9.40],
  // North west
  Kaduna:            [6.45, 9.05, 8.95, 11.50],
  Kano:              [7.65, 10.50, 9.55, 12.65],
  Katsina:           [6.80, 11.10, 9.05, 13.45],
  Jigawa:            [8.05, 11.40, 10.85, 13.10],
  Sokoto:            [3.95, 11.85, 6.65, 13.85],
  Kebbi:             [3.50, 10.10, 5.75, 12.95],
  Zamfara:           [4.85, 11.05, 7.50, 13.45],
  // North east
  Bauchi:            [8.65, 9.40, 11.05, 12.30],
  Gombe:             [9.85, 9.60, 11.95, 11.20],
  Yobe:              [10.40, 10.45, 13.30, 13.35],
  Borno:             [10.95, 9.85, 14.65, 13.90],
  Adamawa:           [11.10, 7.40, 13.95, 11.20],
  Taraba:            [9.10, 6.50, 12.20, 9.55],
};

function boxPolygon(b: Box): [number, number][] {
  const [lonMin, latMin, lonMax, latMax] = b;
  return [
    [lonMin, latMin],
    [lonMax, latMin],
    [lonMax, latMax],
    [lonMin, latMax],
    [lonMin, latMin],
  ];
}

// Returns a GeoJSON Polygon (single state) or MultiPolygon (multiple states)
function unionGeom(boxes: Box[]) {
  const rings = boxes.map(b => [boxPolygon(b)]);
  if (rings.length === 1) return { type: "Polygon", coordinates: rings[0] } as const;
  return { type: "MultiPolygon", coordinates: rings } as const;
}

type DiscoCoverage = { name: string; states: (keyof typeof STATE)[] };

const COVERAGE: DiscoCoverage[] = [
  { name: "Eko",            states: ["Lagos-South"] },
  { name: "Ikeja",          states: ["Lagos-North"] },
  { name: "Abuja",          states: ["FCT", "Niger", "Kogi", "Nasarawa"] },
  { name: "Ibadan",         states: ["Oyo", "Osun", "Ogun", "Kwara"] },
  { name: "Benin",          states: ["Edo", "Delta", "Ondo", "Ekiti"] },
  { name: "Enugu",          states: ["Enugu", "Anambra", "Imo", "Abia", "Ebonyi"] },
  { name: "Port Harcourt",  states: ["Rivers-no-Aba", "Bayelsa", "CrossRiver", "AkwaIbom"] },
  { name: "Jos",            states: ["Plateau", "Bauchi", "Gombe", "Benue"] },
  { name: "Kano",           states: ["Kano", "Katsina", "Jigawa"] },
  { name: "Kaduna",         states: ["Kaduna", "Kebbi", "Sokoto", "Zamfara"] },
  { name: "Yola",           states: ["Adamawa", "Borno", "Taraba", "Yobe"] },
];

async function main() {
  console.log("🚧 Patch 02 — DisCo territory polygons");
  let updated = 0;
  for (const c of COVERAGE) {
    const geom = unionGeom(c.states.map(s => STATE[s]));
    const existing = await prisma.disCo.findFirst({ where: { name: c.name, deletedAt: null } });
    if (!existing) {
      console.log(`  ⚠ skip   ${c.name} — no DisCo record found`);
      continue;
    }
    await prisma.disCo.update({
      where: { id: existing.id },
      data: { territoryGeom: geom as any, geomQuality: "approximate" },
    });
    const ringCount = c.states.length;
    console.log(`  ✓ updated ${c.name.padEnd(16)} ${ringCount} state${ringCount === 1 ? "" : "s"}`);
    updated += 1;
  }
  console.log(`\nDone — ${updated} DisCos updated`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
