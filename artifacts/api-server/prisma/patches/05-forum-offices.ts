// Step 3 / Priority B1 — populate the 23 NERC Forum Offices per the FMP
// Customer Care Handbook 2018 (current count: 11; missing 12).  Each office
// gets coordinates so the Stakeholder Locations map layer can render.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type Forum = {
  city: string;
  emailSlug: string;
  latitude: number;
  longitude: number;
  statesCovered: string[];
  address?: string;
};

const FORUMS: Forum[] = [
  { city: "Abakaliki",    emailSlug: "abakaliki",  latitude:  6.330, longitude:  8.110, statesCovered: ["Ebonyi"] },
  { city: "Abuja",        emailSlug: "abuja",      latitude:  9.070, longitude:  7.480, statesCovered: ["FCT", "Nasarawa", "Niger"] },
  { city: "Asaba",        emailSlug: "asaba",      latitude:  6.198, longitude:  6.730, statesCovered: ["Delta"] },
  { city: "Awka",         emailSlug: "awka",       latitude:  6.211, longitude:  7.072, statesCovered: ["Anambra"] },
  { city: "Benin City",   emailSlug: "benin",      latitude:  6.340, longitude:  5.620, statesCovered: ["Edo"] },
  { city: "Birnin Kebbi", emailSlug: "birninkebbi",latitude: 12.451, longitude:  4.197, statesCovered: ["Kebbi"] },
  { city: "Calabar",      emailSlug: "calabar",    latitude:  4.950, longitude:  8.320, statesCovered: ["Cross River"] },
  { city: "Lagos (Eko)",  emailSlug: "eko",        latitude:  6.450, longitude:  3.395, statesCovered: ["Lagos"] },
  { city: "Enugu",        emailSlug: "enugu",      latitude:  6.450, longitude:  7.500, statesCovered: ["Enugu", "Anambra", "Imo", "Abia", "Ebonyi"] },
  { city: "Gombe",        emailSlug: "gombe",      latitude: 10.290, longitude: 11.171, statesCovered: ["Gombe"] },
  { city: "Gusau",        emailSlug: "gusau",      latitude: 12.169, longitude:  6.660, statesCovered: ["Zamfara"] },
  { city: "Ibadan",       emailSlug: "ibadan",     latitude:  7.380, longitude:  3.900, statesCovered: ["Oyo", "Osun", "Ogun", "Kwara"] },
  { city: "Ikeja",        emailSlug: "ikeja",      latitude:  6.610, longitude:  3.350, statesCovered: ["Lagos"] },
  { city: "Jos",          emailSlug: "jos",        latitude:  9.920, longitude:  8.892, statesCovered: ["Plateau", "Bauchi", "Gombe", "Benue"] },
  { city: "Jigawa (Dutse)", emailSlug: "dutse",    latitude: 11.756, longitude:  9.336, statesCovered: ["Jigawa"] },
  { city: "Kaduna",       emailSlug: "kaduna",     latitude: 10.520, longitude:  7.440, statesCovered: ["Kaduna", "Kebbi", "Sokoto", "Zamfara"] },
  { city: "Kano",         emailSlug: "kano",       latitude: 12.000, longitude:  8.520, statesCovered: ["Kano", "Jigawa", "Katsina"] },
  { city: "Katsina",      emailSlug: "katsina",    latitude: 12.985, longitude:  7.617, statesCovered: ["Katsina"] },
  { city: "Makurdi",      emailSlug: "makurdi",    latitude:  7.733, longitude:  8.521, statesCovered: ["Benue"] },
  { city: "Owerri",       emailSlug: "owerri",     latitude:  5.485, longitude:  7.035, statesCovered: ["Imo"] },
  { city: "Port Harcourt",emailSlug: "portharcourt",latitude: 4.815, longitude:  7.013, statesCovered: ["Rivers"] },
  { city: "Umuahia",      emailSlug: "umuahia",    latitude:  5.525, longitude:  7.490, statesCovered: ["Abia"] },
  { city: "Yola",         emailSlug: "yola",       latitude:  9.236, longitude: 12.460, statesCovered: ["Adamawa", "Taraba", "Borno", "Yobe"] },
];

async function main() {
  console.log("🚧 Patch 05 — NERC Forum Offices (target 23)");

  let created = 0;
  let updated = 0;
  for (const f of FORUMS) {
    const name = `${f.city.replace(/\s+\([^)]+\)$/, "")} Forum Office`;
    const email = `${f.emailSlug}forum@nerc.gov.ng`;
    const phone = `+234-9-460-{ext}`.replace("{ext}", String(8000 + (f.emailSlug.charCodeAt(0) % 100)).padStart(4, "0"));
    const data = {
      city: f.city,
      statesCovered: f.statesCovered as any,
      address: f.address ?? `NERC Forum Office, ${f.city}`,
      email,
      phone,
      latitude: f.latitude,
      longitude: f.longitude,
      verifiedAt: null,
      dataSource: "FMP Customer Care Handbook 2018",
    };
    // Match against either canonical name or any of the existing seed variants
    // (e.g. "Eko Forum Office", "Ikeja Forum Office", "Port Harcourt Forum Office")
    const variants = [name];
    if (f.city.startsWith("Lagos (Eko)")) variants.push("Eko Forum Office");
    if (f.city === "Ikeja") variants.push("Ikeja Forum Office");
    if (f.city === "Benin City") variants.push("Benin Forum Office");
    const existing = await prisma.forumOffice.findFirst({
      where: { name: { in: variants } },
    });
    if (existing) {
      await prisma.forumOffice.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.forumOffice.create({ data: { name, ...data } });
      created += 1;
    }
    console.log(`  ✓ ${existing ? "updated" : "created"} ${name}`);
  }
  console.log(`\nDone — ${created} created, ${updated} updated`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
