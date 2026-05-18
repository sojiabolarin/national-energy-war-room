// Patch 14 — TREP-1 and TREP-2 donor-financed transmission projects.
//
// Source: TCN Transmission Rehabilitation and Expansion Programme
// (TREP_STRATEGY_FOR_REHABILITATION...pdf, pp. 9-12).
//
// Seeds 5 donor Organisation records (AfDB, World Bank, JICA, AFD, EU)
// then upserts 6 TREP-1 (active) and 14 TREP-2 (planned) CapitalProject
// records. Match key is name (case-insensitive). Status values:
//   - TREP-1 → IN_PROGRESS (verification recommended before briefing use)
//   - TREP-2 → PLANNED
// All carry source='TCN TREP Strategy Document', dataClass='verified',
// and a verifiedAt timestamp.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TREP_SOURCE = "TCN TREP Strategy Document";
const TREP_NOTES_SUFFIX =
  "Per TCN TREP strategy document (2017). Status requires verification against current TCN project tracker before any Ministerial briefing.";

// ──────────────── Donor organisations ────────────────

type DonorSpec = { name: string; shortName: string; website?: string; mandate: string };

const DONORS: DonorSpec[] = [
  {
    name: "African Development Bank",
    shortName: "AfDB",
    website: "https://www.afdb.org",
    mandate: "African multilateral development finance institution; sponsor of Nigerian transmission projects under TREP-1.",
  },
  {
    name: "World Bank",
    shortName: "World Bank",
    website: "https://www.worldbank.org",
    mandate: "Multilateral development finance institution; sponsor of NETAP, WAPP, and other TCN transmission projects.",
  },
  {
    name: "Japan International Cooperation Agency",
    shortName: "JICA",
    website: "https://www.jica.go.jp",
    mandate: "Japanese bilateral development cooperation agency; sponsor of Lagos/Ogun transmission projects.",
  },
  {
    name: "Agence Française de Développement",
    shortName: "AFD",
    website: "https://www.afd.fr",
    mandate: "French bilateral development finance institution; sponsor of Abuja Ring and Northern Corridor transmission projects.",
  },
  {
    name: "European Union",
    shortName: "EU",
    website: "https://european-union.europa.eu",
    mandate: "EU grant funding for Northern Corridor transmission supporting Jigawa Solar IPP evacuation.",
  },
];

// ──────────────── TREP-1 projects (active) ────────────────

type TrepProject = {
  name: string;
  sponsorShortName?: string;
  capexUsd?: number;
  description: string;
  components: string;
};

const TREP1: TrepProject[] = [
  {
    name: "Nigeria Transmission Expansion Project",
    sponsorShortName: "AfDB",
    capexUsd: 410_000_000,
    description:
      "AfDB-financed 330 kV expansion: 3× quad lines, 2× 330 kV substations and 3× 132 kV substations to strengthen the central trunk.",
    components:
      "330 kV quad lines: Alaoji-Onitsha, Delta-Benin, Kaduna-Kano. 330 kV substations: Zaria, Kaduna. 132 kV substations: Rigasa, Jaji, Kakau.",
  },
  {
    name: "Nigeria Electricity Transmission Access Project (NETAP)",
    sponsorShortName: "World Bank",
    capexUsd: 486_000_000,
    description:
      "World Bank-financed brownfield substation and transmission line rehabilitation, SCADA/EMS supply and install, and PPP consultancies.",
    components:
      "Brownfield substation and line rehabilitation; SCADA/EMS supply and install; PPP consultancy services.",
  },
  {
    name: "WAPP North Core Transmission Project",
    sponsorShortName: "World Bank",
    capexUsd: 29_000_000,
    description:
      "World Bank-financed 62 km 330 kV double-circuit line connecting Nigeria to the Niger Republic border under the West African Power Pool North Core scheme.",
    components: "62 km 330 kV DC line: Birnin Kebbi - Nigeria/Niger border.",
  },
  {
    name: "Lagos/Ogun Transmission Infrastructure Project",
    sponsorShortName: "JICA",
    capexUsd: 238_000_000,
    description:
      "JICA-financed 330 kV and 132 kV substations and connector lines reinforcing Lagos-Ogun transmission capacity.",
    components:
      "330 kV and 132 kV substations and lines at Arigbajo, Ogijo, Redeem, Mountain of Fire, New Agbara, Badagry.",
  },
  {
    name: "Abuja Transmission Ring Scheme",
    sponsorShortName: "AFD",
    capexUsd: 170_000_000,
    description:
      "AFD-financed ring scheme strengthening 330 kV and 132 kV supply across the Federal Capital Territory.",
    components:
      "330 kV substations: Apo, Lugbe. 132 kV substations: Lokogoma, Gwarinpa, Kuje. Lafia supply route reinforcement.",
  },
  {
    name: "Northern Corridor Transmission Project",
    sponsorShortName: "AFD",
    capexUsd: 330_000_000,
    description:
      "AFD- and EU-financed 330 kV reinforcement of the north and evacuation of the Jigawa Solar IPP (EU €25M grant component).",
    components:
      "330 kV DC: Kainji-Birnin Kebbi; Shiroro-Abuja reconstruction to 330 kV quad; Katsina-Daura-Jogana-Kura 330 kV DC. 330 kV substations: Sokoto, Bauchi, Jogana, Daura. 132 kV substations: Lambata, Argungu, Birnin Gwari.",
  },
];

// ──────────────── TREP-2 projects (planned) ────────────────

const TREP2: TrepProject[] = [
  { name: "Mambila Evacuation - Jalingo Line",      description: "330 kV transmission line from Mambila to Jalingo, evacuating Mambila hydro.",                                components: "330 kV transmission line: Mambila-Jalingo." },
  { name: "Mambila Evacuation - Markudi Line",      description: "330 kV transmission line from Mambila to Makurdi, evacuating Mambila hydro.",                                components: "330 kV transmission line: Mambila-Makurdi (Markudi per PDF spelling)." },
  { name: "Mambila Evacuation - Calabar Route",     description: "330 kV double-circuit Calabar-Ikom-Ogoja-Mambila evacuation route.",                                          components: "330 kV DC: Calabar-Ikom-Ogoja-Mambila." },
  { name: "Mambila Evacuation - Kakuri-Bali Route", description: "330 kV double-circuit Kakuri-Bali-Mambila evacuation route.",                                                  components: "330 kV DC: Kakuri-Bali-Mambila." },
  { name: "Northern Grid Extension",                description: "330 kV double-circuit grid extension across the far north.",                                                  components: "330 kV DC: Kano-Dutse-Azare-Potiskum-Damaturu." },
  { name: "Northeast Spur",                         description: "330 kV double-circuit spur connecting Damaturu to Jalingo via Biu and Yola.",                                 components: "330 kV DC: Damaturu-Biu-Hong-Yola-Jalingo." },
  { name: "Lagos Loop Closure",                     description: "Upgrade of Alagbon-Ijora-Akangba 132 kV DC to 330 kV DC; new 330 kV substation at Ijora; underground 132 kV DC to Eko Atlantic.", components: "Upgrade 132 kV DC -> 330 kV DC (Alagbon-Ijora-Akangba); new 330 kV substation at Ijora; underground 132 kV DC to Eko Atlantic." },
  { name: "Ughelli-Okpai 330kV Line",               description: "330 kV transmission line Ughelli-Okpai.",                                                                     components: "330 kV line: Ughelli-Okpai." },
  { name: "Ughelli-Port Harcourt 330kV DC",         description: "330 kV double-circuit transmission line Ughelli-Port Harcourt.",                                              components: "330 kV DC: Ughelli-Port Harcourt." },
  { name: "Sokoto-Katsina 330kV DC",                description: "330 kV double-circuit transmission line Sokoto-Katsina.",                                                     components: "330 kV DC: Sokoto-Katsina." },
  { name: "New Agbara-Sekete 330kV DC",             description: "WAPP project: 330 kV double-circuit cross-border line New Agbara (Nigeria) to Sekete (Benin Republic).",      components: "330 kV DC: New Agbara-Sekete (Nigeria-Benin Republic)." },
  { name: "Median Backbone",                        description: "WAPP project: 330 kV double-circuit backbone Shiroro-Zungeru-Kainji-Parakuo-Togo-Ghana.",                     components: "330 kV DC: Shiroro-Zungeru-Kainji-Parakuo-Togo-Ghana." },
  { name: "North Core 330kV DC",                    description: "WAPP project: 330 kV double-circuit interconnector Nigeria-Niger-Benin-Burkina Faso.",                        components: "330 kV DC: Nigeria-Niger-Benin-Burkina Faso." },
  {
    name: "Lagos Substation Rehabilitation Programme",
    sponsorShortName: "JICA",
    description: "JICA-supported rehabilitation of Lagos transmission substations and Olorunshogo-Ikeja West DC reconductoring.",
    components: "Substation rehabilitation: Apapa, Akangba, Isolo, Ikeja West, Ota, Ojo. Olorunshogo-Ikeja West DC reconductoring.",
  },
];

// ──────────────── Step implementations ────────────────

async function upsertDonors() {
  let inserted = 0, updated = 0;
  for (const d of DONORS) {
    const existing = await prisma.organisation.findFirst({
      where: {
        OR: [
          { name: { equals: d.name, mode: "insensitive" } },
          { shortName: { equals: d.shortName, mode: "insensitive" } },
        ],
      },
    });
    const data = {
      name: d.name,
      shortName: d.shortName,
      website: d.website ?? null,
      mandate: d.mandate,
      type: "OTHER" as const,
      dataSource: TREP_SOURCE,
    };
    if (existing) {
      await prisma.organisation.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.organisation.create({ data });
      inserted += 1;
    }
  }
  console.log(`  donors: ${inserted} inserted, ${updated} updated`);
}

async function getDonorMap() {
  const orgs = await prisma.organisation.findMany({
    where: { shortName: { in: DONORS.map(d => d.shortName) } },
    select: { id: true, shortName: true },
  });
  return new Map(orgs.map(o => [o.shortName, o.id]));
}

async function upsertProjects(
  projects: TrepProject[],
  status: "IN_PROGRESS" | "PLANNED",
  donors: Map<string, string>,
) {
  let inserted = 0, updated = 0;
  for (const p of projects) {
    const sponsorOrgId = p.sponsorShortName ? donors.get(p.sponsorShortName) ?? null : null;
    const existing = await prisma.capitalProject.findFirst({
      where: { name: { equals: p.name, mode: "insensitive" } },
    });
    const data = {
      name: p.name,
      category: "TRANSMISSION" as const,
      status,
      sponsorOrgId,
      capexUsd: p.capexUsd ?? null,
      funder: p.sponsorShortName ?? null,
      notes: `${p.components} ${TREP_NOTES_SUFFIX}`,
      sourceRef: TREP_SOURCE,
      source: TREP_SOURCE,
      dataSource: TREP_SOURCE,
      dataClass: "verified",
      verifiedAt: new Date(),
      lowConfidence: false,
      sourceAuthorityScore: 85, // 2017-vintage strategy doc; not real-time
    };
    if (existing) {
      await prisma.capitalProject.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.capitalProject.create({ data });
      inserted += 1;
    }
  }
  console.log(`  ${status}: ${inserted} inserted, ${updated} updated`);
}

async function main() {
  console.log("🚧 Patch 14 — TREP-1 and TREP-2 transmission projects");
  await upsertDonors();
  const donors = await getDonorMap();
  await upsertProjects(TREP1, "IN_PROGRESS", donors);
  await upsertProjects(TREP2, "PLANNED",     donors);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
