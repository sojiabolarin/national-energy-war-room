import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { readFileSync } from "fs";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const V3 = JSON.parse(readFileSync("/tmp/v3_patch_data.json", "utf8"));

function esc(s: string | null | undefined): string {
  if (s == null) return "NULL";
  return `'${s.replace(/'/g, "''")}'`;
}
function escNum(n: number | null | undefined): string {
  if (n == null) return "NULL";
  return String(n);
}
function escBool(b: boolean | null | undefined): string {
  return b ? "true" : "false";
}
function escDate(s: string | null | undefined): string {
  if (!s) return "NULL";
  return `'${s}'::timestamp`;
}

async function run(label: string, sql: string) {
  await prisma.$executeRawUnsafe(sql);
  console.log(`✓ ${label}`);
}

async function main() {
  console.log("── v3 patch starting ──");

  // ── 1. PLANTS ──────────────────────────────────────────────────────────────
  for (const p of V3.plants) {
    await run(
      `Plant: ${p.name}`,
      `UPDATE "Plant" SET
        "externalId"           = CASE WHEN "externalId" IS NULL THEN ${esc(p.id)} ELSE "externalId" END,
        "displayName"          = ${esc(p.displayName)},
        "lga"                  = ${esc(p.lga)},
        "gencoType"            = ${esc(p.gencoType)},
        "constraintReason"     = ${esc(p.constraintReason)},
        "sourceAuthorityScore" = ${escNum(p.sourceAuthorityScore)},
        "lowConfidence"        = ${escBool(p.lowConfidence)},
        "dataSource"           = ${esc(p.dataSource)}
      WHERE name = ${esc(p.name)} AND "deletedAt" IS NULL`
    );
  }

  // ── 2. SUBSTATIONS ─────────────────────────────────────────────────────────
  for (const s of V3.substations) {
    await run(
      `Substation: ${s.name}`,
      `UPDATE "Substation" SET
        "externalId"           = CASE WHEN "externalId" IS NULL THEN ${esc(s.id)} ELSE "externalId" END,
        "displayName"          = ${esc(s.displayName)},
        "sourceAuthorityScore" = ${escNum(s.sourceAuthorityScore)},
        "lowConfidence"        = ${escBool(s.lowConfidence)},
        "dataSource"           = ${esc(s.dataSource)}
      WHERE name = ${esc(s.name)} AND "deletedAt" IS NULL`
    );
  }

  // ── 3. GAS PIPELINES ───────────────────────────────────────────────────────
  for (const p of V3.pipelines) {
    await run(
      `Pipeline: ${p.name}`,
      `UPDATE "GasPipeline" SET
        "externalId"           = CASE WHEN "externalId" IS NULL THEN ${esc(p.id)} ELSE "externalId" END,
        "sourceAuthorityScore" = ${escNum(p.sourceAuthorityScore)},
        "lowConfidence"        = ${escBool(p.lowConfidence)},
        "dataSource"           = ${esc(p.dataSource)}
      WHERE name = ${esc(p.name)} AND "deletedAt" IS NULL`
    );
  }

  // ── 4. CAPITAL PROJECTS ────────────────────────────────────────────────────
  for (const p of V3.projects) {
    await run(
      `Project: ${p.name}`,
      `UPDATE "CapitalProject" SET
        "externalId"           = CASE WHEN "externalId" IS NULL THEN ${esc(p.id)} ELSE "externalId" END,
        "sourceAuthorityScore" = ${escNum(p.sourceAuthorityScore)},
        "lowConfidence"        = ${escBool(p.lowConfidence)},
        "dataSource"           = ${esc(p.dataSource)}
      WHERE name = ${esc(p.name)} AND "deletedAt" IS NULL`
    );
  }

  // ── 5. MINI-GRIDS ──────────────────────────────────────────────────────────
  for (const m of V3.minigrids) {
    await run(
      `MiniGrid: ${m.name}`,
      `UPDATE "MiniGrid" SET
        "externalId"           = CASE WHEN "externalId" IS NULL THEN ${esc(m.id)} ELSE "externalId" END,
        "operatorName"         = COALESCE("operatorName", ${esc(m.operator)}),
        "funder"               = COALESCE("funder", ${esc(m.funder)}),
        "sourceAuthorityScore" = ${escNum(m.sourceAuthorityScore)},
        "lowConfidence"        = ${escBool(m.lowConfidence)},
        "dataSource"           = ${esc(m.dataSource)}
      WHERE name = ${esc(m.name)} AND "deletedAt" IS NULL`
    );
  }

  // ── 6. ORGANISATIONS ───────────────────────────────────────────────────────
  for (const o of V3.orgs) {
    await run(
      `Org: ${o.shortName}`,
      `UPDATE "Organisation" SET
        "externalId"           = CASE WHEN "externalId" IS NULL THEN ${esc(o.id)} ELSE "externalId" END,
        "shortName"            = ${esc(o.shortName)},
        "mandate"              = ${esc(o.mandate)},
        "vision"               = ${esc(o.vision)},
        "mission"              = ${esc(o.mission)},
        "establishedYear"      = ${escNum(o.establishedYear)},
        "legalBasis"           = ${esc(o.legalBasis)},
        "sourceAuthorityScore" = ${escNum(o.sourceAuthorityScore)},
        "lowConfidence"        = ${escBool(o.lowConfidence)},
        "dataSource"           = ${esc(o.dataSource)}
      WHERE name = ${esc(o.fullName)} AND "deletedAt" IS NULL`
    );
  }

  // ── 7. FORUM OFFICES (upsert by name) ─────────────────────────────────────
  for (const f of V3.forumOffices) {
    await run(
      `ForumOffice: ${f.name}`,
      `UPDATE "ForumOffice" SET
        "externalId"           = CASE WHEN "externalId" IS NULL THEN ${esc(f.id)} ELSE "externalId" END,
        "verifiedAt"           = ${escDate(f.verifiedAt)},
        "sourceAuthorityScore" = ${escNum(f.sourceAuthorityScore)},
        "lowConfidence"        = ${escBool(f.lowConfidence)},
        "dataSource"           = ${esc(f.dataSource)}
      WHERE name = ${esc(f.name)}`
    );
  }

  // ── 8. NEMSA OFFICES ───────────────────────────────────────────────────────
  for (const n of V3.nemsaOffices) {
    await run(
      `NemsaOffice: ${n.zoneName}`,
      `UPDATE "NemsaFieldOffice" SET
        "externalId"           = CASE WHEN "externalId" IS NULL THEN ${esc(n.id)} ELSE "externalId" END,
        "verifiedAt"           = ${escDate(n.verifiedAt)},
        "sourceAuthorityScore" = ${escNum(n.sourceAuthorityScore)},
        "lowConfidence"        = ${escBool(n.lowConfidence)},
        "dataSource"           = ${esc(n.dataSource)}
      WHERE "zoneName" = ${esc(n.zoneName)}`
    );
  }

  // ── 9. TCN REGIONS ─────────────────────────────────────────────────────────
  for (const r of V3.tcnRegions) {
    await run(
      `TcnRegion: ${r.name}`,
      `UPDATE "TcnRegion" SET
        "externalId"           = CASE WHEN "externalId" IS NULL THEN ${esc(r.id)} ELSE "externalId" END,
        "sourceAuthorityScore" = ${escNum(r.sourceAuthorityScore)},
        "lowConfidence"        = ${escBool(r.lowConfidence)},
        "dataSource"           = ${esc(r.dataSource)}
      WHERE name = ${esc(r.name)}`
    );
  }

  // ── 10. CONTROL CENTRES ────────────────────────────────────────────────────
  for (const c of V3.controlCentres) {
    await run(
      `ControlCentre: ${c.name}`,
      `UPDATE "TcnControlCentre" SET
        "externalId"           = CASE WHEN "externalId" IS NULL THEN ${esc(c.id)} ELSE "externalId" END,
        "sourceAuthorityScore" = ${escNum(c.sourceAuthorityScore)},
        "lowConfidence"        = ${escBool(c.lowConfidence)},
        "dataSource"           = ${esc(c.dataSource)}
      WHERE name = ${esc(c.name)}`
    );
  }

  // ── 11. REA ZONAL OFFICES ─────────────────────────────────────────────────
  for (const r of V3.reaOffices) {
    await run(
      `ReaOffice: ${r.zoneName}`,
      `UPDATE "ReaZonalOffice" SET
        "externalId"           = CASE WHEN "externalId" IS NULL THEN ${esc(r.id)} ELSE "externalId" END,
        "sourceAuthorityScore" = ${escNum(r.sourceAuthorityScore)},
        "lowConfidence"        = ${escBool(r.lowConfidence)},
        "dataSource"           = ${esc(r.dataSource)}
      WHERE "zoneName" = ${esc(r.zoneName)}`
    );
  }

  // ── 12. TARIFF ORDERS ──────────────────────────────────────────────────────
  for (const t of V3.tariffOrders) {
    const applicableTo = JSON.stringify(t.applicableTo).replace(/'/g, "''");
    const bandStructure = JSON.stringify(t.bandStructure).replace(/'/g, "''");
    await run(
      `TariffOrder: ${t.orderRef}`,
      `INSERT INTO "TariffOrder" (
        "id","externalId","orderRef","issuingBody","scope","state","title",
        "effectiveDate","expiryDate","applicableTo","bandStructure",
        "subsidyRetained","notes","dataSource","sourceAuthorityScore","lowConfidence",
        "createdAt","updatedAt"
      ) VALUES (
        gen_random_uuid(), ${esc(t.id)}, ${esc(t.orderRef)}, ${esc(t.issuingBody)},
        ${esc(t.scope)}, ${esc(t.state)}, ${esc(t.title)},
        ${escDate(t.effectiveDate)}, ${escDate(t.expiryDate)},
        '${applicableTo}'::jsonb, '${bandStructure}'::jsonb,
        ${escBool(t.subsidyRetained)}, ${esc(t.notes)},
        ${esc(t.dataSource)}, ${escNum(t.sourceAuthorityScore)}, ${escBool(t.lowConfidence)},
        NOW(), NOW()
      )
      ON CONFLICT ("orderRef") DO UPDATE SET
        "externalId"           = EXCLUDED."externalId",
        "issuingBody"          = EXCLUDED."issuingBody",
        "scope"                = EXCLUDED."scope",
        "title"                = EXCLUDED."title",
        "bandStructure"        = EXCLUDED."bandStructure",
        "notes"                = EXCLUDED."notes",
        "updatedAt"            = NOW()`
    );
  }

  // ── 13. STATE REGULATORS ───────────────────────────────────────────────────
  for (const sr of V3.stateRegulators) {
    const carveOut = sr.subDiscoCarveOut
      ? JSON.stringify(sr.subDiscoCarveOut).replace(/'/g, "''")
      : null;
    await run(
      `StateRegulator: ${sr.shortName}`,
      `INSERT INTO "StateRegulator" (
        "id","externalId","shortName","fullName","state","establishedYear","legalBasis",
        "address","website","email","chairman","subDiscoCarveOut","firstTariffOrderDate",
        "notes","dataSource","sourceAuthorityScore","lowConfidence","createdAt","updatedAt"
      ) VALUES (
        gen_random_uuid(), ${esc(sr.id)}, ${esc(sr.shortName)}, ${esc(sr.fullName)},
        ${esc(sr.state)}, ${escNum(sr.establishedYear)}, ${esc(sr.legalBasis)},
        ${esc(sr.address)}, ${esc(sr.website)}, ${esc(sr.email)}, ${esc(sr.chairman)},
        ${carveOut ? `'${carveOut}'::jsonb` : "NULL"},
        ${escDate(sr.firstTariffOrderDate)},
        ${esc(sr.notes)}, ${esc(sr.dataSource)},
        ${escNum(sr.sourceAuthorityScore)}, ${escBool(sr.lowConfidence)},
        NOW(), NOW()
      )
      ON CONFLICT ("externalId") DO UPDATE SET
        "shortName"            = EXCLUDED."shortName",
        "notes"                = EXCLUDED."notes",
        "updatedAt"            = NOW()`
    );
  }

  // ── 14. DISPATCH HISTORY ───────────────────────────────────────────────────
  console.log("Building plant name→id map...");
  const plants = await prisma.plant.findMany({
    select: { id: true, name: true },
    where: { deletedAt: null },
  });
  const plantMap: Record<string, string> = {};
  for (const p of plants) plantMap[p.name] = p.id;

  let dispatched = 0;
  let skipped = 0;
  for (const dh of V3.dispatchHistory) {
    const plantId = plantMap[dh.plantName];
    if (!plantId) {
      skipped++;
      continue;
    }
    await run(
      `Dispatch: ${dh.plantName} ${dh.date}`,
      `INSERT INTO "DispatchHistory" (
        "id","plantId","plantName","date","actualMw","availableMw","installedMw",
        "capacityFactor","outageReason","dataSource","synthetic","createdAt"
      ) VALUES (
        gen_random_uuid(), ${esc(plantId)}, ${esc(dh.plantName)},
        '${dh.date}'::date,
        ${dh.actualMw}, ${dh.availableMw}, ${dh.installedMw}, ${dh.capacityFactor},
        ${esc(dh.outageReason)}, ${esc(dh.dataSource)},
        ${escBool(dh.synthetic)}, NOW()
      )
      ON CONFLICT ("plantId","date") DO NOTHING`
    );
    dispatched++;
  }
  console.log(`Dispatch: ${dispatched} inserted, ${skipped} skipped (no plant match)`);

  console.log("\n── v3 patch complete ──");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
