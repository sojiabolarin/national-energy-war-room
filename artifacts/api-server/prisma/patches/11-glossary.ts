// Step 3 / Priority C4 — extend the sector glossary from 40 to 60+ entries.
// Existing entries are preserved (upsert by acronym).  Adds the acronyms
// used across the codebase that were missing.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type Term = { acronym: string; expansion: string; definition: string; category: string };

const TERMS: Term[] = [
  { acronym: "AKK",     expansion: "Ajaokuta-Kaduna-Kano Pipeline",
    definition: "614 km, 40-inch 2.2 Bcf/d trunk gas pipeline under construction, intended to unlock northern thermal generation.",
    category: "INFRASTRUCTURE" },
  { acronym: "OB3",     expansion: "Obiafu-Obrikom-Oben Pipeline",
    definition: "Eastern leg of the AKK-feed system; 127 km, 2.0 Bcf/d operational gas pipeline.",
    category: "INFRASTRUCTURE" },
  { acronym: "ELPS",    expansion: "Escravos-Lagos Pipeline System",
    definition: "Primary western gas trunk delivering Niger Delta gas to Lagos / Olorunsogo cluster.",
    category: "INFRASTRUCTURE" },
  { acronym: "WAGP",    expansion: "West African Gas Pipeline",
    definition: "Regional pipeline exporting Nigerian gas to Benin, Togo, and Ghana.",
    category: "INFRASTRUCTURE" },
  { acronym: "DRO",     expansion: "Distribution Reliability Order",
    definition: "NERC order setting minimum reliability standards (SAIDI / SAIFI / supply hours) for DisCos.",
    category: "INSTRUMENT" },
  { acronym: "CPR",     expansion: "Customer Protection Regulation",
    definition: "NERC regulation defining customer rights, complaints process, and supply standards.",
    category: "INSTRUMENT" },
  { acronym: "SBT",     expansion: "Service-Based Tariff",
    definition: "Tariff regime aligning DisCo tariff bands with guaranteed supply hours per feeder band.",
    category: "INSTRUMENT" },
  { acronym: "MAF",     expansion: "Meter Acquisition Fund",
    definition: "CBN-administered intervention fund financing mass metering through the NMMP.",
    category: "INSTRUMENT" },
  { acronym: "PMI",     expansion: "Presidential Metering Initiative",
    definition: "FGN programme to fast-track mass meter deployment to end-use customers.",
    category: "PROGRAMME" },
  { acronym: "EEP",     expansion: "Energising Education Programme",
    definition: "REA programme deploying dedicated solar power to federal universities and teaching hospitals.",
    category: "PROGRAMME" },
  { acronym: "EEI",     expansion: "Energising Economies Initiative",
    definition: "REA programme deploying captive embedded generation to markets and economic clusters.",
    category: "PROGRAMME" },
  { acronym: "DSRP",    expansion: "Distribution Sector Recovery Programme",
    definition: "World Bank-backed programme financing DisCo capex and performance improvements.",
    category: "PROGRAMME" },
  { acronym: "PIA",     expansion: "Petroleum Industry Act 2021",
    definition: "Federal law restructuring petroleum upstream/midstream regulation, replacing the prior regime.",
    category: "INSTRUMENT" },
  { acronym: "PPA",     expansion: "Power Purchase Agreement",
    definition: "Long-term contract between a generator and the bulk trader (NBET) or a bilateral offtaker.",
    category: "COMMERCIAL" },
  { acronym: "GSA",     expansion: "Gas Supply Agreement",
    definition: "Contract under which a gas supplier delivers gas to a thermal plant or industrial offtaker.",
    category: "COMMERCIAL" },
  { acronym: "GTA",     expansion: "Gas Transportation Agreement",
    definition: "Contract for transporting gas through the trunk pipeline system, typically with NGIC.",
    category: "COMMERCIAL" },
  { acronym: "VC",      expansion: "Vesting Contract",
    definition: "Transitional supply contract between bulk trader and DisCo establishing offtake volume and tariff.",
    category: "COMMERCIAL" },
  { acronym: "TLF",     expansion: "Transmission Loss Factor",
    definition: "Factor accounting for energy lost in transmission; used in settlement to allocate volume between offtake parties.",
    category: "TECHNICAL" },
  { acronym: "TUoS",    expansion: "Transmission Use of System charge",
    definition: "Per-kWh charge paid by DisCos and eligible customers for use of the TCN network.",
    category: "COMMERCIAL" },
  { acronym: "NGIC",    expansion: "Nigerian Gas Infrastructure Company",
    definition: "NNPC subsidiary owning and operating the gas transportation network including AKK and ELPS.",
    category: "MARKET_ROLE" },
  { acronym: "GACN",    expansion: "Gas Aggregation Company Nigeria",
    definition: "Agency aggregating gas supply for domestic gas-to-power and industrial customers under the DGSO.",
    category: "AGENCY" },
  { acronym: "DGSO",    expansion: "Domestic Gas Supply Obligation",
    definition: "Regulation requiring upstream producers to allocate a share of gas to the domestic market.",
    category: "INSTRUMENT" },
  { acronym: "ANCEE",   expansion: "Authorities and National Coordinators for Electricity in ECOWAS",
    definition: "ECOWAS regional grouping of national electricity regulators and ministries.",
    category: "AGENCY" },
  { acronym: "APUA",    expansion: "Association of Power Utilities of Africa",
    definition: "Continental association of African electricity utilities.",
    category: "AGENCY" },
  { acronym: "WAPP",    expansion: "West African Power Pool",
    definition: "ECOWAS specialised institution coordinating cross-border electricity trade among member utilities.",
    category: "AGENCY" },
  { acronym: "ICRC",    expansion: "Infrastructure Concession Regulatory Commission",
    definition: "Federal agency regulating PPP concessions in the infrastructure sector.",
    category: "AGENCY" },
  { acronym: "ONSA",    expansion: "Office of the National Security Adviser",
    definition: "Co-ordinating security agency relevant to grid protection and pipeline vandalism response.",
    category: "AGENCY" },
  { acronym: "NELMCO",  expansion: "Nigerian Electricity Liability Management Company",
    definition: "FGN entity holding the historical liabilities of the unbundled PHCN successor companies.",
    category: "MARKET_ROLE" },
  { acronym: "ISO",     expansion: "Independent System Operator",
    definition: "Operator of the transmission system independent from network owners; a target NESI structural reform.",
    category: "MARKET_ROLE" },
  { acronym: "DRE",     expansion: "Distributed Renewable Energy",
    definition: "Solar-led decentralised generation; the umbrella category covering mini-grids, SHS and embedded plants.",
    category: "TECHNICAL" },
  { acronym: "PCOA",    expansion: "Partial Credit Guarantee / Put Call Option Agreement",
    definition: "Credit-support instrument backing offtake obligations from NBET to IPPs.",
    category: "COMMERCIAL" },
  { acronym: "PAC",     expansion: "Performance Agreement / Acquisition Compact",
    definition: "Compacts setting time-bound performance commitments from DisCos in exchange for capex support.",
    category: "COMMERCIAL" },
  { acronym: "NICE",    expansion: "Nigeria Independent Coordinator of Electricity (proposed)",
    definition: "Reform proposal for an independent coordinator function separate from TCN's network ownership.",
    category: "MARKET_ROLE" },
  { acronym: "FMF",     expansion: "Federal Ministry of Finance",
    definition: "Fiscal authority approving subventions, subsidy underpayment reconciliation, and World Bank disbursements.",
    category: "AGENCY" },
  { acronym: "NEPA",    expansion: "National Electric Power Authority (defunct)",
    definition: "Pre-2005 vertically integrated state utility; predecessor to PHCN and the unbundled NESI companies.",
    category: "OTHER" },
  { acronym: "DGSO-EX", expansion: "DGSO Export Restriction",
    definition: "Domestic Gas Supply Obligation provision restricting LNG export volumes to ensure domestic gas-to-power supply.",
    category: "INSTRUMENT" },
];

async function main() {
  console.log("🚧 Patch 11 — Glossary terms");

  let created = 0;
  let updated = 0;
  for (const t of TERMS) {
    const existing = await prisma.glossaryTerm.findUnique({ where: { acronym: t.acronym } });
    if (existing) {
      await prisma.glossaryTerm.update({
        where: { acronym: t.acronym },
        data: {
          expansion: t.expansion,
          definition: t.definition,
          category: t.category,
        },
      });
      updated += 1;
    } else {
      await prisma.glossaryTerm.create({
        data: {
          acronym: t.acronym,
          expansion: t.expansion,
          definition: t.definition,
          category: t.category,
          dataSource: "Seed completion sprint — sector reference",
        },
      });
      created += 1;
    }
  }
  const total = await prisma.glossaryTerm.count();
  console.log(`Done — ${created} created, ${updated} updated, total ${total} terms`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
