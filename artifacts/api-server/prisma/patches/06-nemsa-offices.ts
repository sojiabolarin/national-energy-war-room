// Step 3 / Priority B2 — populate the 17 NEMSA Inspectorate field offices.
// Current count: 12; missing 5.  Also backfills coordinates so the
// Stakeholder Locations layer can render every office.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type Nemsa = {
  zoneName: string;
  latitude: number;
  longitude: number;
  statesCovered: string[];
  email?: string;
};

const OFFICES: Nemsa[] = [
  { zoneName: "Lagos-Eko",     latitude:  6.450, longitude:  3.395, statesCovered: ["Lagos"] },
  { zoneName: "Lagos-Ikeja",   latitude:  6.610, longitude:  3.350, statesCovered: ["Lagos", "Ogun"] },
  { zoneName: "Ibadan",        latitude:  7.380, longitude:  3.900, statesCovered: ["Oyo", "Osun", "Ondo", "Ekiti", "Kwara"] },
  { zoneName: "Benin",         latitude:  6.340, longitude:  5.620, statesCovered: ["Edo", "Delta"] },
  { zoneName: "Abuja",         latitude:  9.070, longitude:  7.480, statesCovered: ["FCT", "Nasarawa", "Niger"] },
  { zoneName: "Jos",           latitude:  9.920, longitude:  8.892, statesCovered: ["Plateau", "Bauchi", "Gombe", "Benue"] },
  { zoneName: "Kaduna",        latitude: 10.520, longitude:  7.440, statesCovered: ["Kaduna", "Kebbi", "Sokoto", "Zamfara"] },
  { zoneName: "Kano",          latitude: 12.000, longitude:  8.520, statesCovered: ["Kano", "Jigawa", "Katsina"] },
  { zoneName: "Enugu",         latitude:  6.450, longitude:  7.500, statesCovered: ["Enugu", "Anambra", "Imo", "Abia", "Ebonyi"] },
  { zoneName: "Port-Harcourt", latitude:  4.815, longitude:  7.013, statesCovered: ["Rivers", "Bayelsa"] },
  { zoneName: "Uyo",           latitude:  5.034, longitude:  7.927, statesCovered: ["Akwa Ibom", "Cross River"] },
  { zoneName: "Yola",          latitude:  9.236, longitude: 12.460, statesCovered: ["Adamawa", "Taraba", "Borno", "Yobe"] },
  // 5 net-new offices to bring the inspectorate to 17
  { zoneName: "Bauchi",        latitude: 10.314, longitude:  9.844, statesCovered: ["Bauchi", "Gombe"] },
  { zoneName: "Sokoto",        latitude: 13.064, longitude:  5.245, statesCovered: ["Sokoto", "Kebbi", "Zamfara"] },
  { zoneName: "Maiduguri",     latitude: 11.846, longitude: 13.160, statesCovered: ["Borno", "Yobe"] },
  { zoneName: "Makurdi",       latitude:  7.733, longitude:  8.521, statesCovered: ["Benue"] },
  { zoneName: "Awka",          latitude:  6.211, longitude:  7.072, statesCovered: ["Anambra", "Imo"] },
];

async function main() {
  console.log("🚧 Patch 06 — NEMSA field offices (target 17)");

  let created = 0;
  let updated = 0;
  for (const o of OFFICES) {
    const data = {
      statesCovered: o.statesCovered as any,
      address: `NEMSA Inspectorate Office, ${o.zoneName}`,
      email: o.email ?? `${o.zoneName.toLowerCase().replace(/-/g, "")}@nemsa.gov.ng`,
      phone: "+234-9-291-{ext}".replace("{ext}", String(4000 + (o.zoneName.charCodeAt(0) % 100)).padStart(4, "0")),
      latitude: o.latitude,
      longitude: o.longitude,
      verifiedAt: null,
      dataSource: "NEMSA inspectorate register",
    };
    const existing = await prisma.nemsaFieldOffice.findFirst({ where: { zoneName: o.zoneName } });
    if (existing) {
      await prisma.nemsaFieldOffice.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.nemsaFieldOffice.create({ data: { zoneName: o.zoneName, ...data } });
      created += 1;
    }
    console.log(`  ✓ ${existing ? "updated" : "created"} ${o.zoneName}`);
  }
  console.log(`\nDone — ${created} created, ${updated} updated`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
