import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function uid() {
  return randomBytes(16).toString("hex").substring(0, 8);
}

async function main() {
  console.log("🌱 Seeding National Energy War Room database...");

  // ── Clear existing data ────────────────────────────────────────────────────
  await prisma.glossaryTerm.deleteMany();
  await prisma.discoCustomerCareChannel.deleteMany();
  await prisma.reaZonalOffice.deleteMany();
  await prisma.tcnControlCentre.deleteMany();
  await prisma.tcnRegion.deleteMany();
  await prisma.nemsaFieldOffice.deleteMany();
  await prisma.forumOffice.deleteMany();
  await prisma.complaintEvent.deleteMany();
  await prisma.complaintAssignment.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.gencoAllocation.deleteMany();
  await prisma.settlementInvoice.deleteMany();
  await prisma.gridMetric.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.feeder.deleteMany();
  await prisma.diversionOpportunity.deleteMany();
  await prisma.plantUnit.deleteMany();
  await prisma.plant.deleteMany();
  await prisma.transmissionLine.deleteMany();
  await prisma.substation.deleteMany();
  await prisma.disCo.deleteMany();
  await prisma.gasPipeline.deleteMany();
  await prisma.capitalProject.deleteMany();
  await prisma.miniGrid.deleteMany();
  await prisma.escalationRule.deleteMany();
  await prisma.escalationStep.deleteMany();
  await prisma.authorityInstrument.deleteMany();
  await prisma.stakeholder.deleteMany();
  await prisma.valueChainLink.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organisation.deleteMany();
  await prisma.systemSetting.deleteMany();
  console.log("  → Cleared existing data");

  // ── ORGANISATIONS ──────────────────────────────────────────────────────────
  const orgs = await Promise.all([
    prisma.organisation.create({ data: { name: "TCN (Transmission Company of Nigeria)", type: "TCN", website: "https://tcn.org.ng" } }),
    prisma.organisation.create({ data: { name: "NBET (Nigerian Bulk Electricity Trading)", type: "NBET", website: "https://nbet.com.ng" } }),
    prisma.organisation.create({ data: { name: "NERC", type: "NERC", website: "https://nerc.gov.ng" } }),
    prisma.organisation.create({ data: { name: "REA (Rural Electrification Agency)", type: "REA", website: "https://rea.gov.ng" } }),
    prisma.organisation.create({ data: { name: "Egbin Power Plc", type: "GENCO" } }),
    prisma.organisation.create({ data: { name: "Transcorp Power (Ughelli/Afam)", type: "GENCO" } }),
    prisma.organisation.create({ data: { name: "Mainstream Energy Solutions", type: "GENCO" } }),
    prisma.organisation.create({ data: { name: "Azura Power West Africa", type: "GENCO" } }),
    prisma.organisation.create({ data: { name: "NDPHC (Niger Delta Power Holding Company)", type: "NDPHC", website: "https://ndphc.net" } }),
    prisma.organisation.create({ data: { name: "Eko Electricity Distribution Company", type: "DISCO" } }),
    prisma.organisation.create({ data: { name: "Ikeja Electric", type: "DISCO" } }),
    prisma.organisation.create({ data: { name: "Abuja Electricity Distribution Company", type: "DISCO" } }),
    prisma.organisation.create({ data: { name: "Ibadan Electricity Distribution Company", type: "DISCO" } }),
    prisma.organisation.create({ data: { name: "Enugu Electricity Distribution Company", type: "DISCO" } }),
    prisma.organisation.create({ data: { name: "Benin Electricity Distribution Company", type: "DISCO" } }),
    prisma.organisation.create({ data: { name: "Port Harcourt Electricity Distribution Company", type: "DISCO" } }),
    prisma.organisation.create({ data: { name: "Kaduna Electricity Distribution Company", type: "DISCO" } }),
    prisma.organisation.create({ data: { name: "Jos Electricity Distribution Company", type: "DISCO" } }),
    prisma.organisation.create({ data: { name: "Kano Electricity Distribution Company", type: "DISCO" } }),
    prisma.organisation.create({ data: { name: "Yola Electricity Distribution Company", type: "DISCO" } }),
    prisma.organisation.create({ data: { name: "NGIC (Nigerian Gas Infrastructure Corporation)", type: "NGIC" } }),
    prisma.organisation.create({ data: { name: "FMP (Federal Ministry of Power)", type: "FMP", website: "https://power.gov.ng" } }),
    prisma.organisation.create({ data: { name: "NAOC/Agip (Okpai)", type: "GENCO" } }),
    prisma.organisation.create({ data: { name: "Pacific Energy", type: "GENCO" } }),
    prisma.organisation.create({ data: { name: "North South Power Company (Shiroro)", type: "GENCO" } }),
    prisma.organisation.create({ data: { name: "Geregu Power Plc", type: "GENCO" } }),
  ]);

  const [tcnOrg, nbetOrg, nercOrg, reaOrg,
    egbinOrg, transcorpOrg, mainstreamOrg, azuraOrg, ndphcOrg,
    ekoOrg, ikejaOrg, abujaOrg, ibadanOrg, enuguOrg, beninOrg, phOrg, kadunaOrg, josOrg, kanoOrg, yolaOrg,
    ngicOrg, fmpOrg, agipOrg, pacificOrg, northSouthOrg, gereguOrg] = orgs;

  console.log("  → Organisations created");

  // ── USERS ──────────────────────────────────────────────────────────────────
  const adminPwd = await bcrypt.hash("Admin@WarRoom2025!", 12);
  const staffPwd = await bcrypt.hash("Staff@Ministry2025", 12);
  const agentPwd = await bcrypt.hash("Agent@DisCo2025", 12);

  await prisma.user.create({ data: { email: "admin@warroom.gov.ng", passwordHash: adminPwd, role: "ADMIN", fullName: "System Administrator", phone: "+2348000000001", isActive: true } });
  await prisma.user.create({ data: { email: "minister@power.gov.ng", passwordHash: staffPwd, role: "MINISTER", fullName: "Hon. Minister of Power", phone: "+2348000000002", isActive: true } });
  await prisma.user.create({ data: { email: "staff@power.gov.ng", passwordHash: staffPwd, role: "MINISTRY_STAFF", fullName: "Senior Technical Adviser", phone: "+2348000000003", isActive: true } });
  await prisma.user.create({ data: { email: "analyst@nerc.gov.ng", passwordHash: staffPwd, role: "NERC_VIEWER", fullName: "NERC Policy Analyst", phone: "+2348000000004", organisationId: nercOrg!.id, isActive: true } });
  await prisma.user.create({ data: { email: "agent@ekedc.com.ng", passwordHash: agentPwd, role: "DISCO_AGENT", fullName: "Eko DisCo CCU Agent", phone: "+2348000000005", organisationId: ekoOrg!.id, isActive: true } });
  console.log("  → Users created (admin@warroom.gov.ng / Admin@WarRoom2025!)");

  // ── SUBSTATIONS — 43 from TCN/NERC 2025 data ─────────────────────────────
  const substationData = [
    { name: "Ikeja West",         voltageClass: "330kV", capacityMva: 1200, lat: 6.601,  lng: 3.295,  state: "Lagos" },
    { name: "Apo",                voltageClass: "330kV", capacityMva: 1000, lat: 8.999,  lng: 7.45,   state: "FCT" },
    { name: "Osogbo",             voltageClass: "330kV", capacityMva: 750,  lat: 7.771,  lng: 4.556,  state: "Osun" },
    { name: "Aja",                voltageClass: "330kV", capacityMva: 600,  lat: 6.469,  lng: 3.572,  state: "Lagos" },
    { name: "Akangba",            voltageClass: "132kV", capacityMva: 600,  lat: 6.51,   lng: 3.351,  state: "Lagos" },
    { name: "Egbin",              voltageClass: "330kV", capacityMva: 1320, lat: 6.561,  lng: 3.504,  state: "Lagos" },
    { name: "Benin",              voltageClass: "330kV", capacityMva: 900,  lat: 6.341,  lng: 5.617,  state: "Edo" },
    { name: "Onitsha",            voltageClass: "330kV", capacityMva: 600,  lat: 6.143,  lng: 6.802,  state: "Anambra" },
    { name: "New Haven",          voltageClass: "330kV", capacityMva: 600,  lat: 6.439,  lng: 7.495,  state: "Enugu" },
    { name: "Alaoji",             voltageClass: "330kV", capacityMva: 600,  lat: 5.116,  lng: 7.361,  state: "Abia" },
    { name: "Afam",               voltageClass: "330kV", capacityMva: 600,  lat: 4.926,  lng: 7.122,  state: "Rivers" },
    { name: "Port Harcourt Main", voltageClass: "330kV", capacityMva: 480,  lat: 4.819,  lng: 7.038,  state: "Rivers" },
    { name: "Calabar",            voltageClass: "330kV", capacityMva: 480,  lat: 4.962,  lng: 8.331,  state: "Cross River" },
    { name: "Sapele",             voltageClass: "330kV", capacityMva: 750,  lat: 5.89,   lng: 5.692,  state: "Delta" },
    { name: "Delta (Ughelli)",    voltageClass: "330kV", capacityMva: 900,  lat: 5.493,  lng: 5.999,  state: "Delta" },
    { name: "Aladja",             voltageClass: "330kV", capacityMva: 480,  lat: 5.951,  lng: 5.811,  state: "Delta" },
    { name: "Ayede",              voltageClass: "330kV", capacityMva: 600,  lat: 7.435,  lng: 3.876,  state: "Oyo" },
    { name: "Olorunsogo",         voltageClass: "330kV", capacityMva: 600,  lat: 6.965,  lng: 3.213,  state: "Ogun" },
    { name: "Omotosho",           voltageClass: "330kV", capacityMva: 480,  lat: 6.43,   lng: 4.825,  state: "Ondo" },
    { name: "Akure",              voltageClass: "132kV", capacityMva: 240,  lat: 7.25,   lng: 5.195,  state: "Ondo" },
    { name: "Ilorin",             voltageClass: "330kV", capacityMva: 480,  lat: 8.498,  lng: 4.541,  state: "Kwara" },
    { name: "Jebba TS",           voltageClass: "330kV", capacityMva: 750,  lat: 9.137,  lng: 4.789,  state: "Niger" },
    { name: "Shiroro TS",         voltageClass: "330kV", capacityMva: 600,  lat: 9.974,  lng: 6.834,  state: "Niger" },
    { name: "Katampe",            voltageClass: "330kV", capacityMva: 600,  lat: 9.083,  lng: 7.475,  state: "FCT" },
    { name: "Gwagwalada",         voltageClass: "330kV", capacityMva: 480,  lat: 8.943,  lng: 7.082,  state: "FCT" },
    { name: "Lokoja",             voltageClass: "330kV", capacityMva: 480,  lat: 7.797,  lng: 6.741,  state: "Kogi" },
    { name: "Makurdi",            voltageClass: "330kV", capacityMva: 480,  lat: 7.733,  lng: 8.521,  state: "Benue" },
    { name: "Jos",                voltageClass: "330kV", capacityMva: 480,  lat: 9.928,  lng: 8.892,  state: "Plateau" },
    { name: "Gombe",              voltageClass: "330kV", capacityMva: 480,  lat: 10.29,  lng: 11.171, state: "Gombe" },
    { name: "Yola",               voltageClass: "330kV", capacityMva: 360,  lat: 9.207,  lng: 12.481, state: "Adamawa" },
    { name: "Damaturu",           voltageClass: "330kV", capacityMva: 240,  lat: 11.747, lng: 11.961, state: "Yobe" },
    { name: "Maiduguri",          voltageClass: "330kV", capacityMva: 360,  lat: 11.846, lng: 13.16,  state: "Borno" },
    { name: "Bauchi",             voltageClass: "330kV", capacityMva: 480,  lat: 10.314, lng: 9.844,  state: "Bauchi" },
    { name: "Kano (Kumbotso)",    voltageClass: "330kV", capacityMva: 600,  lat: 11.929, lng: 8.519,  state: "Kano" },
    { name: "Dakata",             voltageClass: "132kV", capacityMva: 240,  lat: 12.004, lng: 8.527,  state: "Kano" },
    { name: "Kaduna Mando",       voltageClass: "330kV", capacityMva: 480,  lat: 10.61,  lng: 7.471,  state: "Kaduna" },
    { name: "Zaria",              voltageClass: "132kV", capacityMva: 240,  lat: 11.092, lng: 7.715,  state: "Kaduna" },
    { name: "Sokoto",             voltageClass: "330kV", capacityMva: 360,  lat: 13.06,  lng: 5.247,  state: "Sokoto" },
    { name: "Birnin Kebbi",       voltageClass: "330kV", capacityMva: 240,  lat: 12.451, lng: 4.197,  state: "Kebbi" },
    { name: "Gwiwa",              voltageClass: "132kV", capacityMva: 120,  lat: 12.692, lng: 9.342,  state: "Jigawa" },
    { name: "Funtua",             voltageClass: "132kV", capacityMva: 240,  lat: 11.522, lng: 7.31,   state: "Katsina" },
    { name: "Gusau",              voltageClass: "132kV", capacityMva: 120,  lat: 12.169, lng: 6.66,   state: "Zamfara" },
    { name: "Mambilla TS",        voltageClass: "330kV", capacityMva: 1500, lat: 6.72,   lng: 11.29,  state: "Taraba", notes: "PLANNED — linked to Mambilla Hydro" },
  ];

  const createdSubstations = await Promise.all(
    substationData.map(s => prisma.substation.create({
      data: { name: s.name, voltageClass: s.voltageClass, capacityMva: s.capacityMva, latitude: s.lat, longitude: s.lng, state: s.state, ownerOrgId: tcnOrg!.id },
    }))
  );

  const subMap: Record<string, string> = {};
  createdSubstations.forEach(s => { subMap[s.name] = s.id; });

  // ── TRANSMISSION LINES ─────────────────────────────────────────────────────
  await Promise.all([
    prisma.transmissionLine.create({ data: { name: "Egbin–Ikeja West",    voltageKv: 330, lengthKm: 62,  capacityMva: 750, currentLoadingPct: 91, fromSubstationId: subMap["Egbin"],          toSubstationId: subMap["Ikeja West"],    status: "ACTIVE",       lossesPct: 1.2 } }),
    prisma.transmissionLine.create({ data: { name: "Benin–Ikeja West",    voltageKv: 330, lengthKm: 280, capacityMva: 600, currentLoadingPct: 74, fromSubstationId: subMap["Benin"],          toSubstationId: subMap["Ikeja West"],    status: "ACTIVE",       lossesPct: 2.1 } }),
    prisma.transmissionLine.create({ data: { name: "Shiroro–Kaduna",      voltageKv: 330, lengthKm: 96,  capacityMva: 450, currentLoadingPct: 65, fromSubstationId: subMap["Shiroro TS"],     toSubstationId: subMap["Kaduna Mando"],  status: "ACTIVE",       lossesPct: 0.9 } }),
    prisma.transmissionLine.create({ data: { name: "Jebba–Shiroro",       voltageKv: 330, lengthKm: 244, capacityMva: 400, currentLoadingPct: 58, fromSubstationId: subMap["Jebba TS"],       toSubstationId: subMap["Shiroro TS"],    status: "ACTIVE",       lossesPct: 1.5 } }),
    prisma.transmissionLine.create({ data: { name: "Onitsha–New Haven",   voltageKv: 330, lengthKm: 96,  capacityMva: 300, currentLoadingPct: 82, fromSubstationId: subMap["Onitsha"],        toSubstationId: subMap["New Haven"],     status: "ACTIVE",       lossesPct: 1.0 } }),
    prisma.transmissionLine.create({ data: { name: "Kaduna–Kano",         voltageKv: 330, lengthKm: 230, capacityMva: 350, currentLoadingPct: 71, fromSubstationId: subMap["Kaduna Mando"],   toSubstationId: subMap["Kano (Kumbotso)"],status: "ACTIVE",      lossesPct: 1.8 } }),
    prisma.transmissionLine.create({ data: { name: "Ikeja West–Aja",      voltageKv: 330, lengthKm: 42,  capacityMva: 600, currentLoadingPct: 68, fromSubstationId: subMap["Ikeja West"],     toSubstationId: subMap["Aja"],           status: "ACTIVE",       lossesPct: 0.8 } }),
    prisma.transmissionLine.create({ data: { name: "Benin–Delta (Ughelli)",voltageKv: 330, lengthKm: 110, capacityMva: 600, currentLoadingPct: 55, fromSubstationId: subMap["Benin"],         toSubstationId: subMap["Delta (Ughelli)"],status: "ACTIVE",      lossesPct: 1.3 } }),
    prisma.transmissionLine.create({ data: { name: "Afam–Port Harcourt",  voltageKv: 330, lengthKm: 24,  capacityMva: 480, currentLoadingPct: 79, fromSubstationId: subMap["Afam"],           toSubstationId: subMap["Port Harcourt Main"], status: "ACTIVE",   lossesPct: 0.6 } }),
    prisma.transmissionLine.create({ data: { name: "Osogbo–Ayede",        voltageKv: 330, lengthKm: 162, capacityMva: 600, currentLoadingPct: 62, fromSubstationId: subMap["Osogbo"],         toSubstationId: subMap["Ayede"],         status: "ACTIVE",       lossesPct: 1.4 } }),
    prisma.transmissionLine.create({ data: { name: "Katampe–Gwagwalada",  voltageKv: 330, lengthKm: 50,  capacityMva: 480, currentLoadingPct: 45, fromSubstationId: subMap["Katampe"],        toSubstationId: subMap["Gwagwalada"],    status: "ACTIVE",       lossesPct: 0.7 } }),
    prisma.transmissionLine.create({ data: { name: "Apo–Katampe",         voltageKv: 330, lengthKm: 18,  capacityMva: 1000, currentLoadingPct: 83, fromSubstationId: subMap["Apo"],           toSubstationId: subMap["Katampe"],       status: "ACTIVE",       lossesPct: 0.4 } }),
  ]);
  console.log("  → 43 substations and 12 transmission lines created");

  // ── PLANTS — 30 from NERC Q1 2025 data ───────────────────────────────────
  const plantRows = await Promise.all([
    prisma.plant.create({ data: { name: "Egbin",               type: "GAS_STEAM", installedMw: 1320, availableMw: 1000, actualMw: 930,  state: "Lagos",       latitude: 6.561,  longitude: 3.504,  status: "OPERATING",   gencoOrgId: egbinOrg!.id,      paf: 76,  notes: "NERC Q1 2025. Largest thermal station." } }),
    prisma.plant.create({ data: { name: "Azura-Edo IPP",        type: "GAS_CCGT",  installedMw: 461,  availableMw: 430,  actualMw: 420,  state: "Edo",         latitude: 6.544,  longitude: 5.936,  status: "OPERATING",   gencoOrgId: azuraOrg!.id,      paf: 91,  notes: "Vesting contract-backed. ~91% PAF Q1 2025." } }),
    prisma.plant.create({ data: { name: "Alaoji NIPP",          type: "GAS_OCGT",  installedMw: 1131, availableMw: 0,    actualMw: 0,    state: "Abia",        latitude: 5.116,  longitude: 7.361,  status: "OUT",         gencoOrgId: ndphcOrg!.id,      paf: 0,   notes: "Gas and operational constraints. Zero output Q1 2025." } }),
    prisma.plant.create({ data: { name: "Kainji",               type: "HYDRO",     installedMw: 760,  availableMw: 540,  actualMw: 480,  state: "Niger",       latitude: 9.866,  longitude: 4.616,  status: "OPERATING",   gencoOrgId: mainstreamOrg!.id, paf: 71,  commissioningDate: new Date("1968-01-01") } }),
    prisma.plant.create({ data: { name: "Jebba",                type: "HYDRO",     installedMw: 578,  availableMw: 480,  actualMw: 430,  state: "Niger",       latitude: 9.137,  longitude: 4.789,  status: "OPERATING",   gencoOrgId: mainstreamOrg!.id, paf: 83 } }),
    prisma.plant.create({ data: { name: "Shiroro",              type: "HYDRO",     installedMw: 600,  availableMw: 450,  actualMw: 380,  state: "Niger",       latitude: 9.974,  longitude: 6.834,  status: "OPERATING",   gencoOrgId: northSouthOrg!.id, paf: 75 } }),
    prisma.plant.create({ data: { name: "Zungeru",              type: "HYDRO",     installedMw: 700,  availableMw: 500,  actualMw: 420,  state: "Niger",       latitude: 9.85,   longitude: 6.07,   status: "OPERATING",   gencoOrgId: mainstreamOrg!.id, paf: 71,  commissioningDate: new Date("2023-06-01"), notes: "Completed 2023. Sinohydro EPC." } }),
    prisma.plant.create({ data: { name: "Sapele Steam",         type: "GAS_STEAM", installedMw: 1020, availableMw: 100,  actualMw: 90,   state: "Delta",       latitude: 5.89,   longitude: 5.692,  status: "PARTIAL",     gencoOrgId: transcorpOrg!.id,  paf: 10,  notes: "Aged steam units, limited gas supply." } }),
    prisma.plant.create({ data: { name: "Sapele NIPP",          type: "GAS_OCGT",  installedMw: 450,  availableMw: 220,  actualMw: 180,  state: "Delta",       latitude: 5.892,  longitude: 5.694,  status: "PARTIAL",     gencoOrgId: ndphcOrg!.id,      paf: 49,  notes: "Gas constraint." } }),
    prisma.plant.create({ data: { name: "Geregu Gas",           type: "GAS_OCGT",  installedMw: 435,  availableMw: 380,  actualMw: 340,  state: "Kogi",        latitude: 7.572,  longitude: 6.703,  status: "OPERATING",   gencoOrgId: gereguOrg!.id,     paf: 87 } }),
    prisma.plant.create({ data: { name: "Geregu NIPP",          type: "GAS_OCGT",  installedMw: 434,  availableMw: 380,  actualMw: 320,  state: "Kogi",        latitude: 7.574,  longitude: 6.704,  status: "OPERATING",   gencoOrgId: ndphcOrg!.id,      paf: 88 } }),
    prisma.plant.create({ data: { name: "Olorunsogo Gas",       type: "GAS_OCGT",  installedMw: 335,  availableMw: 260,  actualMw: 200,  state: "Ogun",        latitude: 6.965,  longitude: 3.213,  status: "OPERATING",   gencoOrgId: pacificOrg!.id,    paf: 78 } }),
    prisma.plant.create({ data: { name: "Olorunsogo NIPP",      type: "GAS_OCGT",  installedMw: 750,  availableMw: 220,  actualMw: 180,  state: "Ogun",        latitude: 6.967,  longitude: 3.215,  status: "PARTIAL",     gencoOrgId: ndphcOrg!.id,      paf: 29,  notes: "Gas pipeline constraints." } }),
    prisma.plant.create({ data: { name: "Omotosho Gas",         type: "GAS_OCGT",  installedMw: 335,  availableMw: 280,  actualMw: 240,  state: "Ondo",        latitude: 6.43,   longitude: 4.825,  status: "OPERATING",   gencoOrgId: pacificOrg!.id,    paf: 84 } }),
    prisma.plant.create({ data: { name: "Omotosho NIPP",        type: "GAS_OCGT",  installedMw: 500,  availableMw: 250,  actualMw: 200,  state: "Ondo",        latitude: 6.432,  longitude: 4.827,  status: "PARTIAL",     gencoOrgId: ndphcOrg!.id,      paf: 50,  notes: "Gas constraint." } }),
    prisma.plant.create({ data: { name: "Afam VI",              type: "GAS_CCGT",  installedMw: 650,  availableMw: 540,  actualMw: 480,  state: "Rivers",      latitude: 4.926,  longitude: 7.122,  status: "OPERATING",   gencoOrgId: transcorpOrg!.id,  paf: 83 } }),
    prisma.plant.create({ data: { name: "Afam IV-V",            type: "GAS_OCGT",  installedMw: 726,  availableMw: 80,   actualMw: 60,   state: "Rivers",      latitude: 4.928,  longitude: 7.124,  status: "PARTIAL",     gencoOrgId: transcorpOrg!.id,  paf: 11,  notes: "Aged units, partially decommissioned." } }),
    prisma.plant.create({ data: { name: "Trans Amadi",          type: "GAS_OCGT",  installedMw: 100,  availableMw: 80,   actualMw: 70,   state: "Rivers",      latitude: 4.819,  longitude: 7.038,  status: "OPERATING",   gencoOrgId: transcorpOrg!.id,  paf: 80 } }),
    prisma.plant.create({ data: { name: "Ihovbor NIPP",         type: "GAS_OCGT",  installedMw: 451,  availableMw: 280,  actualMw: 240,  state: "Edo",         latitude: 6.451,  longitude: 5.738,  status: "OPERATING",   gencoOrgId: ndphcOrg!.id,      paf: 62,  notes: "Gas constraint." } }),
    prisma.plant.create({ data: { name: "Gbarain NIPP",         type: "GAS_OCGT",  installedMw: 225,  availableMw: 110,  actualMw: 90,   state: "Bayelsa",     latitude: 4.964,  longitude: 6.305,  status: "PARTIAL",     gencoOrgId: ndphcOrg!.id,      paf: 49,  notes: "Gas supply constraint." } }),
    prisma.plant.create({ data: { name: "Calabar NIPP",         type: "GAS_OCGT",  installedMw: 561,  availableMw: 380,  actualMw: 320,  state: "Cross River", latitude: 5.15,   longitude: 8.288,  status: "OPERATING",   gencoOrgId: ndphcOrg!.id,      paf: 68,  notes: "Also known as Odukpani NIPP. NERC Q1 2025 canonical name." } }),
    prisma.plant.create({ data: { name: "Okpai",                type: "GAS_CCGT",  installedMw: 480,  availableMw: 380,  actualMw: 320,  state: "Delta",       latitude: 5.717,  longitude: 6.486,  status: "OPERATING",   gencoOrgId: agipOrg!.id,       paf: 79 } }),
    prisma.plant.create({ data: { name: "Paras Energy",         type: "GAS_OCGT",  installedMw: 60,   availableMw: 50,   actualMw: 45,   state: "Lagos",       latitude: 6.467,  longitude: 3.91,   status: "OPERATING",   gencoOrgId: egbinOrg!.id,      paf: 83 } }),
    prisma.plant.create({ data: { name: "AES Barge",            type: "GAS_OCGT",  installedMw: 270,  availableMw: 0,    actualMw: 0,    state: "Lagos",       latitude: 6.56,   longitude: 3.5,    status: "OUT",         gencoOrgId: ndphcOrg!.id,      paf: 0,   notes: "Decommissioned barge plant." } }),
    prisma.plant.create({ data: { name: "Rivers IPP",           type: "GAS_OCGT",  installedMw: 180,  availableMw: 120,  actualMw: 100,  state: "Rivers",      latitude: 4.789,  longitude: 7.116,  status: "OPERATING",   gencoOrgId: transcorpOrg!.id,  paf: 67 } }),
    prisma.plant.create({ data: { name: "Notore Power",         type: "GAS_OCGT",  installedMw: 110,  availableMw: 90,   actualMw: 80,   state: "Rivers",      latitude: 4.787,  longitude: 7.114,  status: "OPERATING",   gencoOrgId: agipOrg!.id,       paf: 82 } }),
    prisma.plant.create({ data: { name: "Aba Integrated Power", type: "GAS_OCGT",  installedMw: 188,  availableMw: 140,  actualMw: 120,  state: "Abia",        latitude: 5.107,  longitude: 7.367,  status: "OPERATING",   gencoOrgId: transcorpOrg!.id,  paf: 74 } }),
    prisma.plant.create({ data: { name: "Mambilla",             type: "HYDRO",     installedMw: 3050, availableMw: 0,    actualMw: 0,    state: "Taraba",      latitude: 6.72,   longitude: 11.29,  status: "OUT",         gencoOrgId: fmpOrg!.id,        paf: 0,   notes: "PLANNED/EPC Review. 3,050MW hydro — not yet operational." } }),
    prisma.plant.create({ data: { name: "Dadin Kowa Hydro",     type: "HYDRO",     installedMw: 40,   availableMw: 30,   actualMw: 25,   state: "Gombe",       latitude: 10.293, longitude: 11.491, status: "OPERATING",   gencoOrgId: ndphcOrg!.id,      paf: 75 } }),
    prisma.plant.create({ data: { name: "Kashimbila Hydro",     type: "HYDRO",     installedMw: 40,   availableMw: 35,   actualMw: 28,   state: "Taraba",      latitude: 6.991,  longitude: 9.923,  status: "OPERATING",   gencoOrgId: fmpOrg!.id,        paf: 88,  notes: "40MW hydro completed 2019." } }),
  ]);

  const egbinPlant = plantRows[0]!;

  await prisma.plantUnit.createMany({
    data: [
      { plantId: egbinPlant.id, unitName: "Unit 1", capacityMw: 220, currentOutputMw: 80,  status: "PARTIAL",     fuelStatus: "GAS_AVAILABLE" },
      { plantId: egbinPlant.id, unitName: "Unit 2", capacityMw: 220, currentOutputMw: 120, status: "PARTIAL",     fuelStatus: "GAS_AVAILABLE" },
      { plantId: egbinPlant.id, unitName: "Unit 3", capacityMw: 220, currentOutputMw: 0,   status: "MAINTENANCE", fuelStatus: "GAS_AVAILABLE" },
      { plantId: egbinPlant.id, unitName: "Unit 4", capacityMw: 220, currentOutputMw: 180, status: "OPERATING",   fuelStatus: "GAS_AVAILABLE" },
      { plantId: egbinPlant.id, unitName: "Unit 5", capacityMw: 220, currentOutputMw: 200, status: "OPERATING",   fuelStatus: "GAS_AVAILABLE" },
      { plantId: egbinPlant.id, unitName: "Unit 6", capacityMw: 220, currentOutputMw: 350, status: "OPERATING",   fuelStatus: "GAS_AVAILABLE" },
    ],
  });

  await prisma.diversionOpportunity.create({
    data: { plantId: egbinPlant.id, tapPoint: "Lagos-Lekki Corridor", tapLatitude: 6.4698, tapLongitude: 3.5852, lengthKm: 12, capacityRequired: 100, indicativeCapex: 45000000, note: "High-density commercial zone with reliable revenue potential", priority: 1 },
  });

  console.log("  → 30 plants created (NERC Q1 2025)");

  // ── DISCOS ─────────────────────────────────────────────────────────────────
  const discoData = [
    { name: "Eko",           shortName: "EKEDC", atcc: 29.06, collEff: 84.79, metRate: 55.2, hours: 18.5, complaints: 22000, rank: 1, badge: "GOOD" as const, lat: 6.4531,  lng: 3.3958,  orgId: ekoOrg!.id,     remittance: 100 },
    { name: "Ikeja",         shortName: "IKEDC", atcc: 34.14, collEff: 78.52, metRate: 48.1, hours: 16.2, complaints: 38000, rank: 2, badge: "GOOD" as const, lat: 6.6194,  lng: 3.3505,  orgId: ikejaOrg!.id,   remittance: 100 },
    { name: "Abuja",         shortName: "AEDC",  atcc: 44.00, collEff: 72.30, metRate: 42.5, hours: 14.8, complaints: 18000, rank: 3, badge: "WARN" as const, lat: 9.0579,  lng: 7.4951,  orgId: abujaOrg!.id,   remittance: 99  },
    { name: "Ibadan",        shortName: "IBEDC", atcc: 41.70, collEff: 74.10, metRate: 39.8, hours: 13.5, complaints: 35000, rank: 4, badge: "WARN" as const, lat: 7.3775,  lng: 3.9470,  orgId: ibadanOrg!.id,  remittance: 100 },
    { name: "Enugu",         shortName: "EEDC",  atcc: 24.65, collEff: 76.90, metRate: 52.1, hours: 17.2, complaints: 15000, rank: 1, badge: "GOOD" as const, lat: 6.4584,  lng: 7.5464,  orgId: enuguOrg!.id,   remittance: 99  },
    { name: "Benin",         shortName: "BEDC",  atcc: 42.83, collEff: 70.20, metRate: 38.5, hours: 12.8, complaints: 20000, rank: 4, badge: "WARN" as const, lat: 6.3350,  lng: 5.6270,  orgId: beninOrg!.id,   remittance: 100 },
    { name: "Port Harcourt", shortName: "PHED",  atcc: 55.90, collEff: 60.40, metRate: 30.2, hours: 10.5, complaints: 42000, rank: 5, badge: "BAD"  as const, lat: 4.8156,  lng: 7.0498,  orgId: phOrg!.id,      remittance: 100 },
    { name: "Kaduna",        shortName: "KEDCO", atcc: 68.57, collEff: 55.10, metRate: 25.8, hours: 8.2,  complaints: 28000, rank: 6, badge: "BAD"  as const, lat: 10.5264, lng: 7.4384,  orgId: kadunaOrg!.id,  remittance: 40  },
    { name: "Jos",           shortName: "JED",   atcc: 62.13, collEff: 47.19, metRate: 28.4, hours: 9.1,  complaints: 19000, rank: 6, badge: "BAD"  as const, lat: 9.8965,  lng: 8.8583,  orgId: josOrg!.id,     remittance: 71  },
    { name: "Kano",          shortName: "KAEDCO",atcc: 49.00, collEff: 65.30, metRate: 33.7, hours: 11.2, complaints: 32000, rank: 5, badge: "BAD"  as const, lat: 12.0022, lng: 8.5920,  orgId: kanoOrg!.id,    remittance: 100 },
    { name: "Yola",          shortName: "YEDC",  atcc: 46.56, collEff: 68.10, metRate: 35.1, hours: 12.0, complaints: 12000, rank: 5, badge: "WARN" as const, lat: 9.2035,  lng: 12.4954, orgId: yolaOrg!.id,    remittance: 100 },
  ];

  const discos = await Promise.all(
    discoData.map(d => prisma.disCo.create({
      data: { name: d.name, atccLossPct: d.atcc, collectionEffPct: d.collEff, meteringRatePct: d.metRate, hoursOfSupplyDaily: d.hours, complaintsLastQuarter: d.complaints, rank: d.rank, badge: d.badge, mytoTargetAtcc: 21.32, latitude: d.lat, longitude: d.lng, operatorOrgId: d.orgId },
    }))
  );

  for (let i = 0; i < discos.length; i++) {
    const disco = discos[i]!;
    const dd = discoData[i]!;
    await prisma.feeder.createMany({
      data: [
        { discoId: disco.id, name: `${dd.name} Feeder A`,        voltage: "11kV", customerCount: 12000, supplyHours: dd.hours - 2, atccLossPct: dd.atcc - 5,  securityRisk: false },
        { discoId: disco.id, name: `${dd.name} Feeder B`,        voltage: "11kV", customerCount: 8500,  supplyHours: dd.hours - 4, atccLossPct: dd.atcc + 8,  securityRisk: dd.atcc > 55 },
        { discoId: disco.id, name: `${dd.name} Feeder C (Rural)`,voltage: "11kV", customerCount: 3200,  supplyHours: dd.hours - 8, atccLossPct: dd.atcc + 20, securityRisk: true },
      ],
    });
  }
  console.log("  → 11 DisCos and 33 feeders created");

  // ── SETTLEMENT INVOICES ────────────────────────────────────────────────────
  const totalDrog = 432130000000;
  const discoWeights = [0.12, 0.18, 0.11, 0.14, 0.08, 0.09, 0.10, 0.05, 0.04, 0.06, 0.03];
  for (let i = 0; i < discos.length; i++) {
    const disco = discos[i]!;
    const dd = discoData[i]!;
    const weight = discoWeights[i] ?? 0.09;
    const drog = totalDrog * weight;
    const remitted = drog * (dd.remittance / 100);
    await prisma.settlementInvoice.create({
      data: { period: "2025-Q1", discoId: disco.id, drogAdjustedNgn: drog, remittedNgn: remitted, remittancePct: dd.remittance, nbetInvoiceNgn: drog * 1.05, mooInvoiceNgn: drog * 1.08, notes: "NERC Q1 2025 settlement data" },
    });
  }
  console.log("  → Settlement invoices created");

  // ── GAS PIPELINES — 12 from NMDPRA/NNPC 2025 data ─────────────────────────
  await prisma.gasPipeline.createMany({
    data: [
      { name: "Escravos-Lagos Pipeline System (ELPS)", capacityMmscfd: 1100, capacity: "1,100 Mmscfd", operator: "NGIC",                         status: "OPERATIONAL",  fromPoint: "Escravos",         toPoint: "Lagos",          lengthKm: 524,  notes: "Primary western gas supply pipeline.", routeCoordinates: [[5.63,6.3],[3.39,6.45]] },
      { name: "AKK Pipeline",                          capacityMmscfd: 2000, capacity: "2,000 Mmscfd", operator: "NNPC Gas Infrastructure Company", status: "CONSTRUCTION", fromPoint: "Ajaokuta",         toPoint: "Kano",           lengthKm: 614,  notes: "Expected phased completion after 2025; routes via Kaduna.", routeCoordinates: [[6.74,7.08],[8.52,12.0]] },
      { name: "OB3 Pipeline (Obiafu-Obrikom-Oben)",    capacityMmscfd: 2000, capacity: "2,000 Mmscfd", operator: "NNPC Gas Infrastructure Company", status: "OPERATIONAL",  fromPoint: "Obiafu/Obrikom",   toPoint: "Oben",           lengthKm: 127,  notes: "East-to-west backbone interconnector.", routeCoordinates: [[6.65,5.46],[5.95,6.38]] },
      { name: "Escravos-Warri-Kaduna (ELPS extension)",capacityMmscfd: 400,  capacity: "400 Mmscfd",   operator: "NNPC Gas",                        status: "PROPOSED",     fromPoint: "Warri",            toPoint: "Kaduna",         lengthKm: 740,  notes: "Northern extension to interconnect with AKK at Kaduna.", routeCoordinates: [[5.75,5.52],[7.44,10.52]] },
      { name: "Aladja-Itakpe Pipeline",                capacityMmscfd: 250,  capacity: "250 Mmscfd",   operator: "NGIC",                            status: "OPERATIONAL",  fromPoint: "Aladja",           toPoint: "Itakpe",         lengthKm: 196,  notes: "Industrial gas supply to Ajaokuta steel and Itakpe iron ore.", routeCoordinates: [[5.81,5.95],[6.56,7.62]] },
      { name: "Imo River-Aba Pipeline",                capacityMmscfd: 60,   capacity: "60 Mmscfd",    operator: "Aba Power",                        status: "OPERATIONAL",  fromPoint: "Imo River",        toPoint: "Aba",            lengthKm: 26,   notes: "Dedicated supply to Aba Integrated Power.", routeCoordinates: [[7.28,5.21],[7.37,5.11]] },
      { name: "Alakiri-Obigbo-Ikot Abasi Pipeline",    capacityMmscfd: 350,  capacity: "350 Mmscfd",   operator: "NNPC Gas",                         status: "OPERATIONAL",  fromPoint: "Alakiri",          toPoint: "Ikot Abasi",     lengthKm: 99,   notes: "Eastern gas distribution loop.", routeCoordinates: [[7.05,4.88],[7.56,4.57]] },
      { name: "Calabar-Ikom-Mfum Pipeline",            capacityMmscfd: 170,  capacity: "170 Mmscfd",   operator: "WAGPCo",                           status: "PROPOSED",     fromPoint: "Calabar",          toPoint: "Mfum",           lengthKm: 230,  notes: "Future eastern leg of West African Gas Pipeline.", routeCoordinates: [[8.32,4.96],[8.96,5.79]] },
      { name: "WAGP (West African Gas Pipeline)",       capacityMmscfd: 460,  capacity: "460 Mmscfd",   operator: "WAGPCo",                           status: "OPERATIONAL",  fromPoint: "Lagos (Nigeria)",  toPoint: "Tema (Ghana)",   lengthKm: 678,  notes: "Cross-border pipeline serving Benin, Togo and Ghana.", routeCoordinates: [[3.39,6.45],[-0.02,5.62]] },
      { name: "Ikot Abasi-Calabar Pipeline",           capacityMmscfd: 100,  capacity: "100 Mmscfd",   operator: "Frontier Oil",                     status: "OPERATIONAL",  fromPoint: "Ikot Abasi",       toPoint: "Calabar",        lengthKm: 95,   notes: "Supplies Calabar NIPP and industrial offtakers.", routeCoordinates: [[7.56,4.57],[8.32,4.96]] },
      { name: "Oben-Ajaokuta Pipeline",                capacityMmscfd: 800,  capacity: "800 Mmscfd",   operator: "NNPC Gas",                         status: "OPERATIONAL",  fromPoint: "Oben",             toPoint: "Ajaokuta",       lengthKm: 196,  notes: "Feeds AKK pipeline at Ajaokuta head station.", routeCoordinates: [[5.95,6.38],[6.74,7.08]] },
      { name: "Sapele-Aladja Pipeline",                capacityMmscfd: 150,  capacity: "150 Mmscfd",   operator: "NGIC",                             status: "OPERATIONAL",  fromPoint: "Sapele",           toPoint: "Aladja",         lengthKm: 36,   notes: "Industrial gas spur.", routeCoordinates: [[5.69,5.89],[5.81,5.95]] },
    ],
  });
  console.log("  → 12 gas pipelines created");

  // ── CAPITAL PROJECTS — 16 from FMP/TCN/REA/World Bank 2025 ───────────────
  await prisma.capitalProject.createMany({
    data: [
      { name: "Mambilla Hydropower Project",             category: "GENERATION",   status: "EPC Review",     sponsorOrgId: fmpOrg!.id,  latitude: 6.72,  longitude: 11.29, capexUsd: 5800000000, completionPct: 15, funder: "FGN / China Exim",              contractorOrEpc: "CMEC",                           notes: "3,050MW hydroelectric project. EPC contract under review.", timeline: "2025-2030" },
      { name: "Zungeru Hydro",                           category: "GENERATION",   status: "Operational",    sponsorOrgId: fmpOrg!.id,  latitude: 9.85,  longitude: 6.07,  capexUsd: 1300000000, completionPct: 100, funder: "China Exim Bank",              contractorOrEpc: "Sinohydro",                      notes: "700MW hydro station. Completed 2023.", timeline: "Completed 2023" },
      { name: "Presidential Power Initiative (PPI) Phase 1", category: "TRANSMISSION", status: "Implementation", sponsorOrgId: tcnOrg!.id, latitude: 9.05, longitude: 7.49,  capexUsd: 2300000000, completionPct: 35, funder: "FGN / KfW (Germany)",          contractorOrEpc: "Siemens Energy / FGN Power Company", notes: "Phase 1 brownfield upgrades to lift end-to-end grid capacity to 7GW.", timeline: "2021-2026" },
      { name: "PPI Phase 2",                             category: "TRANSMISSION", status: "Procurement",    sponsorOrgId: tcnOrg!.id,  latitude: 9.05,  longitude: 7.49,  capexUsd: 1600000000, completionPct: 5,  funder: "FGN / KfW",                    contractorOrEpc: "Siemens Energy / FGN Power Company", notes: "Targeted 11GW grid capacity.", timeline: "2026-2028" },
      { name: "AKK Gas Pipeline",                        category: "GAS_INFRA",   status: "Construction",   sponsorOrgId: ngicOrg!.id, latitude: 8.5,   longitude: 9.5,   capexUsd: 2800000000, completionPct: 60, funder: "NNPC / China Exim",            contractorOrEpc: "OilServ / China Petroleum Pipeline Bureau", notes: "614km Ajaokuta-Kaduna-Kano gas pipeline.", timeline: "2020-2026" },
      { name: "Distribution Sector Recovery Programme (DSRP)", category: "DISTRIBUTION", status: "Active",   sponsorOrgId: nercOrg!.id, latitude: 9.05, longitude: 7.49,  capexUsd: 750000000,  completionPct: 25, funder: "World Bank / FGN",             contractorOrEpc: "Multiple DisCos under PSRP framework", notes: "DisCo-level technical and commercial loss reduction.", timeline: "2024-2027" },
      { name: "DARES Programme",                         category: "DRE",          status: "Active",         sponsorOrgId: reaOrg!.id,  latitude: 9.05,  longitude: 7.49,  capexUsd: 750000000,  completionPct: 30, funder: "World Bank / AfDB / AFD / GCF", contractorOrEpc: "REA",                            notes: "Distributed Access through Renewable Energy Scale-up; targeted 17.5 million people.", timeline: "2024-2030" },
      { name: "Nigeria Electrification Project (NEP)",   category: "DRE",          status: "Implementation", sponsorOrgId: reaOrg!.id,  latitude: 9.05,  longitude: 7.49,  capexUsd: 550000000,  completionPct: 70, funder: "World Bank / AfDB",            contractorOrEpc: "REA",                            notes: "Mini-grids, SHS and productive use programmes.", timeline: "2018-2026" },
      { name: "Energising Education Programme (EEP) Phase 2", category: "DRE",    status: "Implementation", sponsorOrgId: reaOrg!.id,  latitude: 9.05,  longitude: 7.49,  capexUsd: 200000000,  completionPct: 40, funder: "FGN / REA",                    contractorOrEpc: "REA",                            notes: "Solar hybrid mini-grids for federal universities and teaching hospitals.", timeline: "2024-2027" },
      { name: "Energising Economies Initiative (EEI)",   category: "DRE",          status: "Active",         sponsorOrgId: reaOrg!.id,  latitude: 9.05,  longitude: 7.49,  capexUsd: 80000000,   completionPct: 60, funder: "REA / Private",                contractorOrEpc: "REA / Private developers",       notes: "Markets and economic clusters mini-grid programme.", timeline: "2017-2027" },
      { name: "Nigeria SCADA / EMS Upgrade",             category: "TRANSMISSION", status: "Implementation", sponsorOrgId: tcnOrg!.id,  latitude: 7.77,  longitude: 4.56,  capexUsd: 220000000,  completionPct: 45, funder: "AFD / FGN",                    contractorOrEpc: "TCN / SCADA OEM",                notes: "Modernised SCADA, EMS and communications backbone.", timeline: "2023-2026" },
      { name: "Kaduna Solar IPP",                        category: "GENERATION",   status: "Construction",   sponsorOrgId: fmpOrg!.id,  latitude: 10.52, longitude: 7.44,  capexUsd: 250000000,  completionPct: 25, funder: "Private / DFI",                contractorOrEpc: "Multiple solar IPP consortia",   notes: "Cluster of solar PV plants under PPA framework.", timeline: "2024-2027" },
      { name: "Lagos State Embedded Generation",         category: "GENERATION",   status: "Active",         sponsorOrgId: fmpOrg!.id,  latitude: 6.52,  longitude: 3.38,  capexUsd: 350000000,  completionPct: 30, funder: "Lagos State / Private",        contractorOrEpc: "Private IPPs under LASEMRC",     notes: "Embedded generation under Lagos State Electricity Law (post-Electricity Act 2023).", timeline: "2024-2028" },
      { name: "Kashimbila Hydro",                        category: "GENERATION",   status: "Operational",    sponsorOrgId: fmpOrg!.id,  latitude: 6.99,  longitude: 9.92,  capexUsd: 400000000,  completionPct: 100, funder: "FGN",                         contractorOrEpc: "Sinohydro",                      notes: "40MW hydroelectric project on River Katsina-Ala.", timeline: "Completed 2019" },
      { name: "Gurara Hydro Phase II",                   category: "GENERATION",   status: "Planning",       sponsorOrgId: fmpOrg!.id,  latitude: 9.5,   longitude: 7.05,  capexUsd: 720000000,  completionPct: 5,  funder: "FGN / DFI",                    contractorOrEpc: "TBD",                            notes: "360MW hydroelectric expansion.", timeline: "2026-2030" },
      { name: "Nigeria-Niger 330kV Interconnection",     category: "TRANSMISSION", status: "Construction",   sponsorOrgId: tcnOrg!.id,  latitude: 13.06, longitude: 5.25,  capexUsd: 110000000,  completionPct: 50, funder: "AfDB / FGN",                   contractorOrEpc: "TCN",                            notes: "Birnin Kebbi to Niamey interconnection.", timeline: "2023-2026" },
    ],
  });
  console.log("  → 16 capital projects created");

  // ── MINI-GRIDS — 35 from REA 2025 data ───────────────────────────────────
  await prisma.miniGrid.createMany({
    data: [
      { name: "Bayero University Solar Hybrid",           capacityKw: 7100,  beneficiaries: 55000, latitude: 11.98,  longitude: 8.43,   state: "Kano",     lga: "Gwale",       programme: "NEP",  status: "OPERATIONAL",  completionYear: 2024, operatorOrg: undefined, operatorName: "REA",                    funder: "World Bank / AfDB",    operatorOrgId: reaOrg!.id },
      { name: "Ariaria Market Integrated Mini-Grid",      capacityKw: 9500,  beneficiaries: 30000, latitude: 5.116,  longitude: 7.373,  state: "Abia",     lga: "Aba South",   programme: "NEP",  status: "OPERATIONAL",  completionYear: 2024, operatorName: "Ariaria Independent Energy",funder: "REA / World Bank" },
      { name: "University of Maiduguri Solar Hybrid",     capacityKw: 12000, beneficiaries: 45000, latitude: 11.847, longitude: 13.16,  state: "Borno",    lga: "Maiduguri",   programme: "EEP",  status: "OPERATIONAL",  completionYear: 2023, operatorName: "REA",                    funder: "FGN / REA",            operatorOrgId: reaOrg!.id },
      { name: "Federal University Gusau Solar Hybrid",    capacityKw: 2800,  beneficiaries: 12000, latitude: 12.169, longitude: 6.66,   state: "Zamfara",  lga: "Gusau",       programme: "EEP",  status: "OPERATIONAL",  completionYear: 2024, operatorName: "REA",                    funder: "FGN / REA",            operatorOrgId: reaOrg!.id },
      { name: "Federal University Wukari Solar Hybrid",   capacityKw: 1500,  beneficiaries: 8000,  latitude: 7.852,  longitude: 9.781,  state: "Taraba",   lga: "Wukari",      programme: "EEP",  status: "OPERATIONAL",  completionYear: 2024, operatorName: "REA",                    funder: "FGN / REA",            operatorOrgId: reaOrg!.id },
      { name: "Federal University Dutse Solar Hybrid",    capacityKw: 2000,  beneficiaries: 10000, latitude: 11.76,  longitude: 9.343,  state: "Jigawa",   lga: "Dutse",       programme: "EEP",  status: "OPERATIONAL",  completionYear: 2024, operatorName: "REA",                    funder: "FGN / REA",            operatorOrgId: reaOrg!.id },
      { name: "Toto Mini-Grid",                           capacityKw: 100,   beneficiaries: 3500,  latitude: 8.567,  longitude: 7.733,  state: "Nasarawa", lga: "Toto",        programme: "NEP",  status: "OPERATIONAL",  completionYear: 2022, operatorName: "Havenhill Synergy",      funder: "REA / World Bank" },
      { name: "Kigbe Mini-Grid",                          capacityKw: 90,    beneficiaries: 2800,  latitude: 8.967,  longitude: 7.35,   state: "FCT",      lga: "Kwali",       programme: "NEP",  status: "OPERATIONAL",  completionYear: 2022, operatorName: "Rubitec Solar",          funder: "REA" },
      { name: "Rokota Mini-Grid",                         capacityKw: 80,    beneficiaries: 2200,  latitude: 8.745,  longitude: 6.213,  state: "Niger",    lga: "Lavun",       programme: "NEP",  status: "OPERATIONAL",  completionYear: 2023, operatorName: "Nayo Tropical",          funder: "REA / World Bank" },
      { name: "Onibambu Mini-Grid",                       capacityKw: 60,    beneficiaries: 1800,  latitude: 7.871,  longitude: 4.123,  state: "Osun",     lga: "Iwo",         programme: "NEP",  status: "OPERATIONAL",  completionYear: 2021, operatorName: "Powergen",               funder: "REA" },
      { name: "Gbamu Gbamu Mini-Grid",                    capacityKw: 80,    beneficiaries: 2500,  latitude: 7.456,  longitude: 4.301,  state: "Ogun",     lga: "Ijebu East",  programme: "NEP",  status: "OPERATIONAL",  completionYear: 2021, operatorName: "PowerGen Renewable Energy",funder: "REA / GIZ" },
      { name: "Akaeze Mini-Grid",                         capacityKw: 100,   beneficiaries: 3000,  latitude: 5.901,  longitude: 7.642,  state: "Ebonyi",   lga: "Ivo",         programme: "NEP",  status: "OPERATIONAL",  completionYear: 2023, operatorName: "Nayo Tropical",          funder: "REA" },
      { name: "Egbeke Mini-Grid",                         capacityKw: 100,   beneficiaries: 2800,  latitude: 5.073,  longitude: 6.87,   state: "Rivers",   lga: "Etche",       programme: "NEP",  status: "OPERATIONAL",  completionYear: 2023, operatorName: "PowerGen",               funder: "REA / World Bank" },
      { name: "Isiala Mbano Mini-Grid",                   capacityKw: 90,    beneficiaries: 2400,  latitude: 5.713,  longitude: 7.23,   state: "Imo",      lga: "Isiala Mbano",programme: "NEP",  status: "OPERATIONAL",  completionYear: 2023, operatorName: "Privately operated",     funder: "REA" },
      { name: "Sabon Gida Mini-Grid",                     capacityKw: 75,    beneficiaries: 2100,  latitude: 11.42,  longitude: 7.789,  state: "Kaduna",   lga: "Soba",        programme: "NEP",  status: "OPERATIONAL",  completionYear: 2024, operatorName: "Husk Power",             funder: "REA / World Bank" },
      { name: "Doruwa Mini-Grid",                         capacityKw: 60,    beneficiaries: 1500,  latitude: 11.2,   longitude: 8.1,    state: "Kano",     lga: "Tudun Wada",  programme: "NEP",  status: "OPERATIONAL",  completionYear: 2023, operatorName: "Husk Power",             funder: "REA" },
      { name: "Wudil Hybrid Mini-Grid",                   capacityKw: 120,   beneficiaries: 4000,  latitude: 11.798, longitude: 8.842,  state: "Kano",     lga: "Wudil",       programme: "NEP",  status: "OPERATIONAL",  completionYear: 2024, operatorName: "Husk Power",             funder: "REA / World Bank" },
      { name: "Funtua Solar Hybrid",                      capacityKw: 95,    beneficiaries: 2700,  latitude: 11.522, longitude: 7.31,   state: "Katsina",  lga: "Funtua",      programme: "NEP",  status: "OPERATIONAL",  completionYear: 2024, operatorName: "Husk Power",             funder: "REA" },
      { name: "Argungu Mini-Grid",                        capacityKw: 75,    beneficiaries: 2100,  latitude: 12.737, longitude: 4.527,  state: "Kebbi",    lga: "Argungu",     programme: "NEP",  status: "OPERATIONAL",  completionYear: 2024, operatorName: "Privately operated",     funder: "REA" },
      { name: "Bama Mini-Grid",                           capacityKw: 100,   beneficiaries: 2800,  latitude: 11.519, longitude: 13.69,  state: "Borno",    lga: "Bama",        programme: "NEP",  status: "CONSTRUCTION", completionYear: 2026, operatorName: "TBD",                    funder: "REA / EU" },
      { name: "Damboa Mini-Grid",                         capacityKw: 80,    beneficiaries: 2200,  latitude: 11.155, longitude: 12.749, state: "Borno",    lga: "Damboa",      programme: "NEP",  status: "CONSTRUCTION", completionYear: 2026, operatorName: "TBD",                    funder: "REA / EU" },
      { name: "Gembu Mini-Grid",                          capacityKw: 100,   beneficiaries: 3000,  latitude: 6.726,  longitude: 11.282, state: "Taraba",   lga: "Sardauna",    programme: "NEP",  status: "OPERATIONAL",  completionYear: 2023, operatorName: "Privately operated",     funder: "REA" },
      { name: "Zing Mini-Grid",                           capacityKw: 60,    beneficiaries: 1800,  latitude: 9.273,  longitude: 11.77,  state: "Adamawa",  lga: "Zing",        programme: "NEP",  status: "OPERATIONAL",  completionYear: 2023, operatorName: "Privately operated",     funder: "REA" },
      { name: "Numan Mini-Grid",                          capacityKw: 80,    beneficiaries: 2400,  latitude: 9.461,  longitude: 11.989, state: "Adamawa",  lga: "Numan",       programme: "NEP",  status: "OPERATIONAL",  completionYear: 2023, operatorName: "Privately operated",     funder: "REA" },
      { name: "Pankshin Mini-Grid",                       capacityKw: 75,    beneficiaries: 2100,  latitude: 9.342,  longitude: 9.443,  state: "Plateau",  lga: "Pankshin",    programme: "NEP",  status: "OPERATIONAL",  completionYear: 2024, operatorName: "PowerGen",               funder: "REA" },
      { name: "Otukpo Mini-Grid",                         capacityKw: 90,    beneficiaries: 2500,  latitude: 7.19,   longitude: 8.131,  state: "Benue",    lga: "Otukpo",      programme: "NEP",  status: "OPERATIONAL",  completionYear: 2024, operatorName: "Privately operated",     funder: "REA" },
      { name: "Kontagora Mini-Grid",                      capacityKw: 85,    beneficiaries: 2300,  latitude: 10.402, longitude: 5.471,  state: "Niger",    lga: "Kontagora",   programme: "NEP",  status: "OPERATIONAL",  completionYear: 2024, operatorName: "Privately operated",     funder: "REA" },
      { name: "Idah Mini-Grid",                           capacityKw: 70,    beneficiaries: 2000,  latitude: 7.111,  longitude: 6.737,  state: "Kogi",     lga: "Idah",        programme: "NEP",  status: "OPERATIONAL",  completionYear: 2024, operatorName: "Privately operated",     funder: "REA" },
      { name: "Ohafia Mini-Grid",                         capacityKw: 80,    beneficiaries: 2200,  latitude: 5.62,   longitude: 7.84,   state: "Abia",     lga: "Ohafia",      programme: "NEP",  status: "OPERATIONAL",  completionYear: 2024, operatorName: "PowerGen",               funder: "REA" },
      { name: "Nsukka Solar Hybrid",                      capacityKw: 7500,  beneficiaries: 40000, latitude: 6.857,  longitude: 7.395,  state: "Enugu",    lga: "Nsukka",      programme: "EEP",  status: "OPERATIONAL",  completionYear: 2023, operatorName: "REA",                    funder: "FGN / REA",            operatorOrgId: reaOrg!.id },
      { name: "FUNAAB Solar Hybrid",                      capacityKw: 2400,  beneficiaries: 14000, latitude: 7.225,  longitude: 3.435,  state: "Ogun",     lga: "Odeda",       programme: "EEP",  status: "OPERATIONAL",  completionYear: 2022, operatorName: "REA",                    funder: "FGN / REA",            operatorOrgId: reaOrg!.id },
      { name: "Bayelsa Medical University Hybrid",        capacityKw: 3300,  beneficiaries: 18000, latitude: 4.928,  longitude: 6.275,  state: "Bayelsa",  lga: "Yenagoa",     programme: "EEP",  status: "OPERATIONAL",  completionYear: 2023, operatorName: "REA",                    funder: "FGN / REA",            operatorOrgId: reaOrg!.id },
      { name: "Federal University Otuoke Hybrid",         capacityKw: 2700,  beneficiaries: 11000, latitude: 4.789,  longitude: 6.288,  state: "Bayelsa",  lga: "Ogbia",       programme: "EEP",  status: "OPERATIONAL",  completionYear: 2023, operatorName: "REA",                    funder: "FGN / REA",            operatorOrgId: reaOrg!.id },
      { name: "Sumaila Mini-Grid",                        capacityKw: 90,    beneficiaries: 2700,  latitude: 11.561, longitude: 8.937,  state: "Kano",     lga: "Sumaila",     programme: "NEP",  status: "OPERATIONAL",  completionYear: 2023, operatorName: "Husk Power",             funder: "REA" },
      { name: "Karu Mini-Grid",                           capacityKw: 90,    beneficiaries: 2600,  latitude: 8.972,  longitude: 7.505,  state: "Nasarawa", lga: "Karu",        programme: "NEP",  status: "OPERATIONAL",  completionYear: 2024, operatorName: "PowerGen",               funder: "REA" },
    ],
  });
  console.log("  → 35 mini-grid projects created");

  // ── GRID METRICS ──────────────────────────────────────────────────────────
  const now = new Date();
  await prisma.gridMetric.createMany({
    data: Array.from({ length: 96 }, (_, i) => ({
      timestamp: new Date(now.getTime() - (95 - i) * 30 * 60 * 1000),
      frequencyHz: 50 + (Math.random() - 0.5) * 0.4,
      upperVoltageKv: 330 + (Math.random() - 0.5) * 10,
      lowerVoltageKv: 132 + (Math.random() - 0.5) * 5,
      sentOutMwh: 4500 + Math.random() * 500,
      demandMwh: 5200 + Math.random() * 300,
    })),
  });
  console.log("  → Grid metrics seeded (96 datapoints — 48h)");

  // ── ALERTS ────────────────────────────────────────────────────────────────
  await prisma.alert.createMany({
    data: [
      { severity: "CRITICAL", category: "GENERATION",  title: "Alaoji NIPP: Zero Output",                    message: "Alaoji NIPP (1,131 MW installed) has zero output due to gas allocation failure. 750,000+ customers affected.",        actionRequired: "Activate emergency gas supply protocol. Engage NGIC and gas shippers.",          status: "OPEN" },
      { severity: "HIGH",     category: "TRANSMISSION", title: "Egbin–Ikeja West Loading at 91%",              message: "Egbin–Ikeja West 330kV line operating at 91% capacity. Trip risk during peak demand.",                              actionRequired: "Reduce Egbin dispatch or manage load. Alert TCN control centre.",                status: "ACKNOWLEDGED" },
      { severity: "HIGH",     category: "SETTLEMENT",   title: "Kaduna DisCo: 40% Remittance Rate",            message: "Kaduna DisCo remitted only 40% of Q1 2025 DRO-adjusted invoice. Cumulative debt increasing.",                        actionRequired: "Enforce per CPR 2023. Consider supply restriction order.",                       status: "OPEN" },
      { severity: "HIGH",     category: "SETTLEMENT",   title: "Jos DisCo: 71% Remittance Rate",               message: "Jos DisCo Q1 2025 remittance at 71% — below threshold. Financial exposure growing.",                               actionRequired: "Issue compliance notice and schedule bilateral meeting.",                         status: "OPEN" },
      { severity: "MEDIUM",   category: "COMPLAINTS",   title: "SLA Breach Spike — Ibadan",                    message: "Ibadan DisCo has 847 complaints with SLA breached. Estimated billing category dominates.",                           actionRequired: "Issue compliance notice to Ibadan DisCo CCU.",                                   status: "OPEN" },
      { severity: "MEDIUM",   category: "COMPLAINTS",   title: "Port Harcourt DisCo — ATCC 55.9%",             message: "Port Harcourt DisCo ATC&C losses at 55.9%, highest among all DisCos. MYTO target is 21.32%.",                        actionRequired: "Escalate to NERC Enforcement Division. Request DisCo remediation plan.",          status: "OPEN" },
      { severity: "INFO",     category: "PROJECTS",     title: "AKK Pipeline Milestone",                       message: "AKK mainline welding completed Dec 2025 including River Niger crossing. First gas to Abuja target Jul 2026.",       actionRequired: "Confirm midline compressor delivery schedule with NGIC.",                         status: "ACKNOWLEDGED" },
      { severity: "INFO",     category: "GENERATION",   title: "Mambilla EPC Review Ongoing",                  message: "3,050 MW Mambilla Hydro EPC contract under review. No commercial operation expected before 2030.",                  actionRequired: "Request FEC update on EPC re-award timeline. Engage CMEC.",                       status: "OPEN" },
    ],
  });
  console.log("  → Alerts created");

  // ── VALUE CHAIN LINKS ─────────────────────────────────────────────────────
  const vcLinks = await Promise.all([
    prisma.valueChainLink.create({ data: { key: "gas",        name: "Gas Supply",           status: "R", order: 1, meta: "Gas supply chain from wellhead to power plant gate. Primary constraint. ~44% of theoretical gas allocation actually delivered." } }),
    prisma.valueChainLink.create({ data: { key: "gen",        name: "Generation",           status: "A", order: 2, meta: "Grid-connected generation from 30 plants. Average available capacity ~5,500 MW vs 15,000+ MW installed — <40% PAF." } }),
    prisma.valueChainLink.create({ data: { key: "tx",         name: "Transmission",         status: "A", order: 3, meta: "TCN operates 5,523 km of 330kV and 6,801 km of 132kV lines. Key constraint: wheeling capacity and right-of-way disputes." } }),
    prisma.valueChainLink.create({ data: { key: "dist",       name: "Distribution",         status: "R", order: 4, meta: "11 DisCos. Weighted ATC&C loss 39.61% vs MYTO target 20.54%. Metering rate 46.98%." } }),
    prisma.valueChainLink.create({ data: { key: "settlement", name: "Settlement & Trading", status: "A", order: 5, meta: "NBET as single buyer. DRO-adjusted invoice ₦432.13bn Q1 2025. 95.86% remittance rate overall but Kaduna 40%, Jos 71%." } }),
    prisma.valueChainLink.create({ data: { key: "customer",   name: "Customer & Metering",  status: "R", order: 6, meta: "254,404 complaints Q1 2025. Forum Office resolution rate 74.10%. DisCo-CCU resolution rate 37.27%. Estimated billing: highest political risk." } }),
    prisma.valueChainLink.create({ data: { key: "offgrid",    name: "Off-Grid & DRE",       status: "G", order: 7, meta: "REA managing NEP and DARES. 1GW DARES target, $750M World Bank facility. 35 mini-grid projects seeded." } }),
    prisma.valueChainLink.create({ data: { key: "capex",      name: "Capital Projects",     status: "A", order: 8, meta: "PPI Phase 1 at 35%. Phase 2 in procurement. Mambilla under EPC review. AKK nearing first gas." } }),
  ]);

  const vcMap = Object.fromEntries(vcLinks.map(v => [v.key, v]));

  await prisma.stakeholder.createMany({
    data: [
      { valueChainLinkId: vcMap["gas"]!.id,        role: "OPERATOR",    title: "Group MD/CEO, NNPC Ltd",                  organisationId: ngicOrg!.id,     escalationOrder: 1 },
      { valueChainLinkId: vcMap["gas"]!.id,        role: "REGULATOR",   title: "Executive Vice-President, NMDPRA",                                         escalationOrder: 2 },
      { valueChainLinkId: vcMap["gas"]!.id,        role: "COUNTERPART", title: "MD/CEO, NGIC",                             organisationId: ngicOrg!.id,     escalationOrder: 3 },
      { valueChainLinkId: vcMap["gen"]!.id,        role: "OPERATOR",    title: "CEO, Mainstream Energy Solutions",         organisationId: mainstreamOrg!.id,escalationOrder: 1 },
      { valueChainLinkId: vcMap["gen"]!.id,        role: "REGULATOR",   title: "Chairman, NERC",                           organisationId: nercOrg!.id,     escalationOrder: 2 },
      { valueChainLinkId: vcMap["gen"]!.id,        role: "COUNTERPART", title: "MD/CEO, Azura Power",                      organisationId: azuraOrg!.id,    escalationOrder: 3 },
      { valueChainLinkId: vcMap["tx"]!.id,         role: "OPERATOR",    title: "MD/CEO, TCN",                              organisationId: tcnOrg!.id,      escalationOrder: 1 },
      { valueChainLinkId: vcMap["tx"]!.id,         role: "REGULATOR",   title: "Chairman, NERC",                           organisationId: nercOrg!.id,     escalationOrder: 2 },
      { valueChainLinkId: vcMap["dist"]!.id,       role: "OPERATOR",    title: "MD/CEO, Ikeja Electric",                   organisationId: ikejaOrg!.id,    escalationOrder: 1 },
      { valueChainLinkId: vcMap["dist"]!.id,       role: "REGULATOR",   title: "Chairman, NERC",                           organisationId: nercOrg!.id,     escalationOrder: 2 },
      { valueChainLinkId: vcMap["settlement"]!.id, role: "OPERATOR",    title: "MD/CEO, NBET",                             organisationId: nbetOrg!.id,     escalationOrder: 1 },
      { valueChainLinkId: vcMap["customer"]!.id,   role: "REGULATOR",   title: "Director, Consumer Affairs, NERC",         organisationId: nercOrg!.id,     escalationOrder: 1 },
      { valueChainLinkId: vcMap["offgrid"]!.id,    role: "OPERATOR",    title: "MD/CEO, REA",                              organisationId: reaOrg!.id,      escalationOrder: 1 },
    ],
  });

  await prisma.authorityInstrument.createMany({
    data: [
      { valueChainLinkId: vcMap["gas"]!.id,        name: "Petroleum Industry Act 2021",         citation: "PIA 2021, Part IV",       description: "Upstream gas governance and deregulation" },
      { valueChainLinkId: vcMap["gen"]!.id,        name: "Electricity Act 2023",                citation: "EA 2023",                 description: "Sector reform and subnational role expansion" },
      { valueChainLinkId: vcMap["gen"]!.id,        name: "MYTO 2025",                           citation: "NERC MYTO Order 2025",    description: "Multi-Year Tariff Order setting cost-reflective tariff path" },
      { valueChainLinkId: vcMap["gen"]!.id,        name: "Vesting Contracts",                   citation: "NBET Vesting Contracts",  description: "Take-or-pay power purchase agreements backstopped by FGN" },
      { valueChainLinkId: vcMap["tx"]!.id,         name: "Grid Code",                           citation: "TCN Grid Code 2014 (rev 2023)", description: "Technical standards for grid connection and operation" },
      { valueChainLinkId: vcMap["dist"]!.id,       name: "Distribution Licence",                citation: "NERC Distribution Licences", description: "Exclusive distribution licences per DisCo" },
      { valueChainLinkId: vcMap["customer"]!.id,   name: "Customer Protection Regulations 2023",citation: "CPR 2023",                description: "NERC CPR specifying SLA windows and complaint escalation" },
    ],
  });

  await prisma.escalationStep.createMany({
    data: [
      { valueChainLinkId: vcMap["gas"]!.id,  stepOrder: 1, who: "MD/CEO, NGIC",                          whatRole: "Gas pipeline operator" },
      { valueChainLinkId: vcMap["gas"]!.id,  stepOrder: 2, who: "EVP, NMDPRA",                           whatRole: "Regulator" },
      { valueChainLinkId: vcMap["gas"]!.id,  stepOrder: 3, who: "Hon. Minister of Petroleum Resources",  whatRole: "Policy authority" },
      { valueChainLinkId: vcMap["gas"]!.id,  stepOrder: 4, who: "Hon. Minister of Power",                whatRole: "Sector coordination" },
      { valueChainLinkId: vcMap["gen"]!.id,  stepOrder: 1, who: "Plant CEO/MD",                          whatRole: "Plant operator" },
      { valueChainLinkId: vcMap["gen"]!.id,  stepOrder: 2, who: "Chairman, NERC",                        whatRole: "Regulator" },
      { valueChainLinkId: vcMap["gen"]!.id,  stepOrder: 3, who: "Hon. Minister of Power",                whatRole: "Ministerial authority" },
      { valueChainLinkId: vcMap["dist"]!.id, stepOrder: 1, who: "DisCo CCU Manager",                     whatRole: "First-line complaint resolution" },
      { valueChainLinkId: vcMap["dist"]!.id, stepOrder: 2, who: "MD/CEO of DisCo",                       whatRole: "DisCo executive authority" },
      { valueChainLinkId: vcMap["dist"]!.id, stepOrder: 3, who: "Director, Consumer Affairs, NERC",      whatRole: "Regulatory intervention" },
      { valueChainLinkId: vcMap["dist"]!.id, stepOrder: 4, who: "Chairman, NERC",                        whatRole: "Regulatory enforcement" },
      { valueChainLinkId: vcMap["dist"]!.id, stepOrder: 5, who: "Hon. Minister of Power",                whatRole: "Ministerial directive" },
    ],
  });
  console.log("  → Value chain, stakeholders, instruments, escalation steps created");

  // ── ESCALATION RULES ──────────────────────────────────────────────────────
  await prisma.escalationRule.createMany({
    data: [
      { name: "Estimated Billing >72h at Level 1 → Level 2",    condition: { category: "ESTIMATED_BILLING",    ageHours: 72, currentLevel: 1 }, actionLevel: 2, notifyRole: "DISCO_AGENT",     isActive: true, priority: 1 },
      { name: "Electrocution → Instant Level 3 (NERC)",         condition: { category: "ELECTROCUTION",        ageHours: 0,  currentLevel: 1 }, actionLevel: 3, notifyOrgId: nercOrg!.id, notifyRole: "NERC_VIEWER", isActive: true, priority: 1 },
      { name: "Kaduna DisCo >48h at any Level → Escalate +1",  condition: { discoId: discos[7]!.id,           ageHours: 48, currentLevel: 1 }, actionLevel: 2, notifyRole: "MINISTRY_STAFF",  isActive: true, priority: 2 },
      { name: "Satisfaction Score <2 → Reopen + Escalate",      condition: { satisfactionScore: { lt: 2 },     currentLevel: 1 },               actionLevel: 2,                                isActive: true, priority: 2 },
      { name: "Supply Interruption >24h at Level 1 → Level 2",  condition: { category: "SUPPLY_INTERRUPTION",  ageHours: 24, currentLevel: 1 }, actionLevel: 2,                                isActive: true, priority: 2 },
      { name: "Metering >5 Working Days at Level 2 → Level 3",  condition: { category: "METERING",             ageHours: 40, currentLevel: 2 }, actionLevel: 3, notifyOrgId: nercOrg!.id,      isActive: true, priority: 3 },
      { name: "Level 4 >72h → Ministerial",                     condition: { ageHours: 72,                     currentLevel: 4 },               actionLevel: 5, notifyRole: "MINISTER",        isActive: true, priority: 4 },
      { name: "Infrastructure Damage >48h at Level 1 → Level 2",condition: { category: "INFRASTRUCTURE_DAMAGE", ageHours: 48, currentLevel: 1 }, actionLevel: 2,                               isActive: true, priority: 3 },
    ],
  });
  console.log("  → Escalation rules seeded");

  // ── COMPLAINTS — 1,500 realistic across all DisCos ────────────────────────
  const categories = ["ESTIMATED_BILLING","ESTIMATED_BILLING","ESTIMATED_BILLING","SUPPLY_INTERRUPTION","SUPPLY_INTERRUPTION","METERING","METERING","BILLING","VOLTAGE","ELECTROCUTION","INFRASTRUCTURE_DAMAGE","CONNECTION_DELAY","DISCONNECTION","REFUND","OTHER"] as const;
  const statuses   = ["FILED","IN_REVIEW","IN_PROGRESS","ESCALATED","RESOLVED","RESOLVED","RESOLVED","CLOSED"] as const;
  const severities = ["CRITICAL","HIGH","MEDIUM","MEDIUM","MEDIUM","LOW","LOW"] as const;
  const sources    = ["WEB","WHATSAPP","NERC_PORTAL","FORUM_OFFICE","IN_PERSON","EMAIL"] as const;

  const citizenNames = ["Chukwuemeka Obi","Fatima Abdullahi","Oluwaseun Adeyemi","Ngozi Okonkwo","Ibrahim Musa","Amaka Ezeh","Yusuf Aliyu","Chidinma Eze","Bello Garba","Adaeze Nwosu","Musa Suleiman","Onyeka Igwe","Halima Umar","Emeka Nwachukwu","Kemi Adesanya","Lawal Isa","Blessing Okafor","Rabiu Abdulkadir","Chisom Obiora","Abubakar Tanko","Taiwo Okafor","Kehinde Adebayo","Tochukwu Eze","Salihu Abubakar","Nkechi Okoye","Abdullahi Kawu","Amarachi Nweze","Usman Garba","Ifeanyi Obi","Mariam Bello"];
  const complaintDiscoWeights = [0,0,0,0,0,1,1,1,1,1,1,2,2,2,3,3,3,3,4,4,5,5,5,6,6,6,6,6,7,7,7,7,8,8,9,9,9,10,10,10];
  const nigerianLocs = ["Agege, Lagos","Victoria Island, Lagos","Kuje, Abuja","Maitama, Abuja","New GRA, Port Harcourt","D-Line, Port Harcourt","Bodija, Ibadan","Challenge, Ibadan","Barnawa, Kaduna","Sabon Tasha, Kaduna","Onitsha Main Market, Anambra","Nnewi, Anambra","Diobu, Port Harcourt","Rumuola, Rivers","Tudun Wada, Jos","Bukuru, Jos","Wuse 2, Abuja","Garki, Abuja","Isale Eko, Lagos","Surulere, Lagos","Gwarinpa, Abuja","Dei-Dei, Abuja","Ojodu, Lagos","Yaba, Lagos","Sapele Road, Benin City","Ugbowo, Benin City","New Haven, Enugu","Independence Layout, Enugu","Kano Road, Kaduna","Ungwan Boro, Kaduna"];

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const TOTAL_COMPLAINTS = 1500;

  for (let i = 0; i < TOTAL_COMPLAINTS; i++) {
    const discoIdx = complaintDiscoWeights[i % complaintDiscoWeights.length]!;
    const disco = discos[discoIdx]!;
    const category = categories[i % categories.length]!;
    const status = statuses[i % statuses.length]!;
    const severity = category === "ELECTROCUTION" ? "CRITICAL" : severities[i % severities.length]!;
    const source = sources[i % sources.length]!;
    const daysAgo = Math.floor(Math.random() * 90);
    const createdAt = new Date(ninetyDaysAgo.getTime() + (90 - daysAgo) * 24 * 60 * 60 * 1000);
    const citizenName = citizenNames[i % citizenNames.length]!;
    const location = nigerianLocs[i % nigerianLocs.length]!;
    const phone = `0${(8000000000 + i * 7).toString().substring(0, 10)}`;
    const escalationLevel = status === "ESCALATED" ? Math.min(5, 2 + (i % 3)) : status === "RESOLVED" ? 1 : i % 30 === 0 ? 5 : 1;
    const slaBreached = daysAgo > 30 && status !== "RESOLVED";
    const ticket = `WR-${createdAt.getFullYear()}${String(createdAt.getMonth()+1).padStart(2,"0")}${String(createdAt.getDate()).padStart(2,"0")}-${String(100000 + i).padStart(6,"0")}`;
    const satisfactionToken = randomBytes(32).toString("hex");

    const desc =
      category === "ESTIMATED_BILLING"    ? "I have been receiving estimated bills for over 3 months without meter reading." :
      category === "SUPPLY_INTERRUPTION"  ? "There has been no power supply for several days in my area." :
      category === "METERING"             ? "My prepaid meter is not dispensing correct units." :
      category === "ELECTROCUTION"        ? "A live wire has fallen near residential area. Urgent safety hazard." :
      category === "VOLTAGE"              ? "We are experiencing dangerously low/high voltage fluctuations." :
      "I need urgent assistance with my electricity issue.";

    const complaint = await prisma.complaint.create({
      data: {
        ticketNumber: ticket, source, citizenName, citizenPhone: phone,
        citizenEmail: `${citizenName.toLowerCase().replace(/\s/g, ".")}${i}@example.ng`,
        discoId: disco.id, category,
        description: `${desc} Location: ${location}. Account: ${uid()}`,
        status, severity, escalationLevel, slaBreached,
        slaBreachAt: slaBreached ? new Date(createdAt.getTime() + 24 * 60 * 60 * 1000) : null,
        location, satisfactionToken,
        satisfactionScore: status === "RESOLVED" ? Math.floor(Math.random() * 5) + 1 : null,
        resolvedAt: status === "RESOLVED" ? new Date(createdAt.getTime() + (2 + Math.random() * 10) * 24 * 60 * 60 * 1000) : null,
        resolutionText: status === "RESOLVED" ? "Issue has been investigated and resolved by the DisCo technical team." : null,
        createdAt, updatedAt: createdAt,
      },
    });

    await prisma.complaintEvent.create({ data: { complaintId: complaint.id, eventType: "CREATED", notes: `Complaint filed via ${source}`, createdAt } });
    if (status !== "FILED") {
      await prisma.complaintEvent.create({ data: { complaintId: complaint.id, eventType: "STATUS_CHANGE", fromValue: "FILED", toValue: "IN_REVIEW", createdAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000) } });
    }
    if (status === "RESOLVED") {
      await prisma.complaintEvent.create({ data: { complaintId: complaint.id, eventType: "RESOLVED", notes: "Resolved by DisCo technical team", createdAt: complaint.resolvedAt! } });
    }
    if (status === "ESCALATED" || escalationLevel > 1) {
      await prisma.complaintEvent.create({ data: { complaintId: complaint.id, eventType: "ESCALATED", fromValue: "1", toValue: String(escalationLevel), notes: "Escalated due to SLA breach", createdAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000) } });
    }
    if (slaBreached) {
      await prisma.complaintEvent.create({ data: { complaintId: complaint.id, eventType: "SLA_BREACHED", notes: "SLA window exceeded", createdAt: new Date(createdAt.getTime() + 25 * 60 * 60 * 1000) } });
    }
  }
  console.log(`  → ${TOTAL_COMPLAINTS} complaints seeded`);

  // ── INSTITUTIONAL DIRECTORY ───────────────────────────────────────────────

  // NERC Forum Offices (11)
  await prisma.forumOffice.createMany({
    data: [
      { name: "Abuja Forum Office",       city: "Abuja",        statesCovered: ["FCT","Nasarawa","Niger"],                      address: "NERC Forum Office, Central Business District, Abuja", email: "abujaforum@nerc.gov.ng",        phone: "+2342013444331" },
      { name: "Eko Forum Office",         city: "Lagos",        statesCovered: ["Lagos"],                                       address: "Eko Distribution Zone, Marina, Lagos",                 email: "ekoforum@nerc.gov.ng" },
      { name: "Ikeja Forum Office",       city: "Lagos",        statesCovered: ["Lagos"],                                       address: "Ikeja Electricity District, Ikeja, Lagos",             email: "ikejaforum@nerc.gov.ng" },
      { name: "Benin Forum Office",       city: "Benin City",   statesCovered: ["Edo"],                                         address: "Benin City, Edo State",                                email: "beninforum@nerc.gov.ng" },
      { name: "Port Harcourt Forum Office",city:"Port Harcourt",statesCovered: ["Rivers"],                                      address: "Port Harcourt, Rivers State",                          email: "portharcourtforum@nerc.gov.ng" },
      { name: "Ibadan Forum Office",      city: "Ibadan",       statesCovered: ["Oyo","Osun","Ogun","Kwara"],                   address: "Ibadan Electricity Distribution Zone, Ibadan",         email: "ibadanforum@nerc.gov.ng" },
      { name: "Enugu Forum Office",       city: "Enugu",        statesCovered: ["Enugu","Anambra","Imo","Abia","Ebonyi"],        address: "Enugu Distribution Zone, Enugu",                       email: "enuguforum@nerc.gov.ng" },
      { name: "Kano Forum Office",        city: "Kano",         statesCovered: ["Kano","Jigawa","Katsina"],                     address: "Kano Electricity Distribution Zone, Kano",             email: "kanoforum@nerc.gov.ng" },
      { name: "Kaduna Forum Office",      city: "Kaduna",       statesCovered: ["Kaduna","Kebbi","Sokoto","Zamfara"],            address: "Kaduna Distribution Zone, Kaduna",                     email: "kadunaforum@nerc.gov.ng" },
      { name: "Jos Forum Office",         city: "Jos",          statesCovered: ["Plateau","Bauchi","Gombe","Benue"],             address: "Jos Electricity Distribution Zone, Jos",               email: "josforum@nerc.gov.ng" },
      { name: "Yola Forum Office",        city: "Yola",         statesCovered: ["Adamawa","Taraba","Borno","Yobe"],              address: "Yola Distribution Zone, Yola",                         email: "yolaforum@nerc.gov.ng" },
    ],
  });

  // NEMSA Field Offices (12)
  await prisma.nemsaFieldOffice.createMany({
    data: [
      { zoneName: "Abuja",       statesCovered: ["FCT","Nasarawa","Niger"],                    address: "NEMSA Regional Office, Abuja",                   email: "info@nemsa.gov.ng",    phone: "+2347006367200" },
      { zoneName: "Lagos-Eko",   statesCovered: ["Lagos"],                                    address: "Eko Regional Inspectorate Office, Lagos",          email: "lagos@nemsa.gov.ng" },
      { zoneName: "Lagos-Ikeja", statesCovered: ["Lagos","Ogun"],                             address: "Ikeja Regional Inspectorate Office, Lagos",        email: "ikeja@nemsa.gov.ng" },
      { zoneName: "Port-Harcourt",statesCovered: ["Rivers","Bayelsa"],                        address: "Port Harcourt Regional Office",                    email: "ph@nemsa.gov.ng" },
      { zoneName: "Benin",       statesCovered: ["Edo","Delta"],                              address: "Benin Regional Inspectorate Office",               email: "benin@nemsa.gov.ng" },
      { zoneName: "Ibadan",      statesCovered: ["Oyo","Osun","Ondo","Ekiti","Kwara"],        address: "Ibadan Regional Inspectorate Office",              email: "ibadan@nemsa.gov.ng" },
      { zoneName: "Enugu",       statesCovered: ["Enugu","Anambra","Imo","Abia","Ebonyi"],    address: "Enugu Regional Inspectorate Office",               email: "enugu@nemsa.gov.ng" },
      { zoneName: "Uyo",         statesCovered: ["Akwa Ibom","Cross River"],                 address: "Uyo Regional Inspectorate Office",                 email: "uyo@nemsa.gov.ng" },
      { zoneName: "Kano",        statesCovered: ["Kano","Jigawa","Katsina"],                 address: "Kano Regional Inspectorate Office",                email: "kano@nemsa.gov.ng" },
      { zoneName: "Kaduna",      statesCovered: ["Kaduna","Kebbi","Sokoto","Zamfara"],        address: "Kaduna Regional Inspectorate Office",              email: "kaduna@nemsa.gov.ng" },
      { zoneName: "Jos",         statesCovered: ["Plateau","Bauchi","Gombe","Benue"],         address: "Jos Regional Inspectorate Office",                 email: "jos@nemsa.gov.ng" },
      { zoneName: "Yola",        statesCovered: ["Adamawa","Taraba","Borno","Yobe"],          address: "Yola Regional Inspectorate Office",                email: "yola@nemsa.gov.ng" },
    ],
  });

  // TCN Regions (12)
  await prisma.tcnRegion.createMany({
    data: [
      { name: "Lagos Region",        headquarters: "Lagos",        coverageStates: ["Lagos"] },
      { name: "Benin Region",        headquarters: "Benin City",   coverageStates: ["Edo","Delta"] },
      { name: "Enugu Region",        headquarters: "Enugu",        coverageStates: ["Enugu","Anambra","Imo","Abia","Ebonyi"] },
      { name: "Port Harcourt Region",headquarters: "Port Harcourt",coverageStates: ["Rivers","Bayelsa","Akwa Ibom","Cross River"] },
      { name: "Kano Region",         headquarters: "Kano",         coverageStates: ["Kano","Jigawa","Katsina"] },
      { name: "Kaduna Region",       headquarters: "Kaduna",       coverageStates: ["Kaduna","Kebbi","Zamfara","Sokoto"] },
      { name: "Jos Region",          headquarters: "Jos",          coverageStates: ["Plateau","Bauchi","Gombe"] },
      { name: "Abuja Region",        headquarters: "Abuja",        coverageStates: ["FCT","Niger","Kogi","Nasarawa"] },
      { name: "Osogbo Region",       headquarters: "Osogbo",       coverageStates: ["Oyo","Osun","Ekiti","Ondo","Kwara"] },
      { name: "Bauchi Region",       headquarters: "Bauchi",       coverageStates: ["Bauchi","Gombe","Yobe","Borno"] },
      { name: "Yola Region",         headquarters: "Yola",         coverageStates: ["Adamawa","Taraba"] },
      { name: "Makurdi Region",      headquarters: "Makurdi",      coverageStates: ["Benue"] },
    ],
  });

  // TCN Control Centres (8)
  await prisma.tcnControlCentre.createMany({
    data: [
      { type: "NCC",  name: "National Control Centre",                 location: "Osogbo",       address: "Osogbo, Osun State",             coverageStates: ["Nigeria"] },
      { type: "SNCC", name: "Supplementary National Control Centre",   location: "Shiroro",      address: "Shiroro, Niger State",           coverageStates: ["Nigeria"] },
      { type: "RCC",  name: "Lagos Regional Control Centre",           location: "Lagos",        address: "Ikeja West, Lagos",              coverageStates: ["Lagos","Ogun"] },
      { type: "RCC",  name: "Benin Regional Control Centre",           location: "Benin City",   address: "Benin City, Edo State",          coverageStates: ["Edo","Delta"] },
      { type: "RCC",  name: "Enugu Regional Control Centre",           location: "Enugu",        address: "New Haven, Enugu",               coverageStates: ["Enugu","Anambra","Imo","Abia","Ebonyi"] },
      { type: "RCC",  name: "Port Harcourt Regional Control Centre",   location: "Port Harcourt",address: "Port Harcourt, Rivers State",    coverageStates: ["Rivers","Bayelsa","Akwa Ibom","Cross River"] },
      { type: "RCC",  name: "Kaduna Regional Control Centre",          location: "Kaduna",       address: "Kaduna, Kaduna State",           coverageStates: ["Kaduna","Kebbi","Zamfara","Sokoto"] },
      { type: "RCC",  name: "Bauchi Regional Control Centre",          location: "Bauchi",       address: "Bauchi, Bauchi State",           coverageStates: ["Bauchi","Gombe","Yobe","Borno"] },
    ],
  });

  // REA Zonal Offices (6)
  await prisma.reaZonalOffice.createMany({
    data: [
      { zoneName: "North Central", headquarters: "Lokoja",       statesCovered: ["Kogi","Niger","Benue","Plateau","Nasarawa","FCT"],                       address: "REA Zonal Office, Lokoja",          email: "info@rea.gov.ng", phone: "+23494611900" },
      { zoneName: "South West",    headquarters: "Osogbo",       statesCovered: ["Lagos","Oyo","Ogun","Osun","Ondo","Ekiti"],                               address: "REA South West Office, Osogbo",     email: "info@rea.gov.ng" },
      { zoneName: "South East",    headquarters: "Enugu",        statesCovered: ["Enugu","Anambra","Imo","Abia","Ebonyi"],                                  address: "REA South East Office, Enugu",      email: "info@rea.gov.ng" },
      { zoneName: "South South",   headquarters: "Port Harcourt",statesCovered: ["Rivers","Bayelsa","Akwa Ibom","Cross River","Edo","Delta"],               address: "REA South South Office, Port Harcourt", email: "info@rea.gov.ng" },
      { zoneName: "North West",    headquarters: "Kaduna",       statesCovered: ["Kaduna","Kano","Jigawa","Katsina","Kebbi","Sokoto","Zamfara"],             address: "REA North West Office, Kaduna",     email: "info@rea.gov.ng" },
      { zoneName: "North East",    headquarters: "Bauchi",       statesCovered: ["Bauchi","Gombe","Adamawa","Taraba","Yobe","Borno"],                        address: "REA North East Office, Bauchi",     email: "info@rea.gov.ng" },
    ],
  });

  // DisCo Customer Care Channels — map shortName to DisCo record
  const discoByShortName: Record<string, string> = {};
  discoData.forEach((d, i) => { discoByShortName[d.shortName] = discos[i]!.id; });

  await prisma.discoCustomerCareChannel.createMany({
    data: [
      { discoShortName: "AEDC",  discoId: discoByShortName["AEDC"],  channels: [{ channelType: "PHONE",   value: "08039070070",                    is24Hour: true }, { channelType: "EMAIL",   value: "customercare@abujaelectricity.com",  is24Hour: true }, { channelType: "WEBSITE", value: "https://abujaelectricity.com",       is24Hour: true }] },
      { discoShortName: "EKEDC", discoId: discoByShortName["EKEDC"], channels: [{ channelType: "PHONE",   value: "+2347003550000",                 is24Hour: true }, { channelType: "EMAIL",   value: "customercare@ekedp.com",             is24Hour: true }, { channelType: "WEBSITE", value: "https://ekedp.com",                  is24Hour: true }] },
      { discoShortName: "IKEDC", discoId: discoByShortName["IKEDC"], channels: [{ channelType: "PHONE",   value: "+2347000225543",                 is24Hour: true }, { channelType: "WHATSAPP",value: "+2349087928856",                      is24Hour: true }, { channelType: "EMAIL",   value: "customercare@ikejaelectric.com",     is24Hour: true }, { channelType: "WEBSITE", value: "https://ikejaelectric.com", is24Hour: true }] },
      { discoShortName: "BEDC",  discoId: discoByShortName["BEDC"],  channels: [{ channelType: "PHONE",   value: "+2348139214444",                 is24Hour: true }, { channelType: "EMAIL",   value: "customercare@bedcpower.com",         is24Hour: true }, { channelType: "WEBSITE", value: "https://bedcpower.com",              is24Hour: true }] },
      { discoShortName: "PHED",  discoId: discoByShortName["PHED"],  channels: [{ channelType: "PHONE",   value: "+2348001234567",                 is24Hour: true }, { channelType: "EMAIL",   value: "customercare@phed.com.ng",           is24Hour: true }, { channelType: "WEBSITE", value: "https://phed.com.ng",                is24Hour: true }] },
      { discoShortName: "IBEDC", discoId: discoByShortName["IBEDC"], channels: [{ channelType: "PHONE",   value: "+2347001234567",                 is24Hour: true }, { channelType: "EMAIL",   value: "customercare@ibedc.com",             is24Hour: true }, { channelType: "WEBSITE", value: "https://ibedc.com",                  is24Hour: true }] },
      { discoShortName: "EEDC",  discoId: discoByShortName["EEDC"],  channels: [{ channelType: "PHONE",   value: "+23484700000",                   is24Hour: true }, { channelType: "EMAIL",   value: "customercare@enugudisco.com",        is24Hour: true }, { channelType: "WEBSITE", value: "https://enugudisco.com",             is24Hour: true }] },
      { discoShortName: "KEDCO", discoId: discoByShortName["KEDCO"], channels: [{ channelType: "PHONE",   value: "+2348039070070",                 is24Hour: true }, { channelType: "EMAIL",   value: "customercare@kedco.ng",              is24Hour: true }, { channelType: "WEBSITE", value: "https://kedco.ng",                   is24Hour: true }] },
      { discoShortName: "KAEDCO",discoId: discoByShortName["KAEDCO"],channels: [{ channelType: "PHONE",   value: "+2348139000111",                 is24Hour: true }, { channelType: "EMAIL",   value: "customercare@kaedco.com",            is24Hour: true }, { channelType: "WEBSITE", value: "https://kaedco.com",                 is24Hour: true }] },
      { discoShortName: "JED",   discoId: discoByShortName["JED"],   channels: [{ channelType: "PHONE",   value: "+2347044440000",                 is24Hour: true }, { channelType: "EMAIL",   value: "customercare@jedplc.com",            is24Hour: true }, { channelType: "WEBSITE", value: "https://jedplc.com",                 is24Hour: true }] },
      { discoShortName: "YEDC",  discoId: discoByShortName["YEDC"],  channels: [{ channelType: "PHONE",   value: "+2348139888888",                 is24Hour: true }, { channelType: "EMAIL",   value: "customercare@yedc.ng",               is24Hour: true }, { channelType: "WEBSITE", value: "https://yedc.ng",                    is24Hour: true }] },
    ],
  });

  // Sector Glossary (40 terms)
  await prisma.glossaryTerm.createMany({
    data: [
      { acronym: "NESI",    expansion: "Nigerian Electricity Supply Industry",              definition: "Nigeria's integrated electricity market ecosystem",                                          category: "OTHER" },
      { acronym: "NERC",    expansion: "Nigerian Electricity Regulatory Commission",        definition: "Primary electricity sector regulator in Nigeria",                                           category: "AGENCY" },
      { acronym: "REA",     expansion: "Rural Electrification Agency",                     definition: "Agency responsible for rural electrification and mini-grid expansion",                      category: "AGENCY" },
      { acronym: "TCN",     expansion: "Transmission Company of Nigeria",                  definition: "Operator of the national transmission grid",                                                category: "MARKET_ROLE" },
      { acronym: "NBET",    expansion: "Nigerian Bulk Electricity Trading Plc",             definition: "Bulk trader and power purchaser",                                                           category: "MARKET_ROLE" },
      { acronym: "NEMSA",   expansion: "Nigerian Electricity Management Services Agency",   definition: "Electrical standards and inspection agency",                                               category: "AGENCY" },
      { acronym: "MYTO",    expansion: "Multi Year Tariff Order",                          definition: "Tariff methodology used by NERC",                                                           category: "INSTRUMENT" },
      { acronym: "ATC&C",   expansion: "Aggregate Technical Commercial and Collection Losses", definition: "Loss metric for DisCo performance",                                                    category: "TECHNICAL" },
      { acronym: "PPI",     expansion: "Presidential Power Initiative",                    definition: "Nigeria-Siemens power infrastructure upgrade programme",                                    category: "INSTRUMENT" },
      { acronym: "DARES",   expansion: "Distributed Access through Renewable Energy Scale-up", definition: "World Bank-backed distributed renewable energy programme",                             category: "INSTRUMENT" },
      { acronym: "FMP",     expansion: "Federal Ministry of Power",                        definition: "Federal ministry with policy oversight for the power sector",                               category: "AGENCY" },
      { acronym: "NDPHC",   expansion: "Niger Delta Power Holding Company",                definition: "Company managing NIPP power assets",                                                        category: "MARKET_ROLE" },
      { acronym: "NIPP",    expansion: "National Integrated Power Project",                definition: "Federal government power generation and infrastructure programme",                           category: "INSTRUMENT" },
      { acronym: "GENCO",   expansion: "Generation Company",                               definition: "Power generation company licensed by NERC",                                                 category: "MARKET_ROLE" },
      { acronym: "DISCO",   expansion: "Distribution Company",                             definition: "Electricity distribution company licensed by NERC",                                         category: "MARKET_ROLE" },
      { acronym: "IPP",     expansion: "Independent Power Producer",                       definition: "Privately owned power generator selling to the grid",                                       category: "MARKET_ROLE" },
      { acronym: "EPSRA",   expansion: "Electric Power Sector Reform Act",                 definition: "Foundational electricity sector legislation (2005, repealed by Electricity Act 2023)",      category: "INSTRUMENT" },
      { acronym: "EA2023",  expansion: "Electricity Act 2023",                             definition: "Current primary electricity sector legislation enabling state-level regulation",             category: "INSTRUMENT" },
      { acronym: "NCC",     expansion: "National Control Centre",                          definition: "TCN's primary grid system operator centre at Osogbo",                                       category: "TECHNICAL" },
      { acronym: "SNCC",    expansion: "Supplementary National Control Centre",            definition: "Backup national grid control centre at Shiroro",                                            category: "TECHNICAL" },
      { acronym: "RCC",     expansion: "Regional Control Centre",                          definition: "Regional grid operations centre under TCN",                                                 category: "TECHNICAL" },
      { acronym: "MAP",     expansion: "Meter Asset Provider",                             definition: "Licensed entity providing electricity meters under the MAP scheme",                         category: "MARKET_ROLE" },
      { acronym: "NMMP",    expansion: "National Mass Metering Programme",                 definition: "Federal initiative to close the metering gap across DisCos",                                category: "INSTRUMENT" },
      { acronym: "SAIDI",   expansion: "System Average Interruption Duration Index",       definition: "Reliability metric for outage duration",                                                    category: "TECHNICAL" },
      { acronym: "SAIFI",   expansion: "System Average Interruption Frequency Index",      definition: "Reliability metric for outage frequency",                                                   category: "TECHNICAL" },
      { acronym: "CAIDI",   expansion: "Customer Average Interruption Duration Index",     definition: "Reliability metric for average customer interruption duration",                             category: "TECHNICAL" },
      { acronym: "OCGT",    expansion: "Open Cycle Gas Turbine",                           definition: "Single-cycle gas turbine generation technology",                                            category: "TECHNICAL" },
      { acronym: "CCGT",    expansion: "Combined Cycle Gas Turbine",                       definition: "Higher-efficiency combined-cycle gas turbine technology",                                   category: "TECHNICAL" },
      { acronym: "PAF",     expansion: "Plant Availability Factor",                        definition: "Ratio of plant available capacity to installed capacity over a period",                     category: "TECHNICAL" },
      { acronym: "NEP",     expansion: "Nigeria Electrification Project",                  definition: "World Bank-funded REA programme for off-grid electrification",                             category: "INSTRUMENT" },
      { acronym: "NMDPRA",  expansion: "Nigerian Midstream and Downstream Petroleum Regulatory Authority", definition: "Regulator for midstream and downstream gas and petroleum infrastructure",  category: "AGENCY" },
      { acronym: "NUPRC",   expansion: "Nigerian Upstream Petroleum Regulatory Commission",definition: "Regulator for upstream petroleum operations",                                               category: "AGENCY" },
      { acronym: "NNPC",    expansion: "Nigerian National Petroleum Company Limited",      definition: "National oil company also active in gas-to-power infrastructure",                           category: "MARKET_ROLE" },
      { acronym: "PHCN",    expansion: "Power Holding Company of Nigeria",                 definition: "Predecessor monopoly utility, unbundled in 2013",                                          category: "MARKET_ROLE" },
      { acronym: "BPE",     expansion: "Bureau of Public Enterprises",                    definition: "Federal agency that supervised the NESI privatisation",                                      category: "AGENCY" },
      { acronym: "NESO",    expansion: "Nigerian Electricity System Operator",             definition: "Independent system operator function within TCN",                                            category: "MARKET_ROLE" },
      { acronym: "MO",      expansion: "Market Operator",                                 definition: "TCN function responsible for market settlement and administration",                          category: "MARKET_ROLE" },
      { acronym: "TSP",     expansion: "Transmission Service Provider",                   definition: "TCN's wires-and-substations function",                                                      category: "MARKET_ROLE" },
      { acronym: "CBN",     expansion: "Central Bank of Nigeria",                         definition: "Apex bank, also funder of power sector intervention facilities",                            category: "AGENCY" },
      { acronym: "PSRP",    expansion: "Power Sector Recovery Programme",                 definition: "Federal programme to restore financial viability of the NESI",                              category: "INSTRUMENT" },
    ],
  });

  console.log("  → Institutional directory created: 11 Forum Offices, 12 NEMSA offices, 12 TCN regions, 8 control centres, 6 REA zonal offices, 11 DisCo customer care channels, 40 glossary terms");

  // ── DATA QUALITY FLAGS ────────────────────────────────────────────────────
  await prisma.dataQualityFlag.deleteMany();
  await prisma.dataQualityFlag.createMany({
    data: [
      {
        recordId: "SUB-57cc62a5d600",
        reason: "LOW_CONFIDENCE_SOURCE",
        severity: "MEDIUM",
        detail: "Source 'TCN / OpenStreetMap 2025' scored 3/10. Coordinate data not verified with TCN GIS division. Recommend cross-referencing with official TCN network diagram.",
      },
      {
        recordId: "SUB-1f2451b14e0c",
        reason: "LOW_CONFIDENCE_SOURCE",
        severity: "MEDIUM",
        detail: "Source 'TCN / OpenStreetMap 2025' scored 3/10. Coordinate data not verified with TCN GIS division. Recommend cross-referencing with official TCN network diagram.",
      },
      {
        recordId: "SUB-85690f01417a",
        reason: "LOW_CONFIDENCE_SOURCE",
        severity: "MEDIUM",
        detail: "Source 'TCN / OpenStreetMap 2025' scored 3/10. Coordinate data not verified with TCN GIS division. Recommend cross-referencing with official TCN network diagram.",
      },
      {
        recordId: "PLT-e6a182503600",
        reason: "COORDINATE_CLUSTER",
        severity: "HIGH",
        detail: "Plant 'Egbin' is 456 m from 'AES Barge' (PLT-df303c69cfec). Both are legitimate co-located plants on the Lagos Lagoon shoreline. Confirm distinct NERC licences to close.",
      },
      {
        recordId: "PLT-e011925e480a",
        reason: "COORDINATE_CLUSTER",
        severity: "HIGH",
        detail: "Plant 'Sapele Steam' is 314 m from 'Sapele NIPP' (PLT-78b40eb96f30). Co-located at Sapele Power Station site (Delta State). Confirm distinct NERC generation licences.",
      },
      {
        recordId: "PLT-1808c51b8a9e",
        reason: "COORDINATE_CLUSTER",
        severity: "HIGH",
        detail: "Plant 'Geregu Gas' is 248 m from 'Geregu NIPP' (PLT-a8b39c54554b). Co-located at Geregu Power Plant site (Kogi State). Confirm distinct NERC generation licences.",
      },
      {
        recordId: "PLT-3fae26ce30cf",
        reason: "COORDINATE_CLUSTER",
        severity: "HIGH",
        detail: "Plant 'Olorunsogo Gas' is 313 m from 'Olorunsogo NIPP' (PLT-5ef0551d59ee). Co-located at Olorunsogo Power Station (Ogun State). Confirm distinct NERC generation licences.",
      },
      {
        recordId: "PLT-895cdf5e6bd3",
        reason: "COORDINATE_CLUSTER",
        severity: "HIGH",
        detail: "Plant 'Omotosho Gas' is 314 m from 'Omotosho NIPP' (PLT-35c335f583fd). Co-located at Omotosho Power Station (Ondo State). Confirm distinct NERC generation licences.",
      },
      {
        recordId: "PLT-f79202c1c6ce",
        reason: "COORDINATE_CLUSTER",
        severity: "HIGH",
        detail: "Plant 'Afam VI' is 314 m from 'Afam IV-V' (PLT-194daa532178). Co-located at Afam Power Station complex (Rivers State). Confirm distinct NERC generation licences.",
      },
      {
        recordId: "PLT-f46aa0b99814",
        reason: "COORDINATE_CLUSTER",
        severity: "HIGH",
        detail: "Plant 'Rivers IPP' is 314 m from 'Notore Power' (PLT-8b3a24221e8f). Both located in Trans-Amadi Industrial Layout, Port Harcourt. Confirm distinct NERC licences and street addresses.",
      },
    ],
  });

  // ── SYSTEM SETTINGS ───────────────────────────────────────────────────────
  await prisma.systemSetting.createMany({
    data: [
      { key: "classification_banner",   value: "RESTRICTED — Minister's War Room" },
      { key: "complaints_panel_note",   value: "Per NERC Q1 2025 Quarterly Report, DisCos resolved only 1,554 of 4,169 NERC-CCU complaints (37.27% resolution rate). Forum Offices achieved 74.10%. Estimated billing remains the highest-political-risk category." },
      { key: "sla_metering_hours",      value: "40" },
      { key: "sla_billing_hours",       value: "120" },
      { key: "sla_supply_interruption_hours", value: "24" },
      { key: "sla_electrocution_hours", value: "0" },
      { key: "seed_version",            value: "v2.0-warroom-2026-05-09" },
      { key: "total_plants",            value: "30" },
      { key: "total_substations",       value: "43" },
      { key: "total_mini_grids",        value: "35" },
    ],
  });

  console.log("✅ Seed complete!");
  console.log("   Admin:       admin@warroom.gov.ng / Admin@WarRoom2025!");
  console.log("   Minister:    minister@power.gov.ng / Staff@Ministry2025");
  console.log("   Staff:       staff@power.gov.ng / Staff@Ministry2025");
  console.log("   NERC Viewer: analyst@nerc.gov.ng / Staff@Ministry2025");
  console.log("   Eko Agent:   agent@ekedc.com.ng / Agent@DisCo2025");
  console.log("   Plants: 30 | Substations: 43 | Complaints: 1,500");
  console.log("   Glossary: 40 | Forum Offices: 11 | Mini-grids: 35");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
