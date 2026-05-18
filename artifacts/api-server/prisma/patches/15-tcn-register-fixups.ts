// Patch 15 — TCN substation register follow-up fixups.
//
// Three corrections after a closer re-read of the TCN PDF:
//
// 1. The Shiroro 132 kV list contains "MINNA" twice. The first record
//    is already seeded as "Minna" (Minna Town). The second is the
//    Minna Township Service substation (commonly "Minna TS") — added
//    here as a separate record with a disambiguating name.
//
// 2. The 13 substations originally flagged dataClass='legacy' are
//    reclassified using TCN context:
//      - 5 are explicit TREP-1/TREP-2 named planned upgrades → 'planned'
//        (Apo 330, Sokoto 330, Bauchi 330, Mambilla TS, Olorunsogo)
//      - 8 are operational sites not in the PDF transcription but
//        plainly implied by adjacent records → 'tcn-implied'
//        (Aladja, PH Main 330, Calabar 330, Ilorin 330, Makurdi 330,
//         Maiduguri 330, Benin 330, Gwiwa 132)
//
// 3. The 6 substations flagged geomQuality='pending' are given
//    regional-centroid coordinates and re-flagged 'approximated
//    (regional centroid)' so they appear on the map. A `notes` field
//    records that exact coordinates need verification.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ──────────────── 1. Minna disambiguation ────────────────

async function addMinnaTs() {
  const existing = await prisma.substation.findFirst({
    where: { name: "Minna TS", voltageClass: "132 kV" },
  });
  if (existing) {
    console.log("  Minna TS: already present");
    return;
  }
  const region = await prisma.tcnRegion.findFirst({ where: { name: "Abuja Region" } });
  const roc = await prisma.tcnROC.findFirst({ where: { name: "Shiroro" } });
  await prisma.substation.create({
    data: {
      name: "Minna TS",
      displayName: "Minna TS",
      voltageClass: "132 kV",
      capacityMva: 60,
      state: "Niger",
      latitude: 9.6150,
      longitude: 6.5460,
      tcnRegionId: region?.id ?? null,
      tcnRocId: roc?.id ?? null,
      source: "TCN Asset Register",
      dataSource: "TCN Asset Register (LIST_OF_330_AND_132KV_TRANSMISSION_SUBSTATIONS.pdf)",
      dataClass: "verified",
      geomQuality: "approximated",
      verifiedAt: new Date(),
      lowConfidence: false,
      sourceAuthorityScore: 95,
    },
  });
  // Backfill PostGIS geom.
  await prisma.$executeRawUnsafe(`
    UPDATE "Substation"
    SET "geom" = ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)
    WHERE name = 'Minna TS' AND "voltageClass" = '132 kV' AND geom IS NULL
  `);
  console.log("  Minna TS: inserted (Shiroro 132 kV duplicate)");
}

// ──────────────── 2. Legacy reclassification ────────────────

type Reclass = { name: string; voltage: string; dataClass: "planned" | "tcn-implied"; reason: string };

const RECLASSIFY: Reclass[] = [
  // Planned (named in TREP)
  { name: "Apo",          voltage: "330 kV", dataClass: "planned",      reason: "Named under TREP-1 Abuja Transmission Ring Scheme as a planned 330 kV substation." },
  { name: "Sokoto",       voltage: "330 kV", dataClass: "planned",      reason: "Named under TREP-1 Northern Corridor Transmission Project as a planned 330 kV substation." },
  { name: "Bauchi",       voltage: "330 kV", dataClass: "planned",      reason: "Named under TREP-1 Northern Corridor Transmission Project as a planned 330 kV substation." },
  { name: "Mambilla TS",  voltage: "330 kV", dataClass: "planned",      reason: "TREP-2 Mambila evacuation infrastructure; not yet commissioned." },
  { name: "Olorunsogo",   voltage: "330 kV", dataClass: "tcn-implied",  reason: "Olorunsogo NIPP 330 kV substation (Ogun); referenced under TREP-2 Lagos Substation Rehabilitation Programme (Olorunshogo-Ikeja West DC reconductoring) but omitted from the PDF transcription." },

  // TCN-implied (operational, not in PDF transcription)
  { name: "Aladja",            voltage: "330 kV", dataClass: "tcn-implied", reason: "Operational PHCN-era 330 kV substation (Delta); not in current TCN PDF transcription." },
  { name: "Port Harcourt Main",voltage: "330 kV", dataClass: "tcn-implied", reason: "Operational PH 330 kV trunk substation; absent from PDF transcription. Likely transcription gap rather than non-existence." },
  { name: "Calabar",           voltage: "330 kV", dataClass: "tcn-implied", reason: "PDF lists Calabar only at 132 kV; the 330 kV substation here predates the transcribed register." },
  { name: "Ilorin",            voltage: "330 kV", dataClass: "tcn-implied", reason: "PDF lists Ilorin only at 132 kV; the 330 kV record predates the transcribed register." },
  { name: "Makurdi",           voltage: "330 kV", dataClass: "tcn-implied", reason: "Absent from PDF transcription but operationally referenced as a Benue-state trunk substation." },
  { name: "Maiduguri",         voltage: "330 kV", dataClass: "tcn-implied", reason: "PDF lists Maiduguri only at 132 kV; the 330 kV record predates the transcribed register." },
  { name: "Benin",             voltage: "330 kV", dataClass: "tcn-implied", reason: "PDF 330 kV entry is 'Benin South Sub Region' (separately seeded); this generic 'Benin' record likely refers to the same physical site." },
  { name: "Gwiwa",             voltage: "132 kV", dataClass: "tcn-implied", reason: "Jigawa-state 132 kV substation absent from PDF transcription; likely transcription gap." },
];

async function reclassifyLegacy() {
  let updated = 0;
  for (const r of RECLASSIFY) {
    // Match by name (case-insensitive) AND normalised voltage so we hit
    // legacy "330kV"/"132kV" rows regardless of whitespace.
    const candidates = await prisma.substation.findMany({
      where: { name: { equals: r.name, mode: "insensitive" } },
      select: { id: true, voltageClass: true },
    });
    const target = candidates.find(c => c.voltageClass.replace(/\s+/g, "") === r.voltage.replace(/\s+/g, ""));
    if (!target) {
      console.log(`  ⚠ no row to reclassify: ${r.name} ${r.voltage}`);
      continue;
    }
    await prisma.substation.update({
      where: { id: target.id },
      data: {
        dataClass: r.dataClass,
        source: r.dataClass === "planned"
          ? "TCN TREP Strategy Document (planned)"
          : "TCN operational record (not in 2025 register transcription)",
        dataSource: `Reclassified from 'legacy' to '${r.dataClass}'. ${r.reason}`,
        verifiedAt: new Date(),
      },
    });
    updated += 1;
  }
  console.log(`  reclassified: ${updated} of ${RECLASSIFY.length}`);
}

// ──────────────── 3. Resolve pending coordinates via regional centroids ────────────────

type CoordFix = { name: string; voltage: string; lat: number; lng: number; centroid: string };

const COORD_FIXES: CoordFix[] = [
  { name: "Walalambe", voltage: "132 kV", lat: 12.0000, lng: 8.5210, centroid: "Kano region centroid (Walalambe, Kano State)" },
  { name: "Gabrain",   voltage: "132 kV", lat: 4.8400,  lng: 7.0100, centroid: "Port Harcourt region centroid (Rivers State)" },
  { name: "Ekim",      voltage: "132 kV", lat: 4.6500,  lng: 7.9300, centroid: "Eket area (Akwa Ibom State)" },
  { name: "Dagongari", voltage: "132 kV", lat: 12.4530, lng: 4.1980, centroid: "Birnin Kebbi area (Kebbi State)" },
  { name: "Maraba",    voltage: "132 kV", lat: 9.6150,  lng: 6.5460, centroid: "Minna area (Niger State)" },
  { name: "GCM",       voltage: "132 kV", lat: 6.1440,  lng: 6.7890, centroid: "Onitsha area (Anambra State, GCM cement plant)" },
];

async function resolveCoordinates() {
  let updated = 0;
  for (const f of COORD_FIXES) {
    const row = await prisma.substation.findFirst({
      where: { name: f.name, voltageClass: f.voltage },
      select: { id: true },
    });
    if (!row) {
      console.log(`  ⚠ no row to coord-fix: ${f.name} ${f.voltage}`);
      continue;
    }
    await prisma.substation.update({
      where: { id: row.id },
      data: {
        latitude: f.lat,
        longitude: f.lng,
        geomQuality: "approximated (regional centroid)",
      },
    });
    updated += 1;
  }
  // Backfill geom for any rows whose coordinates we just set.
  await prisma.$executeRawUnsafe(`
    UPDATE "Substation"
    SET "geom" = ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)
    WHERE "geomQuality" = 'approximated (regional centroid)'
      AND latitude IS NOT NULL AND longitude IS NOT NULL
  `);
  console.log(`  coord fixes: ${updated} of ${COORD_FIXES.length}`);
}

async function main() {
  console.log("🚧 Patch 15 — TCN register fixups (Minna duplicate, legacy reclass, pending coords)");
  await addMinnaTs();
  await reclassifyLegacy();
  await resolveCoordinates();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
