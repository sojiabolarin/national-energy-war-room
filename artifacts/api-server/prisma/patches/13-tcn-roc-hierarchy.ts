// Patch 13 — TCN organisational structure (2024 SO chart).
//
// Source: SOstructure.jpg, TCN-published organisational chart.
//
// Changes the TcnControlCentre roster from the 2018 FMP handbook
// (7 RCCs) to the TCN-published 2024 hierarchy (3 RCCs: Benin, Ikeja
// West, Shiroro). Obsolete RCCs are soft-deprecated (deprecatedAt set,
// notes recorded), not deleted, so historical references are preserved.
//
// Seeds 8 ROCs (Regional Operations Coordinating Units) under the 3
// surviving RCCs, then backfills Substation.tcnRocId from each
// substation's TcnRegion.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TCN_SOURCE = "TCN System Operator 2024 SO chart (SOstructure.jpg)";

// ──────────────── Control centre roster ────────────────

type CCSpec = {
  legacyName?: string;   // existing row to rename
  name: string;
  type: "NCC" | "SNCC" | "RCC";
  location: string;
  lat: number;
  lng: number;
  address?: string;
};

const ACTIVE_CCS: CCSpec[] = [
  {
    legacyName: "National Control Centre",
    name: "NCC Osogbo",
    type: "NCC",
    location: "Osogbo",
    lat: 7.7780,
    lng: 4.5570,
    address: "TCN National Control Centre, Osogbo, Osun State",
  },
  {
    legacyName: "Supplementary National Control Centre",
    name: "SNCC Shiroro",
    type: "SNCC",
    location: "Shiroro",
    lat: 9.9710,
    lng: 6.8350,
    address: "TCN Supplementary NCC, Shiroro, Niger State",
  },
  {
    legacyName: "Benin Regional Control Centre",
    name: "RCC Benin",
    type: "RCC",
    location: "Benin City",
    lat: 6.3360,
    lng: 5.6170,
  },
  {
    legacyName: "Lagos Regional Control Centre",
    name: "RCC Ikeja West",
    type: "RCC",
    location: "Ikeja West",
    lat: 6.6250,
    lng: 3.3050,
  },
  {
    name: "RCC Shiroro",
    type: "RCC",
    location: "Shiroro",
    lat: 9.9710,
    lng: 6.8350,
  },
];

const DEPRECATE_NAMES = [
  "Bauchi Regional Control Centre",
  "Enugu Regional Control Centre",
  "Kaduna Regional Control Centre",
  "Osogbo Regional Control Centre",
  "Port Harcourt Regional Control Centre",
];

// ──────────────── ROCs ────────────────

type ROCSpec = {
  name: string;
  parentRcc: "RCC Benin" | "RCC Ikeja West" | "RCC Shiroro";
  lat: number;
  lng: number;
  states: string[];
  address?: string;
};

const ROCS: ROCSpec[] = [
  { name: "Lagos",         parentRcc: "RCC Ikeja West", lat: 6.4500, lng: 3.4000, states: ["Lagos", "Ogun (south)"] },
  { name: "Osogbo",        parentRcc: "RCC Ikeja West", lat: 7.7780, lng: 4.5570, states: ["Osun", "Oyo", "Kwara", "Ondo", "Ekiti"] },
  { name: "Benin",         parentRcc: "RCC Benin",      lat: 6.3360, lng: 5.6170, states: ["Edo", "Delta", "Kogi (south)"] },
  { name: "Enugu",         parentRcc: "RCC Benin",      lat: 6.4440, lng: 7.5040, states: ["Enugu", "Anambra", "Ebonyi", "Abia", "Imo", "Benue"] },
  { name: "Port Harcourt", parentRcc: "RCC Benin",      lat: 4.8400, lng: 7.0100, states: ["Rivers", "Bayelsa", "Cross River", "Akwa Ibom"] },
  { name: "Shiroro",       parentRcc: "RCC Shiroro",    lat: 9.9710, lng: 6.8350, states: ["Niger", "Kebbi", "Sokoto", "Zamfara", "FCT (west)"] },
  { name: "Kaduna",        parentRcc: "RCC Shiroro",    lat: 10.5230, lng: 7.4380, states: ["Kaduna", "Kano", "Jigawa", "Katsina"] },
  { name: "Bauchi",        parentRcc: "RCC Shiroro",    lat: 10.3140, lng: 9.8430, states: ["Bauchi", "Gombe", "Plateau", "Taraba", "Adamawa", "Borno", "Yobe"] },
];

// Map: DB TcnRegion.name → ROC name (the substation ROC backfill key).
// Per the 2024 chart, the 8 ROCs subsume the 12 legacy regions:
//   Lagos Region → Lagos
//   Osogbo Region → Osogbo
//   Benin Region → Benin
//   Enugu Region → Enugu
//   Port Harcourt Region → Port Harcourt
//   Abuja Region → Shiroro (FCT/Niger covered by Shiroro ROC in 2024 chart;
//                            no separate Abuja ROC in the SO structure)
//   Kaduna Region → Kaduna
//   Kano Region → Kaduna (Kano/Jigawa/Katsina)
//   Bauchi Region → Bauchi
//   Jos Region → Bauchi (Plateau)
//   Yola Region → Bauchi (Adamawa/Taraba)
//   Makurdi Region → Enugu (Benue per Enugu ROC coverage)
const REGION_TO_ROC: Record<string, string> = {
  "Lagos Region":         "Lagos",
  "Osogbo Region":        "Osogbo",
  "Benin Region":         "Benin",
  "Enugu Region":         "Enugu",
  "Port Harcourt Region": "Port Harcourt",
  "Abuja Region":         "Shiroro",
  "Kaduna Region":        "Kaduna",
  "Kano Region":          "Kaduna",
  "Bauchi Region":        "Bauchi",
  "Jos Region":           "Bauchi",
  "Yola Region":          "Bauchi",
  "Makurdi Region":       "Enugu",
};

// ──────────────── Steps ────────────────

async function upsertControlCentres() {
  let renamed = 0, inserted = 0, deprecated = 0;

  for (const cc of ACTIVE_CCS) {
    if (cc.legacyName) {
      const existing = await prisma.tcnControlCentre.findFirst({
        where: { name: cc.legacyName },
      });
      if (existing) {
        await prisma.tcnControlCentre.update({
          where: { id: existing.id },
          data: {
            name: cc.name,
            type: cc.type,
            location: cc.location,
            address: cc.address ?? null,
            latitude: cc.lat,
            longitude: cc.lng,
            dataSource: TCN_SOURCE,
            notes: `Renamed from "${cc.legacyName}" per TCN 2024 SO chart`,
            deprecatedAt: null,
          },
        });
        renamed += 1;
        continue;
      }
      // Legacy row already renamed in a prior run — fall through to upsert by new name.
    }
    const byNewName = await prisma.tcnControlCentre.findFirst({ where: { name: cc.name } });
    if (byNewName) {
      await prisma.tcnControlCentre.update({
        where: { id: byNewName.id },
        data: {
          type: cc.type,
          location: cc.location,
          address: cc.address ?? null,
          latitude: cc.lat,
          longitude: cc.lng,
          dataSource: TCN_SOURCE,
          deprecatedAt: null,
        },
      });
      renamed += 1;
    } else {
      await prisma.tcnControlCentre.create({
        data: {
          name: cc.name,
          type: cc.type,
          location: cc.location,
          address: cc.address ?? null,
          latitude: cc.lat,
          longitude: cc.lng,
          dataSource: TCN_SOURCE,
          notes: "Added per TCN 2024 SO chart",
        },
      });
      inserted += 1;
    }
  }

  for (const name of DEPRECATE_NAMES) {
    const row = await prisma.tcnControlCentre.findFirst({ where: { name } });
    if (!row) continue;
    if (row.deprecatedAt) continue; // idempotent
    await prisma.tcnControlCentre.update({
      where: { id: row.id },
      data: {
        deprecatedAt: new Date(),
        notes: "Deprecated per TCN 2024 SO chart: 7-RCC handbook structure superseded by 3-RCC Benin/Ikeja West/Shiroro layout. Historical record retained.",
      },
    });
    deprecated += 1;
  }

  console.log(`  control centres: ${renamed} renamed/updated, ${inserted} inserted, ${deprecated} deprecated`);
}

async function seedRocs() {
  const rccs = await prisma.tcnControlCentre.findMany({
    where: { type: "RCC", deprecatedAt: null },
    select: { id: true, name: true },
  });
  const rccByName = new Map(rccs.map(r => [r.name, r.id]));

  let inserted = 0, updated = 0;
  for (const roc of ROCS) {
    const rccId = rccByName.get(roc.parentRcc);
    if (!rccId) throw new Error(`No active RCC named "${roc.parentRcc}"`);
    const existing = await prisma.tcnROC.findUnique({ where: { name: roc.name } });
    const data = {
      name: roc.name,
      rccId,
      latitude: roc.lat,
      longitude: roc.lng,
      statesCovered: roc.states,
      headquartersAddress: roc.address ?? null,
      source: TCN_SOURCE,
      dataClass: "verified",
      verifiedAt: new Date(),
    };
    if (existing) {
      await prisma.tcnROC.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.tcnROC.create({ data });
      inserted += 1;
    }
  }

  // Backfill PostGIS geom from lat/lng for all ROCs.
  await prisma.$executeRawUnsafe(`
    UPDATE "TcnROC"
    SET "geom" = ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
  `);

  console.log(`  ROCs: ${inserted} inserted, ${updated} updated`);
}

async function backfillSubstationRoc() {
  const rocs = await prisma.tcnROC.findMany({ select: { id: true, name: true } });
  const rocByName = new Map(rocs.map(r => [r.name, r.id]));

  const regions = await prisma.tcnRegion.findMany({ select: { id: true, name: true } });
  const regionById = new Map(regions.map(r => [r.id, r.name]));

  const subs = await prisma.substation.findMany({
    where: { tcnRegionId: { not: null } },
    select: { id: true, tcnRegionId: true },
  });

  let updated = 0, skipped = 0;
  const skippedRegions = new Map<string, number>();

  for (const s of subs) {
    const regionName = s.tcnRegionId ? regionById.get(s.tcnRegionId) : undefined;
    if (!regionName) { skipped += 1; continue; }
    const rocName = REGION_TO_ROC[regionName];
    if (!rocName) {
      skipped += 1;
      skippedRegions.set(regionName, (skippedRegions.get(regionName) ?? 0) + 1);
      continue;
    }
    const rocId = rocByName.get(rocName);
    if (!rocId) { skipped += 1; continue; }
    await prisma.substation.update({
      where: { id: s.id },
      data: { tcnRocId: rocId },
    });
    updated += 1;
  }

  console.log(`  substation→ROC backfill: ${updated} linked, ${skipped} unlinked`);
  if (skippedRegions.size > 0) {
    for (const [region, count] of skippedRegions) {
      console.log(`    ⚠ no ROC mapping for region "${region}": ${count} substations`);
    }
  }
}

async function main() {
  console.log("🚧 Patch 13 — TCN org structure (2024 SO chart)");
  await upsertControlCentres();
  await seedRocs();
  await backfillSubstationRoc();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
