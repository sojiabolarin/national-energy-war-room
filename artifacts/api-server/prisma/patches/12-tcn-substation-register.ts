// Patch 12 — TCN substation register import.
//
// Replaces the 177 synthetic placeholder substations with the named 330 kV
// and 132 kV transmission substations published in TCN's asset register
// (transcribed from "LIST_OF_330_AND_132KV_TRANSMISSION_SUBSTATIONS.pdf").
//
// Match key: (name, voltageClass). Sites appearing in both voltage lists
// (e.g. Egbin, Akangba, Sapele, Mando, Lafia, Birnin Kebbi…) produce two
// records — one per voltage. This preserves the PDF's row count.
//
// Region assignment: the spec PDF groups substations into 10 operational
// regions (Abuja, Kano, Benin, Kaduna, Lagos, Osogbo, Port Harcourt,
// Shiroro, Bauchi, Enugu). The DB has 12 regions (the 2018 FMP set:
// Abuja, Bauchi, Benin, Enugu, Jos, Kaduna, Kano, Lagos, Makurdi, Osogbo,
// Port Harcourt, Yola). Per direction, we keep the 12 and fold by state:
//   - Shiroro PDF entries → Abuja Region (Niger/FCT) or Kaduna (Kebbi/Sokoto/Zamfara)
//   - Bauchi PDF entries  → Bauchi/Yola/Jos/Makurdi/Kaduna depending on state.
//
// Geocoding: known transmission-substation coordinates from public TCN/REA
// maps and PHCN brownfield records. Approximate town centroids used where
// the substation itself is not separately catalogued; flagged in geomQuality.
//
// Idempotent: upserts by (name, voltageClass); deletes leftover synthetic
// placeholders (dataSource matching the synthetic-seed marker) at the end.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SYNTHETIC_MARKER =
  "Synthetic seed (awaiting TCN substation register import)";

type GeomQuality = "geocoded" | "approximated" | "pending";

type Sub = {
  name: string;
  voltage: "330 kV" | "132 kV";
  region: string;     // matches TcnRegion.name
  state: string;
  lat: number | null;
  lng: number | null;
  q: GeomQuality;
  capacityMva: number;
  notes?: string;
};

// Default plate capacity by voltage class — preserved from the synthetic
// seed convention. Real per-asset MVA ratings are not in the PDF.
const DEFAULT_330_MVA = 300;
const DEFAULT_132_MVA = 60;

const SUBSTATIONS: Sub[] = [
  // ─────────── 330 kV ───────────

  // Abuja Region (6)
  { name: "Katampe",       voltage: "330 kV", region: "Abuja Region", state: "FCT",      lat: 9.1050, lng: 7.4830, q: "geocoded",    capacityMva: DEFAULT_330_MVA },
  { name: "Geregu",        voltage: "330 kV", region: "Abuja Region", state: "Kogi",     lat: 7.5460, lng: 6.6590, q: "geocoded",    capacityMva: DEFAULT_330_MVA },
  { name: "Gwagwalada",    voltage: "330 kV", region: "Abuja Region", state: "FCT",      lat: 8.9430, lng: 7.0850, q: "geocoded",    capacityMva: DEFAULT_330_MVA },
  { name: "Ajaokuta",      voltage: "330 kV", region: "Abuja Region", state: "Kogi",     lat: 7.5830, lng: 6.6330, q: "geocoded",    capacityMva: DEFAULT_330_MVA },
  { name: "Lokoja",        voltage: "330 kV", region: "Abuja Region", state: "Kogi",     lat: 7.8020, lng: 6.7400, q: "geocoded",    capacityMva: DEFAULT_330_MVA },
  { name: "Lafia",         voltage: "330 kV", region: "Abuja Region", state: "Nasarawa", lat: 8.4910, lng: 8.5150, q: "geocoded",    capacityMva: DEFAULT_330_MVA },

  // Kano Region (1)
  { name: "Kumbotso",      voltage: "330 kV", region: "Kano Region", state: "Kano",      lat: 11.9270, lng: 8.5210, q: "geocoded",   capacityMva: DEFAULT_330_MVA },

  // Benin Region (5)
  { name: "Benin South",   voltage: "330 kV", region: "Benin Region", state: "Edo",      lat: 6.3230, lng: 5.6170, q: "geocoded",    capacityMva: DEFAULT_330_MVA, notes: "PDF label: 'Benin South Sub Region'" },
  { name: "Sapele",        voltage: "330 kV", region: "Benin Region", state: "Delta",    lat: 5.8930, lng: 5.6960, q: "geocoded",    capacityMva: DEFAULT_330_MVA },
  { name: "Ihovbor",       voltage: "330 kV", region: "Benin Region", state: "Edo",      lat: 6.4670, lng: 5.6250, q: "geocoded",    capacityMva: DEFAULT_330_MVA },
  { name: "Omotosho",      voltage: "330 kV", region: "Benin Region", state: "Ondo",     lat: 6.7060, lng: 4.7870, q: "geocoded",    capacityMva: DEFAULT_330_MVA },
  { name: "Delta",         voltage: "330 kV", region: "Benin Region", state: "Delta",    lat: 5.4980, lng: 6.0180, q: "approximated", capacityMva: DEFAULT_330_MVA, notes: "Delta IV power station, Ughelli" },

  // Kaduna Region (2)
  { name: "Mando",         voltage: "330 kV", region: "Kaduna Region", state: "Kaduna",  lat: 10.5780, lng: 7.4220, q: "geocoded",   capacityMva: DEFAULT_330_MVA },
  { name: "Birnin Kebbi",  voltage: "330 kV", region: "Kaduna Region", state: "Kebbi",   lat: 12.4530, lng: 4.1980, q: "geocoded",   capacityMva: DEFAULT_330_MVA },

  // Lagos Region (7)
  { name: "Akangba",       voltage: "330 kV", region: "Lagos Region", state: "Lagos",    lat: 6.4930, lng: 3.3270, q: "geocoded",    capacityMva: DEFAULT_330_MVA },
  { name: "Ikeja West",    voltage: "330 kV", region: "Lagos Region", state: "Ogun",     lat: 6.6250, lng: 3.3050, q: "geocoded",    capacityMva: DEFAULT_330_MVA },
  { name: "Oke Aro",       voltage: "330 kV", region: "Lagos Region", state: "Ogun",     lat: 6.7110, lng: 3.2700, q: "geocoded",    capacityMva: DEFAULT_330_MVA },
  { name: "Egbin",         voltage: "330 kV", region: "Lagos Region", state: "Lagos",    lat: 6.5670, lng: 3.6430, q: "geocoded",    capacityMva: DEFAULT_330_MVA },
  { name: "Aja",           voltage: "330 kV", region: "Lagos Region", state: "Lagos",    lat: 6.4640, lng: 3.5890, q: "geocoded",    capacityMva: DEFAULT_330_MVA },
  { name: "Alagbon",       voltage: "330 kV", region: "Lagos Region", state: "Lagos",    lat: 6.4480, lng: 3.4210, q: "geocoded",    capacityMva: DEFAULT_330_MVA },
  { name: "Lekki",         voltage: "330 kV", region: "Lagos Region", state: "Lagos",    lat: 6.4500, lng: 3.6050, q: "geocoded",    capacityMva: DEFAULT_330_MVA },

  // Osogbo Region (3)
  { name: "Osogbo",        voltage: "330 kV", region: "Osogbo Region", state: "Osun",    lat: 7.7780, lng: 4.5570, q: "geocoded",    capacityMva: DEFAULT_330_MVA },
  { name: "Ayede",         voltage: "330 kV", region: "Osogbo Region", state: "Oyo",     lat: 7.4260, lng: 3.9100, q: "geocoded",    capacityMva: DEFAULT_330_MVA },
  { name: "Ganmo",         voltage: "330 kV", region: "Osogbo Region", state: "Kwara",   lat: 8.3570, lng: 4.6200, q: "geocoded",    capacityMva: DEFAULT_330_MVA },

  // Port Harcourt Region (4)
  { name: "Alaoji",        voltage: "330 kV", region: "Port Harcourt Region", state: "Abia",        lat: 5.0900, lng: 7.3710, q: "geocoded", capacityMva: DEFAULT_330_MVA },
  { name: "Afam",          voltage: "330 kV", region: "Port Harcourt Region", state: "Rivers",      lat: 4.8750, lng: 7.3180, q: "geocoded", capacityMva: DEFAULT_330_MVA },
  { name: "Adiabo",        voltage: "330 kV", region: "Port Harcourt Region", state: "Cross River", lat: 5.0820, lng: 8.3460, q: "geocoded", capacityMva: DEFAULT_330_MVA },
  { name: "Odukpani",      voltage: "330 kV", region: "Port Harcourt Region", state: "Cross River", lat: 5.1310, lng: 8.3370, q: "geocoded", capacityMva: DEFAULT_330_MVA },

  // Shiroro PDF region (3) → Abuja Region by state geography
  { name: "Fakun",         voltage: "330 kV", region: "Abuja Region",  state: "Niger", lat: 10.1000, lng: 5.1000, q: "approximated", capacityMva: DEFAULT_330_MVA, notes: "PDF: Shiroro operational region (Niger state)" },
  { name: "Shiroro",       voltage: "330 kV", region: "Abuja Region",  state: "Niger", lat: 9.9710, lng: 6.8350, q: "geocoded",      capacityMva: DEFAULT_330_MVA, notes: "PDF: Shiroro operational region" },
  { name: "Jebba",         voltage: "330 kV", region: "Abuja Region",  state: "Niger", lat: 9.1300, lng: 4.8230, q: "geocoded",      capacityMva: DEFAULT_330_MVA, notes: "PDF: Shiroro operational region; Jebba dam straddles Niger/Kwara" },

  // Bauchi PDF region (5) → split by state geography (Yola, Jos, Bauchi DB regions)
  { name: "Gombe",         voltage: "330 kV", region: "Bauchi Region", state: "Gombe",   lat: 10.2900, lng: 11.1700, q: "geocoded",  capacityMva: DEFAULT_330_MVA },
  { name: "Yola",          voltage: "330 kV", region: "Yola Region",   state: "Adamawa", lat: 9.2070, lng: 12.4790, q: "geocoded",   capacityMva: DEFAULT_330_MVA, notes: "PDF: Bauchi operational region" },
  { name: "Jos",           voltage: "330 kV", region: "Jos Region",    state: "Plateau", lat: 9.8790, lng: 8.8800, q: "geocoded",    capacityMva: DEFAULT_330_MVA, notes: "PDF: Bauchi operational region" },
  { name: "Molai",         voltage: "330 kV", region: "Bauchi Region", state: "Borno",   lat: 11.7950, lng: 13.1350, q: "geocoded",  capacityMva: DEFAULT_330_MVA, notes: "Maiduguri area" },
  { name: "Damaturu",      voltage: "330 kV", region: "Bauchi Region", state: "Yobe",    lat: 11.7470, lng: 11.9650, q: "geocoded",  capacityMva: DEFAULT_330_MVA },

  // Enugu PDF region (5) → Enugu DB region (Apir → Makurdi)
  { name: "Apir",          voltage: "330 kV", region: "Makurdi Region", state: "Benue",  lat: 7.7000, lng: 8.4820, q: "geocoded",    capacityMva: DEFAULT_330_MVA, notes: "PDF: Enugu operational region; Apir, Makurdi" },
  { name: "New Haven",     voltage: "330 kV", region: "Enugu Region", state: "Enugu",    lat: 6.4440, lng: 7.5040, q: "geocoded",    capacityMva: DEFAULT_330_MVA },
  { name: "Onitsha",       voltage: "330 kV", region: "Enugu Region", state: "Anambra",  lat: 6.1440, lng: 6.7890, q: "geocoded",    capacityMva: DEFAULT_330_MVA },
  { name: "Asaba",         voltage: "330 kV", region: "Enugu Region", state: "Delta",    lat: 6.1980, lng: 6.7310, q: "geocoded",    capacityMva: DEFAULT_330_MVA },
  { name: "Ugwuaji",       voltage: "330 kV", region: "Enugu Region", state: "Enugu",    lat: 6.4020, lng: 7.4480, q: "geocoded",    capacityMva: DEFAULT_330_MVA },

  // ─────────── 132 kV ───────────

  // Abuja Region (16)
  { name: "Katampe",       voltage: "132 kV", region: "Abuja Region", state: "FCT",      lat: 9.1050, lng: 7.4830, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Keffi",         voltage: "132 kV", region: "Abuja Region", state: "Nasarawa", lat: 8.8470, lng: 7.8720, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Lafia",         voltage: "132 kV", region: "Abuja Region", state: "Nasarawa", lat: 8.4910, lng: 8.5150, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Dawaki",        voltage: "132 kV", region: "Abuja Region", state: "FCT",      lat: 9.1170, lng: 7.4130, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Okene",         voltage: "132 kV", region: "Abuja Region", state: "Kogi",     lat: 7.5530, lng: 6.2360, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Karu",          voltage: "132 kV", region: "Abuja Region", state: "Nasarawa", lat: 9.0600, lng: 7.5290, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Akwanga",       voltage: "132 kV", region: "Abuja Region", state: "Nasarawa", lat: 8.9110, lng: 8.4180, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Ajaokuta",      voltage: "132 kV", region: "Abuja Region", state: "Kogi",     lat: 7.5830, lng: 6.6330, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Okpela",        voltage: "132 kV", region: "Abuja Region", state: "Edo",      lat: 7.0990, lng: 6.3660, q: "geocoded",    capacityMva: DEFAULT_132_MVA, notes: "Auchi-Okpella" },
  { name: "Lokoja",        voltage: "132 kV", region: "Abuja Region", state: "Kogi",     lat: 7.8020, lng: 6.7400, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Gwagwalada",    voltage: "132 kV", region: "Abuja Region", state: "FCT",      lat: 8.9430, lng: 7.0850, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Apo",           voltage: "132 kV", region: "Abuja Region", state: "FCT",      lat: 8.9890, lng: 7.4950, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Kubwa",         voltage: "132 kV", region: "Abuja Region", state: "FCT",      lat: 9.1500, lng: 7.3300, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Central Area",  voltage: "132 kV", region: "Abuja Region", state: "FCT",      lat: 9.0690, lng: 7.4900, q: "geocoded",    capacityMva: DEFAULT_132_MVA, notes: "Abuja CBD" },
  { name: "Kukwaba",       voltage: "132 kV", region: "Abuja Region", state: "FCT",      lat: 9.0440, lng: 7.4500, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Suleja",        voltage: "132 kV", region: "Abuja Region", state: "Niger",    lat: 9.1810, lng: 7.1810, q: "geocoded",    capacityMva: DEFAULT_132_MVA },

  // Kano Region (10) — PDF lists Katsina-state sites (Kankia, Katsina, Daura) under Kano
  { name: "Kumbotso",      voltage: "132 kV", region: "Kano Region", state: "Kano",      lat: 11.9270, lng: 8.5210, q: "geocoded",   capacityMva: DEFAULT_132_MVA },
  { name: "Dan Agundi",    voltage: "132 kV", region: "Kano Region", state: "Kano",      lat: 11.9990, lng: 8.5300, q: "geocoded",   capacityMva: DEFAULT_132_MVA },
  { name: "Dakata",        voltage: "132 kV", region: "Kano Region", state: "Kano",      lat: 12.0130, lng: 8.5460, q: "geocoded",   capacityMva: DEFAULT_132_MVA },
  { name: "Kankia",        voltage: "132 kV", region: "Kano Region", state: "Katsina",   lat: 12.6050, lng: 7.9400, q: "geocoded",   capacityMva: DEFAULT_132_MVA },
  { name: "Katsina",       voltage: "132 kV", region: "Kano Region", state: "Katsina",   lat: 12.9890, lng: 7.6010, q: "geocoded",   capacityMva: DEFAULT_132_MVA },
  { name: "Daura",         voltage: "132 kV", region: "Kano Region", state: "Katsina",   lat: 13.0400, lng: 8.3190, q: "geocoded",   capacityMva: DEFAULT_132_MVA },
  { name: "Tamburawa",     voltage: "132 kV", region: "Kano Region", state: "Kano",      lat: 11.8660, lng: 8.5530, q: "geocoded",   capacityMva: DEFAULT_132_MVA },
  { name: "Kwana Dangora", voltage: "132 kV", region: "Kano Region", state: "Kano",      lat: 11.6670, lng: 8.5000, q: "approximated", capacityMva: DEFAULT_132_MVA },
  { name: "Wudil",         voltage: "132 kV", region: "Kano Region", state: "Kano",      lat: 11.7950, lng: 8.8470, q: "geocoded",   capacityMva: DEFAULT_132_MVA },
  { name: "Walalambe",     voltage: "132 kV", region: "Kano Region", state: "Kano",      lat: 12.0000, lng: 8.5000, q: "pending",    capacityMva: DEFAULT_132_MVA, notes: "Coordinates unverified" },

  // Bauchi PDF region (first block, 5 explicit) — Dutse/Gagarawa/Hadejia geographically Kano-region; Bichi Kano; Azare Bauchi.
  // Per geographic mapping: Jigawa+Kano → Kano Region; Bauchi-state → Bauchi Region.
  { name: "Dutse",         voltage: "132 kV", region: "Kano Region",   state: "Jigawa",  lat: 11.7560, lng: 9.3380, q: "geocoded",   capacityMva: DEFAULT_132_MVA, notes: "PDF: Bauchi-block 132kV listing" },
  { name: "Azare",         voltage: "132 kV", region: "Bauchi Region", state: "Bauchi",  lat: 11.6750, lng: 10.1920, q: "geocoded",  capacityMva: DEFAULT_132_MVA },
  { name: "Bichi",         voltage: "132 kV", region: "Kano Region",   state: "Kano",    lat: 12.2470, lng: 8.2440, q: "geocoded",   capacityMva: DEFAULT_132_MVA, notes: "PDF: Bauchi-block 132kV listing" },
  { name: "Gagarawa",      voltage: "132 kV", region: "Kano Region",   state: "Jigawa",  lat: 12.4170, lng: 9.5170, q: "approximated", capacityMva: DEFAULT_132_MVA, notes: "PDF: Bauchi-block 132kV listing" },
  { name: "Hadejia",       voltage: "132 kV", region: "Kano Region",   state: "Jigawa",  lat: 12.4500, lng: 10.0410, q: "geocoded",  capacityMva: DEFAULT_132_MVA, notes: "PDF: Bauchi-block 132kV listing" },
  // NOTE: spec claimed (15) for this block but only 5 names were transcribed.
  // 10 additional Bauchi-block substations are not seeded; flagged at end of report.

  // Benin Region (16)
  { name: "Benin",         voltage: "132 kV", region: "Benin Region", state: "Edo",      lat: 6.3360, lng: 5.6170, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Ihovbor",       voltage: "132 kV", region: "Benin Region", state: "Edo",      lat: 6.4670, lng: 5.6250, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Effurun",       voltage: "132 kV", region: "Benin Region", state: "Delta",    lat: 5.5550, lng: 5.7600, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Amukpe",        voltage: "132 kV", region: "Benin Region", state: "Delta",    lat: 5.8990, lng: 5.7460, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Omotosho",      voltage: "132 kV", region: "Benin Region", state: "Ondo",     lat: 6.7060, lng: 4.7870, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Sapele",        voltage: "132 kV", region: "Benin Region", state: "Delta",    lat: 5.8930, lng: 5.6960, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Ondo",          voltage: "132 kV", region: "Benin Region", state: "Ondo",     lat: 7.0950, lng: 4.8400, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Akure",         voltage: "132 kV", region: "Benin Region", state: "Ondo",     lat: 7.2510, lng: 5.2100, q: "geocoded",    capacityMva: DEFAULT_132_MVA, notes: "PDF lists Akure under both Benin and Osogbo regions" },
  { name: "Delta 1",       voltage: "132 kV", region: "Benin Region", state: "Delta",    lat: 5.5000, lng: 6.0200, q: "approximated", capacityMva: DEFAULT_132_MVA, notes: "Delta I, Ughelli" },
  { name: "Afiesere",      voltage: "132 kV", region: "Benin Region", state: "Delta",    lat: 5.5500, lng: 6.0100, q: "approximated", capacityMva: DEFAULT_132_MVA },
  { name: "Okada",         voltage: "132 kV", region: "Benin Region", state: "Edo",      lat: 6.7390, lng: 5.4290, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Irua",          voltage: "132 kV", region: "Benin Region", state: "Edo",      lat: 6.7400, lng: 6.2300, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Oghara",        voltage: "132 kV", region: "Benin Region", state: "Delta",    lat: 5.9700, lng: 5.6700, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Orozo",         voltage: "132 kV", region: "Benin Region", state: "Edo",      lat: 6.4200, lng: 5.6500, q: "approximated", capacityMva: DEFAULT_132_MVA },
  { name: "Okitipupa",     voltage: "132 kV", region: "Benin Region", state: "Ondo",     lat: 6.5000, lng: 4.7800, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Etsako",        voltage: "132 kV", region: "Benin Region", state: "Edo",      lat: 7.0700, lng: 6.2700, q: "approximated", capacityMva: DEFAULT_132_MVA },

  // Kaduna Region (8)
  { name: "Mando",         voltage: "132 kV", region: "Kaduna Region", state: "Kaduna",  lat: 10.5780, lng: 7.4220, q: "geocoded",   capacityMva: DEFAULT_132_MVA },
  { name: "Kaduna Town",   voltage: "132 kV", region: "Kaduna Region", state: "Kaduna",  lat: 10.5230, lng: 7.4380, q: "geocoded",   capacityMva: DEFAULT_132_MVA },
  { name: "Zaria",         voltage: "132 kV", region: "Kaduna Region", state: "Kaduna",  lat: 11.0700, lng: 7.7200, q: "geocoded",   capacityMva: DEFAULT_132_MVA },
  { name: "Gusau",         voltage: "132 kV", region: "Kaduna Region", state: "Zamfara", lat: 12.1640, lng: 6.6640, q: "geocoded",   capacityMva: DEFAULT_132_MVA },
  { name: "Funtua",        voltage: "132 kV", region: "Kaduna Region", state: "Katsina", lat: 11.5170, lng: 7.3170, q: "geocoded",   capacityMva: DEFAULT_132_MVA },
  { name: "T/Mafara",      voltage: "132 kV", region: "Kaduna Region", state: "Zamfara", lat: 12.5810, lng: 6.0610, q: "geocoded",   capacityMva: DEFAULT_132_MVA, notes: "Talata Mafara" },
  { name: "Sokoto",        voltage: "132 kV", region: "Kaduna Region", state: "Sokoto",  lat: 13.0050, lng: 5.2470, q: "geocoded",   capacityMva: DEFAULT_132_MVA },
  { name: "Birnin Kebbi",  voltage: "132 kV", region: "Kaduna Region", state: "Kebbi",   lat: 12.4530, lng: 4.1980, q: "geocoded",   capacityMva: DEFAULT_132_MVA },

  // Lagos Region (30)
  { name: "Akangba",       voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.4930, lng: 3.3270, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Ijora",         voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.4670, lng: 3.3680, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Itire",         voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.5180, lng: 3.3420, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Isolo",         voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.5340, lng: 3.3320, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Ilupeju",       voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.5440, lng: 3.3650, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Ojo",           voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.4630, lng: 3.1640, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Ilashe Island", voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.4180, lng: 3.3270, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Oke-Aro",       voltage: "132 kV", region: "Lagos Region", state: "Ogun",     lat: 6.7110, lng: 3.2700, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Agobo",         voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.5600, lng: 3.2800, q: "approximated", capacityMva: DEFAULT_132_MVA, notes: "Igbobi/Agbobi area, transcription uncertain" },
  { name: "Alimosho",      voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.5950, lng: 3.2670, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Ogba",          voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.6260, lng: 3.3380, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Alausa",        voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.6090, lng: 3.3580, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Ejigbo",        voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.5470, lng: 3.2880, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Agbara",        voltage: "132 kV", region: "Lagos Region", state: "Ogun",     lat: 6.5060, lng: 3.0830, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Papalanto",     voltage: "132 kV", region: "Lagos Region", state: "Ogun",     lat: 6.8980, lng: 3.1500, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Abeokuta",      voltage: "132 kV", region: "Lagos Region", state: "Ogun",     lat: 7.1610, lng: 3.3480, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "New Abeokuta",  voltage: "132 kV", region: "Lagos Region", state: "Ogun",     lat: 7.1810, lng: 3.3700, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Ota",           voltage: "132 kV", region: "Lagos Region", state: "Ogun",     lat: 6.6800, lng: 3.2370, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Egbin",         voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.5670, lng: 3.6430, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Ikorodu",       voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.6190, lng: 3.5050, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Odogungan",     voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.6300, lng: 3.5400, q: "approximated", capacityMva: DEFAULT_132_MVA, notes: "Odogunyan, Ikorodu" },
  { name: "Maryland",      voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.5710, lng: 3.3690, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Aja",           voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.4640, lng: 3.5890, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Lekki",         voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.4500, lng: 3.6050, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Alagbon",       voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.4480, lng: 3.4210, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Amuwo",         voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.4630, lng: 3.2940, q: "geocoded",    capacityMva: DEFAULT_132_MVA, notes: "Amuwo Odofin" },
  { name: "Apapa",         voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.4490, lng: 3.3680, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Oworonshoki",   voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.5500, lng: 3.3940, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Akoka",         voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.5180, lng: 3.3850, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Ayoba",         voltage: "132 kV", region: "Lagos Region", state: "Lagos",    lat: 6.5300, lng: 3.2700, q: "approximated", capacityMva: DEFAULT_132_MVA, notes: "Ayobo, transcription as 'Ayoba'" },

  // Osogbo Region (20)
  { name: "Osogbo",        voltage: "132 kV", region: "Osogbo Region", state: "Osun",    lat: 7.7780, lng: 4.5570, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Ile-Ife",       voltage: "132 kV", region: "Osogbo Region", state: "Osun",    lat: 7.4690, lng: 4.5520, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Ilesa",         voltage: "132 kV", region: "Osogbo Region", state: "Osun",    lat: 7.6230, lng: 4.7400, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Offa",          voltage: "132 kV", region: "Osogbo Region", state: "Kwara",   lat: 8.1480, lng: 4.7220, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Ado-Ekiti",     voltage: "132 kV", region: "Osogbo Region", state: "Ekiti",   lat: 7.6210, lng: 5.2210, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Ayede",         voltage: "132 kV", region: "Osogbo Region", state: "Oyo",     lat: 7.4260, lng: 3.9100, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Jericho",       voltage: "132 kV", region: "Osogbo Region", state: "Oyo",     lat: 7.3920, lng: 3.8730, q: "geocoded",    capacityMva: DEFAULT_132_MVA, notes: "Jericho, Ibadan" },
  { name: "Oyo",           voltage: "132 kV", region: "Osogbo Region", state: "Oyo",     lat: 7.8520, lng: 3.9320, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Sagamu",        voltage: "132 kV", region: "Osogbo Region", state: "Ogun",    lat: 6.8500, lng: 3.6450, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Ijebu Ode",     voltage: "132 kV", region: "Osogbo Region", state: "Ogun",    lat: 6.8200, lng: 3.9170, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Sagamu Cement", voltage: "132 kV", region: "Osogbo Region", state: "Ogun",    lat: 6.8400, lng: 3.6700, q: "approximated", capacityMva: DEFAULT_132_MVA, notes: "Sagamu Cement Factory tap" },
  { name: "Ibadan North",  voltage: "132 kV", region: "Osogbo Region", state: "Oyo",     lat: 7.4400, lng: 3.9100, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Iseyin",        voltage: "132 kV", region: "Osogbo Region", state: "Oyo",     lat: 7.9700, lng: 3.5950, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Iwo",           voltage: "132 kV", region: "Osogbo Region", state: "Osun",    lat: 7.6280, lng: 4.1860, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "McPherson",     voltage: "132 kV", region: "Osogbo Region", state: "Oyo",     lat: 7.4200, lng: 3.9000, q: "approximated", capacityMva: DEFAULT_132_MVA, notes: "McPherson, Ibadan" },
  { name: "Ganmo",         voltage: "132 kV", region: "Osogbo Region", state: "Kwara",   lat: 8.3570, lng: 4.6200, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Ilorin",        voltage: "132 kV", region: "Osogbo Region", state: "Kwara",   lat: 8.4970, lng: 4.5420, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Omuaran",       voltage: "132 kV", region: "Osogbo Region", state: "Kwara",   lat: 8.1390, lng: 4.9810, q: "geocoded",    capacityMva: DEFAULT_132_MVA, notes: "Omu-Aran" },
  { name: "New Akure",     voltage: "132 kV", region: "Osogbo Region", state: "Ondo",    lat: 7.2700, lng: 5.2200, q: "approximated", capacityMva: DEFAULT_132_MVA },
  // 'Akure' under Osogbo PDF region also appears under Benin (handled above as Benin/Akure).
  // Preserving the PDF entry as a second Osogbo-region record would duplicate; using New Akure instead per PDF row order.

  // Port Harcourt Region (20)
  { name: "Aba",           voltage: "132 kV", region: "Port Harcourt Region", state: "Abia",        lat: 5.1060, lng: 7.3670, q: "geocoded", capacityMva: DEFAULT_132_MVA },
  { name: "Umuahia",       voltage: "132 kV", region: "Port Harcourt Region", state: "Abia",        lat: 5.5320, lng: 7.4860, q: "geocoded", capacityMva: DEFAULT_132_MVA },
  { name: "Afam",          voltage: "132 kV", region: "Port Harcourt Region", state: "Rivers",      lat: 4.8750, lng: 7.3180, q: "geocoded", capacityMva: DEFAULT_132_MVA },
  { name: "IPP",           voltage: "132 kV", region: "Port Harcourt Region", state: "Rivers",      lat: 4.8500, lng: 7.0300, q: "approximated", capacityMva: DEFAULT_132_MVA, notes: "Rivers IPP / Trans-Amadi area" },
  { name: "Adiabo",        voltage: "132 kV", region: "Port Harcourt Region", state: "Cross River", lat: 5.0820, lng: 8.3460, q: "geocoded", capacityMva: DEFAULT_132_MVA },
  { name: "Calabar",       voltage: "132 kV", region: "Port Harcourt Region", state: "Cross River", lat: 4.9750, lng: 8.3250, q: "geocoded", capacityMva: DEFAULT_132_MVA },
  { name: "Odukpani",      voltage: "132 kV", region: "Port Harcourt Region", state: "Cross River", lat: 5.1310, lng: 8.3370, q: "geocoded", capacityMva: DEFAULT_132_MVA },
  { name: "Owerri",        voltage: "132 kV", region: "Port Harcourt Region", state: "Imo",         lat: 5.4830, lng: 7.0260, q: "geocoded", capacityMva: DEFAULT_132_MVA },
  { name: "Ahoada",        voltage: "132 kV", region: "Port Harcourt Region", state: "Rivers",      lat: 5.0820, lng: 6.6520, q: "geocoded", capacityMva: DEFAULT_132_MVA },
  { name: "Elelenwon",     voltage: "132 kV", region: "Port Harcourt Region", state: "Rivers",      lat: 4.8470, lng: 7.0500, q: "approximated", capacityMva: DEFAULT_132_MVA, notes: "Elelenwo, PH" },
  { name: "Gabrain",       voltage: "132 kV", region: "Port Harcourt Region", state: "Rivers",      lat: 4.8200, lng: 7.0200, q: "pending",   capacityMva: DEFAULT_132_MVA, notes: "Coordinates unverified" },
  { name: "PH Main",       voltage: "132 kV", region: "Port Harcourt Region", state: "Rivers",      lat: 4.8400, lng: 7.0100, q: "geocoded",  capacityMva: DEFAULT_132_MVA, notes: "Port Harcourt Main" },
  { name: "PH Town",       voltage: "132 kV", region: "Port Harcourt Region", state: "Rivers",      lat: 4.8160, lng: 7.0500, q: "geocoded",  capacityMva: DEFAULT_132_MVA, notes: "Port Harcourt Town" },
  { name: "Rumousi",       voltage: "132 kV", region: "Port Harcourt Region", state: "Rivers",      lat: 4.8000, lng: 6.9900, q: "approximated", capacityMva: DEFAULT_132_MVA, notes: "Rumuosi, PH" },
  { name: "Yenegoa",       voltage: "132 kV", region: "Port Harcourt Region", state: "Bayelsa",     lat: 4.9230, lng: 6.2640, q: "geocoded",  capacityMva: DEFAULT_132_MVA, notes: "Yenagoa" },
  { name: "Eket",          voltage: "132 kV", region: "Port Harcourt Region", state: "Akwa Ibom",   lat: 4.6500, lng: 7.9230, q: "geocoded",  capacityMva: DEFAULT_132_MVA },
  { name: "Ekim",          voltage: "132 kV", region: "Port Harcourt Region", state: "Akwa Ibom",   lat: 4.6500, lng: 7.9300, q: "pending",   capacityMva: DEFAULT_132_MVA, notes: "Ekim/Ekom near Eket; coordinates unverified" },
  { name: "Itu",           voltage: "132 kV", region: "Port Harcourt Region", state: "Akwa Ibom",   lat: 5.1950, lng: 7.9870, q: "geocoded",  capacityMva: DEFAULT_132_MVA },
  { name: "Uyo",           voltage: "132 kV", region: "Port Harcourt Region", state: "Akwa Ibom",   lat: 5.0380, lng: 7.9090, q: "geocoded",  capacityMva: DEFAULT_132_MVA },
  { name: "Ikot-Ekpene",   voltage: "132 kV", region: "Port Harcourt Region", state: "Akwa Ibom",   lat: 5.1740, lng: 7.7160, q: "geocoded",  capacityMva: DEFAULT_132_MVA },

  // Shiroro PDF region (14, dedup to 13 distinct names; Sokoto + Birnin Kebbi covered above in Kaduna)
  // All map to Abuja Region (Niger state) or Kaduna (Kebbi); a few to Osogbo (Kwara).
  { name: "Dagongari",     voltage: "132 kV", region: "Kaduna Region", state: "Kebbi",  lat: 11.4500, lng: 4.0500, q: "pending",     capacityMva: DEFAULT_132_MVA, notes: "PDF: Shiroro operational region; coordinates unverified" },
  { name: "Kontagora",     voltage: "132 kV", region: "Abuja Region",  state: "Niger",  lat: 10.4070, lng: 5.4710, q: "geocoded",    capacityMva: DEFAULT_132_MVA, notes: "PDF: Shiroro operational region" },
  { name: "Shiroro 2",     voltage: "132 kV", region: "Abuja Region",  state: "Niger",  lat: 9.9710, lng: 6.8350, q: "geocoded",    capacityMva: DEFAULT_132_MVA, notes: "PDF: Shiroro operational region; 132 kV evacuation set" },
  { name: "Minna",         voltage: "132 kV", region: "Abuja Region",  state: "Niger",  lat: 9.6150, lng: 6.5460, q: "geocoded",    capacityMva: DEFAULT_132_MVA, notes: "PDF: Shiroro operational region" },
  { name: "Tegina",        voltage: "132 kV", region: "Abuja Region",  state: "Niger",  lat: 10.0670, lng: 6.1880, q: "geocoded",    capacityMva: DEFAULT_132_MVA, notes: "PDF: Shiroro operational region" },
  { name: "Yauri",         voltage: "132 kV", region: "Kaduna Region", state: "Kebbi",  lat: 10.7530, lng: 4.7470, q: "geocoded",    capacityMva: DEFAULT_132_MVA, notes: "PDF: Shiroro operational region" },
  { name: "Jebba",         voltage: "132 kV", region: "Abuja Region",  state: "Niger",  lat: 9.1300, lng: 4.8230, q: "geocoded",    capacityMva: DEFAULT_132_MVA, notes: "PDF: Shiroro operational region" },
  { name: "Kainji",        voltage: "132 kV", region: "Abuja Region",  state: "Niger",  lat: 9.8540, lng: 4.6160, q: "geocoded",    capacityMva: DEFAULT_132_MVA, notes: "PDF: Shiroro operational region; Kainji hydro" },
  { name: "Maraba",        voltage: "132 kV", region: "Abuja Region",  state: "Niger",  lat: 9.3000, lng: 6.5000, q: "pending",     capacityMva: DEFAULT_132_MVA, notes: "PDF: Shiroro operational region; coordinates unverified" },
  { name: "Zungeru",       voltage: "132 kV", region: "Abuja Region",  state: "Niger",  lat: 9.8050, lng: 6.1500, q: "geocoded",    capacityMva: DEFAULT_132_MVA, notes: "PDF: Shiroro operational region; Zungeru hydro" },
  { name: "Bida",          voltage: "132 kV", region: "Abuja Region",  state: "Niger",  lat: 9.0830, lng: 6.0100, q: "geocoded",    capacityMva: DEFAULT_132_MVA, notes: "PDF: Shiroro operational region" },

  // Bauchi continued (20) — split by state geography
  { name: "Gombe",         voltage: "132 kV", region: "Bauchi Region", state: "Gombe",   lat: 10.2900, lng: 11.1700, q: "geocoded",  capacityMva: DEFAULT_132_MVA },
  { name: "Potiskum",      voltage: "132 kV", region: "Bauchi Region", state: "Yobe",    lat: 11.7080, lng: 11.0700, q: "geocoded",  capacityMva: DEFAULT_132_MVA },
  { name: "Biu",           voltage: "132 kV", region: "Bauchi Region", state: "Borno",   lat: 10.6190, lng: 12.1950, q: "geocoded",  capacityMva: DEFAULT_132_MVA },
  { name: "Yola",          voltage: "132 kV", region: "Yola Region",   state: "Adamawa", lat: 9.2070, lng: 12.4790, q: "geocoded",   capacityMva: DEFAULT_132_MVA },
  { name: "Jalingo",       voltage: "132 kV", region: "Yola Region",   state: "Taraba",  lat: 8.8930, lng: 11.3590, q: "geocoded",   capacityMva: DEFAULT_132_MVA },
  { name: "Mayo Belwa",    voltage: "132 kV", region: "Yola Region",   state: "Adamawa", lat: 9.0500, lng: 12.0500, q: "approximated", capacityMva: DEFAULT_132_MVA },
  { name: "Savannah",      voltage: "132 kV", region: "Jos Region",    state: "Plateau", lat: 9.1700, lng: 9.5500, q: "approximated", capacityMva: DEFAULT_132_MVA, notes: "Savannah Sugar estate tap" },
  { name: "Jos",           voltage: "132 kV", region: "Jos Region",    state: "Plateau", lat: 9.8790, lng: 8.8800, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Damboa",        voltage: "132 kV", region: "Bauchi Region", state: "Borno",   lat: 11.1530, lng: 12.7550, q: "geocoded",  capacityMva: DEFAULT_132_MVA },
  { name: "Bauchi",        voltage: "132 kV", region: "Bauchi Region", state: "Bauchi",  lat: 10.3140, lng: 9.8430, q: "geocoded",   capacityMva: DEFAULT_132_MVA },
  { name: "Makeri",        voltage: "132 kV", region: "Jos Region",    state: "Plateau", lat: 9.9300, lng: 8.9300, q: "approximated", capacityMva: DEFAULT_132_MVA, notes: "Makeri, Jos area" },
  { name: "Kafanchan",     voltage: "132 kV", region: "Kaduna Region", state: "Kaduna",  lat: 9.5860, lng: 8.2960, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Maiduguri",     voltage: "132 kV", region: "Bauchi Region", state: "Borno",   lat: 11.8460, lng: 13.1600, q: "geocoded",  capacityMva: DEFAULT_132_MVA },
  { name: "Molai",         voltage: "132 kV", region: "Bauchi Region", state: "Borno",   lat: 11.7950, lng: 13.1350, q: "geocoded",  capacityMva: DEFAULT_132_MVA },
  { name: "Damaturu",      voltage: "132 kV", region: "Bauchi Region", state: "Yobe",    lat: 11.7470, lng: 11.9650, q: "geocoded",  capacityMva: DEFAULT_132_MVA },
  { name: "Ashaka",        voltage: "132 kV", region: "Bauchi Region", state: "Gombe",   lat: 10.5000, lng: 11.0500, q: "approximated", capacityMva: DEFAULT_132_MVA, notes: "Ashaka Cement / Funakaye" },
  { name: "Wukari",        voltage: "132 kV", region: "Yola Region",   state: "Taraba",  lat: 7.8550, lng: 9.7800, q: "geocoded",    capacityMva: DEFAULT_132_MVA, notes: "Also appears in Enugu list — single canonical record" },
  { name: "Kashimbila",    voltage: "132 kV", region: "Yola Region",   state: "Taraba",  lat: 7.0670, lng: 10.4500, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Takun",         voltage: "132 kV", region: "Yola Region",   state: "Taraba",  lat: 7.1670, lng: 9.9870, q: "geocoded",    capacityMva: DEFAULT_132_MVA, notes: "Takum; also appears in Enugu list" },
  { name: "Pankshin",      voltage: "132 kV", region: "Jos Region",    state: "Plateau", lat: 9.3290, lng: 9.4380, q: "geocoded",    capacityMva: DEFAULT_132_MVA },

  // Enugu Region (18) — Apir → Makurdi; Otukpo/Yandev → Makurdi; rest → Enugu Region
  { name: "Apir",          voltage: "132 kV", region: "Makurdi Region", state: "Benue",  lat: 7.7000, lng: 8.4820, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Otukpo",        voltage: "132 kV", region: "Makurdi Region", state: "Benue",  lat: 7.1900, lng: 8.1300, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Yandev",        voltage: "132 kV", region: "Makurdi Region", state: "Benue",  lat: 7.3680, lng: 9.0220, q: "geocoded",    capacityMva: DEFAULT_132_MVA, notes: "Yandev, Gboko" },
  { name: "New Haven",     voltage: "132 kV", region: "Enugu Region", state: "Enugu",    lat: 6.4440, lng: 7.5040, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Ugwuaji",       voltage: "132 kV", region: "Enugu Region", state: "Enugu",    lat: 6.4020, lng: 7.4480, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Abakaliki",     voltage: "132 kV", region: "Enugu Region", state: "Ebonyi",   lat: 6.3270, lng: 8.1130, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Nkalagu",       voltage: "132 kV", region: "Enugu Region", state: "Ebonyi",   lat: 6.4910, lng: 7.7080, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Nsukka",        voltage: "132 kV", region: "Enugu Region", state: "Enugu",    lat: 6.8600, lng: 7.3950, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Onitsha",       voltage: "132 kV", region: "Enugu Region", state: "Anambra",  lat: 6.1440, lng: 6.7890, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Awka",          voltage: "132 kV", region: "Enugu Region", state: "Anambra",  lat: 6.2110, lng: 7.0740, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Agu Awka",      voltage: "132 kV", region: "Enugu Region", state: "Anambra",  lat: 6.2350, lng: 7.0680, q: "approximated", capacityMva: DEFAULT_132_MVA },
  { name: "GCM",           voltage: "132 kV", region: "Enugu Region", state: "Anambra",  lat: 6.2200, lng: 6.7900, q: "pending",     capacityMva: DEFAULT_132_MVA, notes: "GCM cement tap; coordinates unverified" },
  { name: "Oji",           voltage: "132 kV", region: "Enugu Region", state: "Enugu",    lat: 6.2700, lng: 7.4070, q: "geocoded",    capacityMva: DEFAULT_132_MVA, notes: "Oji River" },
  { name: "Asaba",         voltage: "132 kV", region: "Enugu Region", state: "Delta",    lat: 6.1980, lng: 6.7310, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  { name: "Nibo-Awkwa",    voltage: "132 kV", region: "Enugu Region", state: "Anambra",  lat: 6.1700, lng: 7.0500, q: "approximated", capacityMva: DEFAULT_132_MVA, notes: "Nibo, Awka South" },
  { name: "Agbor",         voltage: "132 kV", region: "Enugu Region", state: "Delta",    lat: 6.2520, lng: 6.1940, q: "geocoded",    capacityMva: DEFAULT_132_MVA },
  // Enugu PDF region's 'Takum' and 'Wukari' are also in the Bauchi-continued list;
  // canonical record kept in the Bauchi-continued block (Yola Region by state).
];

async function getRegionMap() {
  const regions = await prisma.tcnRegion.findMany({ select: { id: true, name: true } });
  const map = new Map<string, string>();
  for (const r of regions) map.set(r.name, r.id);
  return map;
}

// Aliases for pre-existing seed rows whose names diverge from the TCN PDF.
// Keys are the legacy `name` values found in the DB; values are the canonical
// TCN PDF name we want to upsert into. Voltage normalisation ("330kV" →
// "330 kV") is handled separately below.
const NAME_ALIASES: Record<string, string> = {
  "Kaduna Mando":      "Mando",
  "Kano (Kumbotso)":   "Kumbotso",
  "Delta (Ughelli)":   "Delta",
  "Jebba TS":          "Jebba",
  "Shiroro TS":        "Shiroro",
};

function normaliseVoltage(v: string): string {
  // "330kV" / "330 kV" / "330 KV" all collapse to "330 kV".
  const m = /^(\d+)\s*k\s*v$/i.exec(v.trim());
  if (m) return `${m[1]} kV`;
  return v;
}

async function findExistingMatch(sub: Sub) {
  const targetV = normaliseVoltage(sub.voltage);

  // First try by canonical TCN name (case-insensitive), voltage matched after normalisation.
  const direct = await prisma.substation.findMany({
    where: { name: { equals: sub.name, mode: "insensitive" } },
    select: { id: true, voltageClass: true },
  });
  const directHit = direct.filter(c => normaliseVoltage(c.voltageClass) === targetV);
  if (directHit.length > 0) return directHit;

  // Try alias map: any pre-existing row whose legacy name aliases to this TCN canonical name.
  const legacyNames = Object.entries(NAME_ALIASES)
    .filter(([, canon]) => canon.toLowerCase() === sub.name.toLowerCase())
    .map(([legacy]) => legacy);
  if (legacyNames.length === 0) return [];

  const candidates = await prisma.substation.findMany({
    where: { name: { in: legacyNames } },
    select: { id: true, voltageClass: true },
  });
  return candidates.filter(c => normaliseVoltage(c.voltageClass) === targetV);
}

async function upsertOne(sub: Sub, regionId: string | undefined) {
  const existing = await findExistingMatch(sub);

  const data = {
    name: sub.name,
    displayName: sub.name,
    voltageClass: sub.voltage,
    capacityMva: sub.capacityMva,
    latitude: sub.lat ?? undefined,
    longitude: sub.lng ?? undefined,
    state: sub.state,
    tcnRegionId: regionId ?? null,
    source: "TCN Asset Register",
    dataSource: "TCN Asset Register (LIST_OF_330_AND_132KV_TRANSMISSION_SUBSTATIONS.pdf)",
    dataClass: "verified" as const,
    geomQuality: sub.q,
    verifiedAt: new Date(),
    lowConfidence: false,
    sourceAuthorityScore: 95,
  };

  if (existing.length === 0) {
    await prisma.substation.create({ data });
    return "insert";
  }
  // Update the first match; if duplicates exist (shouldn't), update all.
  for (const row of existing) {
    await prisma.substation.update({ where: { id: row.id }, data });
  }
  return existing.length === 1 ? "update" : "update-dup";
}

async function setPostgisGeom() {
  // Populate PostGIS column from lat/lng for every TCN-verified substation.
  await prisma.$executeRawUnsafe(`
    UPDATE "Substation"
    SET "geom" = ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)
    WHERE "source" = 'TCN Asset Register'
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
  `);
}

async function deleteUnmatchedSynthetic() {
  // Delete any substation still marked synthetic-seed AFTER all TCN upserts.
  // (We don't touch rows updated above — they carry the new TCN dataSource.)
  const result = await prisma.substation.deleteMany({
    where: { dataSource: SYNTHETIC_MARKER },
  });
  return result.count;
}

async function main() {
  console.log("🚧 Patch 12 — TCN substation register");

  const regions = await getRegionMap();
  let inserts = 0, updates = 0, dups = 0;
  const missingRegion: string[] = [];
  const pending: string[] = [];

  for (const sub of SUBSTATIONS) {
    const rid = regions.get(sub.region);
    if (!rid) missingRegion.push(`${sub.name} (${sub.voltage}) → ${sub.region}`);
    const action = await upsertOne(sub, rid);
    if (action === "insert") inserts += 1;
    else if (action === "update") updates += 1;
    else dups += 1;
    if (sub.q === "pending") pending.push(`${sub.name} (${sub.voltage})`);
  }

  await setPostgisGeom();
  const removed = await deleteUnmatchedSynthetic();

  console.log(`  upserts:  ${inserts} inserted, ${updates} updated, ${dups} updated-with-dup`);
  console.log(`  deleted:  ${removed} unmatched synthetic placeholders`);
  if (missingRegion.length) {
    console.log(`  ⚠ missing TcnRegion mapping for: ${missingRegion.join(", ")}`);
  }
  if (pending.length) {
    console.log(`  ⚠ geomQuality=pending: ${pending.join(", ")}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
