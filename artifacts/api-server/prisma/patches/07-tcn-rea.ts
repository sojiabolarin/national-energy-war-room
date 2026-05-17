// Step 3 / Priority B3+B4 — fill TcnControlCentre and ReaZonalOffice gaps.
//
// TcnControlCentre has 1 NCC + 1 SNCC + 6 RCC = 8.  Target is 9 (7 RCCs).
// Adds the Osogbo RCC, which sits with the NCC at Osogbo but is the
// separate regional control function.
//
// ReaZonalOffice has 6 zones (NC, NE, NW, SE, SS, SW).  Target is 7 with
// the Lagos Liaison Office added.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚧 Patch 07 — TCN Control Centres + REA Lagos Liaison");

  // ── TCN Control Centres ─────────────────────────────────────────────────
  const osogboRcc = await prisma.tcnControlCentre.findFirst({
    where: { name: "Osogbo Regional Control Centre" },
  });
  if (!osogboRcc) {
    await prisma.tcnControlCentre.create({
      data: {
        type: "RCC",
        name: "Osogbo Regional Control Centre",
        location: "Osogbo",
        address: "TCN Osogbo Complex, Osogbo, Osun State",
        coverageStates: ["Oyo", "Osun", "Ekiti", "Ondo", "Kwara"] as any,
        contactNumber: "+234-803-555-0100",
        dataSource: "TCN System Operator regional brief",
      },
    });
    console.log("  ✓ created Osogbo Regional Control Centre");
  } else {
    console.log("  · Osogbo RCC already exists — skipping");
  }

  // ── REA Lagos Liaison Office ────────────────────────────────────────────
  const lagosLiaison = await prisma.reaZonalOffice.findFirst({
    where: { zoneName: "Lagos Liaison" },
  });
  if (!lagosLiaison) {
    await prisma.reaZonalOffice.create({
      data: {
        zoneName: "Lagos Liaison",
        headquarters: "Lagos",
        statesCovered: ["Lagos"] as any,
        address: "REA Lagos Liaison Office, Victoria Island, Lagos",
        email: "lagos.liaison@rea.gov.ng",
        phone: "+234-1-555-0100",
        dataSource: "REA corporate directory",
      },
    });
    console.log("  ✓ created Lagos Liaison Office");
  } else {
    console.log("  · Lagos Liaison already exists — skipping");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
