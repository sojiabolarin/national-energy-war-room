// Step 3 / Priority C3 — bring Substation and Feeder counts up to the
// minimum acceptable for v0.6 (200 substations, 500 feeders).  Synthetic
// rows are flagged lowConfidence=true and dataSource notes that they
// await an authoritative import from the TCN substation register.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260517);

type StateBox = { state: string; lonMin: number; latMin: number; lonMax: number; latMax: number };
const STATES: StateBox[] = [
  { state: "Lagos",    lonMin: 2.8, latMin: 6.4, lonMax: 4.2, latMax: 6.8 },
  { state: "Ogun",     lonMin: 2.7, latMin: 6.4, lonMax: 4.4, latMax: 8.0 },
  { state: "Oyo",      lonMin: 2.9, latMin: 7.1, lonMax: 4.5, latMax: 9.2 },
  { state: "Osun",     lonMin: 4.1, latMin: 7.1, lonMax: 5.1, latMax: 8.1 },
  { state: "Ondo",     lonMin: 4.4, latMin: 5.9, lonMax: 6.0, latMax: 7.8 },
  { state: "Edo",      lonMin: 5.1, latMin: 5.9, lonMax: 6.6, latMax: 7.6 },
  { state: "Delta",    lonMin: 5.0, latMin: 5.1, lonMax: 6.7, latMax: 6.5 },
  { state: "Rivers",   lonMin: 6.4, latMin: 4.4, lonMax: 7.8, latMax: 5.6 },
  { state: "AkwaIbom", lonMin: 7.4, latMin: 4.4, lonMax: 8.4, latMax: 5.5 },
  { state: "CrossRiver", lonMin: 7.7, latMin: 4.5, lonMax: 9.4, latMax: 7.0 },
  { state: "Bayelsa",  lonMin: 5.2, latMin: 4.2, lonMax: 6.8, latMax: 5.4 },
  { state: "Abia",     lonMin: 7.2, latMin: 4.9, lonMax: 8.0, latMax: 6.0 },
  { state: "Imo",      lonMin: 6.7, latMin: 5.2, lonMax: 7.5, latMax: 6.1 },
  { state: "Anambra",  lonMin: 6.6, latMin: 5.7, lonMax: 7.4, latMax: 6.9 },
  { state: "Enugu",    lonMin: 7.0, latMin: 5.9, lonMax: 7.9, latMax: 7.0 },
  { state: "Ebonyi",   lonMin: 7.7, latMin: 5.9, lonMax: 8.5, latMax: 6.9 },
  { state: "Kogi",     lonMin: 5.7, latMin: 6.5, lonMax: 8.0, latMax: 8.8 },
  { state: "Benue",    lonMin: 7.5, latMin: 6.5, lonMax: 10.0, latMax: 8.1 },
  { state: "Plateau",  lonMin: 8.4, latMin: 8.2, lonMax: 10.4, latMax: 10.2 },
  { state: "Nasarawa", lonMin: 7.2, latMin: 7.7, lonMax: 9.7, latMax: 9.3 },
  { state: "FCT",      lonMin: 6.9, latMin: 8.5, lonMax: 7.8, latMax: 9.3 },
  { state: "Niger",    lonMin: 3.5, latMin: 8.1, lonMax: 7.9, latMax: 11.3 },
  { state: "Kwara",    lonMin: 2.8, latMin: 7.9, lonMax: 6.1, latMax: 9.3 },
  { state: "Kaduna",   lonMin: 6.5, latMin: 9.1, lonMax: 8.9, latMax: 11.4 },
  { state: "Kano",     lonMin: 7.7, latMin: 10.6, lonMax: 9.5, latMax: 12.6 },
  { state: "Katsina",  lonMin: 6.9, latMin: 11.2, lonMax: 9.0, latMax: 13.4 },
  { state: "Jigawa",   lonMin: 8.1, latMin: 11.5, lonMax: 10.8, latMax: 13.0 },
  { state: "Sokoto",   lonMin: 4.0, latMin: 12.0, lonMax: 6.5, latMax: 13.8 },
  { state: "Kebbi",    lonMin: 3.6, latMin: 10.3, lonMax: 5.7, latMax: 12.9 },
  { state: "Zamfara",  lonMin: 5.0, latMin: 11.1, lonMax: 7.4, latMax: 13.4 },
  { state: "Bauchi",   lonMin: 8.7, latMin: 9.5, lonMax: 11.0, latMax: 12.2 },
  { state: "Gombe",    lonMin: 9.9, latMin: 9.7, lonMax: 11.9, latMax: 11.1 },
  { state: "Yobe",     lonMin: 10.5, latMin: 10.5, lonMax: 13.2, latMax: 13.3 },
  { state: "Borno",    lonMin: 11.0, latMin: 9.9, lonMax: 14.6, latMax: 13.8 },
  { state: "Adamawa",  lonMin: 11.2, latMin: 7.5, lonMax: 13.9, latMax: 11.1 },
  { state: "Taraba",   lonMin: 9.2, latMin: 6.6, lonMax: 12.1, latMax: 9.4 },
  { state: "Ekiti",    lonMin: 4.8, latMin: 7.4, lonMax: 5.8, latMax: 8.0 },
];

const SUFFIXES = ["Substation", "Injection Substation", "Distribution Substation"];

function pickIn<T>(arr: T[]): T { return arr[Math.floor(rand() * arr.length)]; }

async function buildSubstations(target: number) {
  const have = await prisma.substation.count();
  const need = Math.max(0, target - have);
  console.log(`  substations: ${have} → ${target} → generate ${need}`);
  if (need === 0) return;

  const rows: any[] = [];
  for (let i = 0; i < need; i += 1) {
    const box = pickIn(STATES);
    const lon = box.lonMin + rand() * (box.lonMax - box.lonMin);
    const lat = box.latMin + rand() * (box.latMax - box.latMin);
    // weight toward 132 kV (DisCo injection) over 330 kV (trunk)
    const v = rand() < 0.85 ? "132 kV" : "330 kV";
    const capacityMva = v === "330 kV"
      ? Math.round((150 + rand() * 450))
      : Math.round((40 + rand() * 90));
    rows.push({
      name: `${box.state} Injection ${String(i + 1).padStart(3, "0")}`,
      displayName: `${box.state} #${String(i + 1).padStart(3, "0")}`,
      voltageClass: v,
      capacityMva,
      transformerConfig: v === "330 kV" ? "2 × 150 MVA" : "1 × 60 MVA",
      circuitCount: v === "330 kV" ? 2 : 1,
      latitude: Math.round(lat * 1e7) / 1e7,
      longitude: Math.round(lon * 1e7) / 1e7,
      state: box.state,
      lowConfidence: true,
      dataSource: "Synthetic seed (awaiting TCN substation register import)",
    });
  }
  await prisma.substation.createMany({ data: rows, skipDuplicates: true });
  console.log(`  ✓ inserted ${rows.length} substations`);
}

async function buildFeeders(target: number) {
  const have = await prisma.feeder.count();
  const need = Math.max(0, target - have);
  console.log(`  feeders: ${have} → ${target} → generate ${need}`);
  if (need === 0) return;

  // Allocate proportional to DisCo size (Lagos/Ikeja/Abuja big, Yola small)
  const sizes: Record<string, number> = {
    "Ikeja": 1.6, "Eko": 1.4, "Abuja": 1.4, "Ibadan": 1.3, "Benin": 1.1,
    "Enugu": 1.0, "Port Harcourt": 1.0, "Jos": 0.7, "Kano": 0.9,
    "Kaduna": 0.8, "Yola": 0.5,
  };
  const discos = await prisma.disCo.findMany({ select: { id: true, name: true } });
  const weighted = discos.map(d => ({ ...d, w: sizes[d.name] ?? 1.0 }));
  const totalW = weighted.reduce((s, d) => s + d.w, 0);

  const profiles = ["A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2"];
  const rows: any[] = [];
  let idx = 0;
  for (const d of weighted) {
    const share = Math.round((d.w / totalW) * need);
    for (let i = 0; i < share; i += 1) {
      idx += 1;
      const customers = Math.round(800 + rand() * 12_000);
      const supply = Math.round((rand() * 22) * 10) / 10;
      rows.push({
        discoId: d.id,
        name: `${d.name} F-${String(idx).padStart(4, "0")}`,
        voltage: rand() < 0.65 ? "11 kV" : "33 kV",
        customerCount: customers,
        supplyHours: supply,
        energyBilledMm: Math.round(customers * supply * (15 + rand() * 25) / 1000) / 100,
        atccLossPct: Math.round((15 + rand() * 45) * 100) / 100,
        profile: pickIn(profiles),
        securityRisk: rand() < 0.05,
        notes: "Synthetic seed; awaiting DisCo feeder schedule import.",
      });
    }
  }
  await prisma.feeder.createMany({ data: rows, skipDuplicates: true });
  console.log(`  ✓ inserted ${rows.length} feeders`);
}

async function main() {
  console.log("🚧 Patch 10 — Substations + Feeders");
  await buildSubstations(220);
  await buildFeeders(550);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
