// Step 3 / Priority C1 — expand mini-grid coverage from 35 to 250+.
//
// Real REA NEP / DARES flagship sites are preserved.  Synthetic records
// are generated for additional rural communities weighted toward the
// north and middle belt.  Each gets a Point geometry via lat/lng.
//
// Synthetic rows are marked dataClass = 'synthetic' and verifiedAt = null
// so the admin UI can flag them for verification.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Deterministic PRNG so re-runs produce stable IDs / coordinates.
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

type StateBox = { state: string; lonMin: number; latMin: number; lonMax: number; latMax: number; weight: number };

const STATES: StateBox[] = [
  // Weights skew north and middle belt where REA NEP / DARES concentrate
  { state: "Sokoto",   lonMin:  4.0, latMin: 12.0, lonMax:  6.5, latMax: 13.8, weight: 4 },
  { state: "Kebbi",    lonMin:  3.6, latMin: 10.3, lonMax:  5.7, latMax: 12.9, weight: 4 },
  { state: "Zamfara",  lonMin:  5.0, latMin: 11.1, lonMax:  7.4, latMax: 13.4, weight: 4 },
  { state: "Katsina",  lonMin:  6.9, latMin: 11.2, lonMax:  9.0, latMax: 13.4, weight: 4 },
  { state: "Kano",     lonMin:  7.7, latMin: 10.6, lonMax:  9.5, latMax: 12.6, weight: 3 },
  { state: "Jigawa",   lonMin:  8.1, latMin: 11.5, lonMax: 10.8, latMax: 13.0, weight: 4 },
  { state: "Yobe",     lonMin: 10.5, latMin: 10.5, lonMax: 13.2, latMax: 13.3, weight: 4 },
  { state: "Borno",    lonMin: 11.0, latMin:  9.9, lonMax: 14.6, latMax: 13.8, weight: 3 },
  { state: "Adamawa",  lonMin: 11.2, latMin:  7.5, lonMax: 13.9, latMax: 11.1, weight: 4 },
  { state: "Bauchi",   lonMin:  8.7, latMin:  9.5, lonMax: 11.0, latMax: 12.2, weight: 4 },
  { state: "Gombe",    lonMin:  9.9, latMin:  9.7, lonMax: 11.9, latMax: 11.1, weight: 4 },
  { state: "Taraba",   lonMin:  9.2, latMin:  6.6, lonMax: 12.1, latMax:  9.4, weight: 4 },
  { state: "Plateau",  lonMin:  8.4, latMin:  8.2, lonMax: 10.4, latMax: 10.2, weight: 4 },
  { state: "Niger",    lonMin:  3.5, latMin:  8.1, lonMax:  7.9, latMax: 11.3, weight: 5 },
  { state: "Kaduna",   lonMin:  6.5, latMin:  9.1, lonMax:  8.9, latMax: 11.4, weight: 4 },
  { state: "Kwara",    lonMin:  2.8, latMin:  7.9, lonMax:  6.1, latMax:  9.3, weight: 3 },
  { state: "Benue",    lonMin:  7.5, latMin:  6.5, lonMax: 10.0, latMax:  8.1, weight: 4 },
  { state: "Nasarawa", lonMin:  7.2, latMin:  7.7, lonMax:  9.7, latMax:  9.3, weight: 3 },
  { state: "Kogi",     lonMin:  5.7, latMin:  6.5, lonMax:  8.0, latMax:  8.8, weight: 3 },
  { state: "FCT",      lonMin:  6.9, latMin:  8.5, lonMax:  7.8, latMax:  9.3, weight: 1 },
  // Southern states - lower weight
  { state: "Oyo",      lonMin:  3.0, latMin:  7.1, lonMax:  4.4, latMax:  9.1, weight: 2 },
  { state: "Osun",     lonMin:  4.1, latMin:  7.1, lonMax:  5.1, latMax:  8.1, weight: 1 },
  { state: "Ekiti",    lonMin:  4.8, latMin:  7.4, lonMax:  5.8, latMax:  8.0, weight: 1 },
  { state: "Ondo",     lonMin:  4.4, latMin:  5.9, lonMax:  6.0, latMax:  7.8, weight: 2 },
  { state: "Edo",      lonMin:  5.1, latMin:  5.9, lonMax:  6.6, latMax:  7.6, weight: 2 },
  { state: "Delta",    lonMin:  5.0, latMin:  5.1, lonMax:  6.7, latMax:  6.5, weight: 2 },
  { state: "CrossRiver", lonMin: 7.7, latMin:  4.5, lonMax:  9.4, latMax:  7.0, weight: 2 },
  { state: "AkwaIbom", lonMin:  7.4, latMin:  4.4, lonMax:  8.4, latMax:  5.5, weight: 2 },
  { state: "Rivers",   lonMin:  6.4, latMin:  4.4, lonMax:  7.8, latMax:  5.6, weight: 1 },
  { state: "Bayelsa",  lonMin:  5.2, latMin:  4.2, lonMax:  6.8, latMax:  5.4, weight: 1 },
  { state: "Abia",     lonMin:  7.2, latMin:  4.9, lonMax:  8.0, latMax:  6.0, weight: 2 },
  { state: "Imo",      lonMin:  6.7, latMin:  5.2, lonMax:  7.5, latMax:  6.1, weight: 2 },
  { state: "Anambra",  lonMin:  6.6, latMin:  5.7, lonMax:  7.4, latMax:  6.9, weight: 2 },
  { state: "Enugu",    lonMin:  7.0, latMin:  5.9, lonMax:  7.9, latMax:  7.0, weight: 2 },
  { state: "Ebonyi",   lonMin:  7.7, latMin:  5.9, lonMax:  8.5, latMax:  6.9, weight: 2 },
];

const COMMUNITY_NAMES = [
  "Anguwar", "Gidan", "Tudun", "Sabon Gari", "Unguwa", "Mararraban", "Kofa",
  "Damau", "Karu", "Sankara", "Lugu", "Bukuru", "Mubi", "Birnin", "Kwana",
  "Yargade", "Toro", "Kwale", "Pankshin", "Lere", "Kafanchan", "Mokwa",
  "Bida", "Wushishi", "Magama", "Konduga", "Damaturu", "Geidam", "Yusufari",
  "Kura", "Wudil", "Garko", "Doguwa", "Tofa", "Tudun Wada", "Ringim",
  "Kazaure", "Baure", "Maradun", "Tureta", "Bagudo", "Yauri", "Dandi",
  "Akwanga", "Doma", "Lafia", "Kanke", "Mangu", "Riyom", "Wukari", "Bali",
  "Jada", "Ganye", "Numan", "Madagali", "Hong", "Demsa", "Yola South",
  "Sapele Rural", "Ologbo", "Ovia", "Etsako", "Akoko", "Owo", "Idanre",
  "Akure North", "Ifedore", "Egbeda", "Lalupon", "Iseyin", "Itesiwaju",
  "Saki", "Atisbo", "Ogo-Oluwa", "Boluwaduro", "Ife North", "Ila", "Irewole",
  "Aiyedire", "Ido-Osi", "Moba", "Oye", "Efon", "Ekiti East",
  "Akoko-Edo", "Igueben", "Esan", "Owan",
];

const SUFFIXES = ["Community", "Solar Hub", "Mini-Grid", "Rural Cluster", "Village", "Hybrid Plant"];

function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rand() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

function pickIn(arr: readonly string[]): string {
  return arr[Math.floor(rand() * arr.length)];
}

async function main() {
  console.log("🚧 Patch 08 — Mini-grids (target 250+)");

  const existingCount = await prisma.miniGrid.count();
  const target = 260;
  const need = Math.max(0, target - existingCount);
  console.log(`  · existing: ${existingCount} → target ${target} → generate ${need}`);

  if (need === 0) {
    console.log("  already at or above target — nothing to do");
    await prisma.$disconnect();
    return;
  }

  // Mark any pre-existing unverified records' classification, but don't
  // overwrite manually verified ones.
  await prisma.miniGrid.updateMany({
    where: { dataClass: null, verifiedAt: null },
    data: { dataClass: "seeded" },
  });

  const programmes = ["NEP", "DARES", "EEP", "OTHER"] as const;
  const funders = ["World Bank / IDA", "AfDB", "REA / FGN", "USAID Power Africa", "GIZ", "EU"];
  const operators = ["Husk Power", "PowerGen", "Rensource", "Havenhill Synergy", "GVE Projects",
                     "Arnergy", "Daysteel", "Nayo Tropical", "Auxano Solar", "Privately operated"];

  const rows: any[] = [];
  for (let i = 0; i < need; i += 1) {
    const box = pickWeighted(STATES);
    const lon = box.lonMin + rand() * (box.lonMax - box.lonMin);
    const lat = box.latMin + rand() * (box.latMax - box.latMin);
    const community = pickIn(COMMUNITY_NAMES);
    const suffix = pickIn(SUFFIXES);
    const name = `${community} ${box.state} ${suffix} ${String(i + 1).padStart(3, "0")}`;
    const programme = programmes[Math.floor(rand() * programmes.length)];
    const capacityKw = Math.round((30 + rand() * 470) * 10) / 10;
    const beneficiaries = Math.round(capacityKw * (40 + rand() * 60));
    const completionYear = 2019 + Math.floor(rand() * 7);
    const status = rand() < 0.85 ? "OPERATIONAL" : "CONSTRUCTION";
    rows.push({
      name,
      capacityKw,
      beneficiaries,
      latitude: Math.round(lat * 1e7) / 1e7,
      longitude: Math.round(lon * 1e7) / 1e7,
      state: box.state,
      lga: null,
      programme,
      status,
      completionYear,
      funder: pickIn(funders),
      operatorName: pickIn(operators),
      verifiedAt: null,
      dataClass: "synthetic",
      lowConfidence: true,
      dataSource: "Synthetic seed (faker-generated; awaiting REA register import)",
    });
  }

  await prisma.miniGrid.createMany({ data: rows, skipDuplicates: true });
  const after = await prisma.miniGrid.count();
  console.log(`  ✓ inserted ${rows.length} synthetic records — total ${after}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
