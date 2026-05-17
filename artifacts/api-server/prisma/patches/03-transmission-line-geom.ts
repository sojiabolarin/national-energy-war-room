// Step 3 / Priority A2 — populate TransmissionLine.geometry as a simple
// LineString between the from/to substation coordinates.  The map's 330 kV
// trunk layer needs geometry to draw; the endpoints already exist, so this
// is a straight join + write.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚧 Patch 03 — TransmissionLine geometries");

  const allLines = await prisma.transmissionLine.findMany({
    where: { deletedAt: null },
    include: {
      fromSubstation: { select: { name: true, latitude: true, longitude: true } },
      toSubstation:   { select: { name: true, latitude: true, longitude: true } },
    },
  });
  const lines = allLines.filter(l => l.geometry == null);

  let updated = 0;
  let skipped = 0;
  for (const l of lines) {
    const f = l.fromSubstation;
    const t = l.toSubstation;
    if (!f?.latitude || !f?.longitude || !t?.latitude || !t?.longitude) {
      console.log(`  ⚠ skip ${l.name} — missing substation coordinates`);
      skipped += 1;
      continue;
    }
    const geometry = {
      type: "LineString",
      coordinates: [
        [Number(f.longitude), Number(f.latitude)],
        [Number(t.longitude), Number(t.latitude)],
      ],
    };
    await prisma.transmissionLine.update({
      where: { id: l.id },
      data: { geometry: geometry as any },
    });
    console.log(`  ✓ updated ${l.name.padEnd(28)} ${f.name} → ${t.name}`);
    updated += 1;
  }
  console.log(`\nDone — ${updated} updated, ${skipped} skipped`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
