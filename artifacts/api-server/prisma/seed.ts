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

function genTicket() {
  const now = new Date();
  const base = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
  return `WR-${base}-${Math.floor(Math.random()*999999).toString().padStart(6,"0")}`;
}

async function main() {
  console.log("🌱 Seeding National Energy War Room database...");

  // Clear existing data
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

  console.log("  → Cleared existing data");

  // ORGANISATIONS
  const orgs = await Promise.all([
    prisma.organisation.create({ data: { name: "TCN (Transmission Company of Nigeria)", type: "TCN" } }),
    prisma.organisation.create({ data: { name: "NBET (Nigerian Bulk Electricity Trading)", type: "NBET" } }),
    prisma.organisation.create({ data: { name: "NERC", type: "NERC" } }),
    prisma.organisation.create({ data: { name: "REA (Rural Electrification Agency)", type: "REA" } }),
    prisma.organisation.create({ data: { name: "Sahara Energy (Egbin)", type: "GENCO" } }),
    prisma.organisation.create({ data: { name: "Transcorp Power (Ughelli)", type: "GENCO" } }),
    prisma.organisation.create({ data: { name: "Mainstream Energy Solutions", type: "GENCO" } }),
    prisma.organisation.create({ data: { name: "Azura Power West Africa", type: "GENCO" } }),
    prisma.organisation.create({ data: { name: "NDPHC (Olorunsogo NIPP)", type: "NDPHC" } }),
    prisma.organisation.create({ data: { name: "Niger Delta Power Holding Company", type: "NDPHC" } }),
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
    prisma.organisation.create({ data: { name: "FMP (Federal Ministry of Power)", type: "FMP" } }),
    prisma.organisation.create({ data: { name: "Agip Oil Company (Okpai)", type: "GENCO" } }),
  ]);

  const [tcnOrg, nbetOrg, nercOrg, reaOrg,
    saharaOrg, transcorpOrg, mainstreamOrg, azuraOrg, ndphcOrg, ndphc2Org,
    ekoOrg, ikejaOrg, abujaOrg, ibadanOrg, enuguOrg, beninOrg, phOrg, kadunaOrg, josOrg, kanoOrg, yolaOrg,
    ngicOrg, fmpOrg, agipOrg] = orgs;

  console.log("  → Organisations created");

  // USERS
  const adminPwd = await bcrypt.hash("Admin@WarRoom2025!", 12);
  const staffPwd = await bcrypt.hash("Staff@Ministry2025", 12);
  const agentPwd = await bcrypt.hash("Agent@DisCo2025", 12);

  const adminUser = await prisma.user.create({
    data: { email: "admin@warroom.gov.ng", passwordHash: adminPwd, role: "ADMIN", fullName: "System Administrator", phone: "+2348000000001", isActive: true },
  });
  const ministerUser = await prisma.user.create({
    data: { email: "minister@power.gov.ng", passwordHash: staffPwd, role: "MINISTER", fullName: "Hon. Minister of Power", phone: "+2348000000002", isActive: true },
  });
  const staffUser = await prisma.user.create({
    data: { email: "staff@power.gov.ng", passwordHash: staffPwd, role: "MINISTRY_STAFF", fullName: "Senior Technical Adviser", phone: "+2348000000003", isActive: true },
  });
  const nercViewer = await prisma.user.create({
    data: { email: "analyst@nerc.gov.ng", passwordHash: staffPwd, role: "NERC_VIEWER", fullName: "NERC Policy Analyst", phone: "+2348000000004", organisationId: nercOrg!.id, isActive: true },
  });
  const ekoAgent = await prisma.user.create({
    data: { email: "agent@ekedc.com.ng", passwordHash: agentPwd, role: "DISCO_AGENT", fullName: "Eko DisCo CCU Agent", phone: "+2348000000005", organisationId: ekoOrg!.id, isActive: true },
  });

  console.log("  → Users created (admin@warroom.gov.ng / Admin@WarRoom2025!)");

  // SUBSTATIONS
  const substations = await Promise.all([
    prisma.substation.create({ data: { name: "Ikeja West", voltageClass: "330kV", capacityMva: 900, latitude: 6.6194, longitude: 3.3505, state: "Lagos", ownerOrgId: tcnOrg!.id } }),
    prisma.substation.create({ data: { name: "Benin", voltageClass: "330kV", capacityMva: 750, latitude: 6.3350, longitude: 5.6270, state: "Edo", ownerOrgId: tcnOrg!.id } }),
    prisma.substation.create({ data: { name: "Shiroro", voltageClass: "330kV", capacityMva: 600, latitude: 9.9792, longitude: 6.8284, state: "Niger", ownerOrgId: tcnOrg!.id } }),
    prisma.substation.create({ data: { name: "Kaduna", voltageClass: "330kV", capacityMva: 500, latitude: 10.5264, longitude: 7.4384, state: "Kaduna", ownerOrgId: tcnOrg!.id } }),
    prisma.substation.create({ data: { name: "Jebba", voltageClass: "330kV", capacityMva: 450, latitude: 9.1422, longitude: 4.8317, state: "Kwara", ownerOrgId: tcnOrg!.id } }),
    prisma.substation.create({ data: { name: "New Haven", voltageClass: "330kV", capacityMva: 400, latitude: 6.4584, longitude: 7.5464, state: "Enugu", ownerOrgId: tcnOrg!.id } }),
    prisma.substation.create({ data: { name: "Onitsha", voltageClass: "330kV", capacityMva: 300, latitude: 6.1468, longitude: 6.7860, state: "Anambra", ownerOrgId: tcnOrg!.id } }),
    prisma.substation.create({ data: { name: "Kano", voltageClass: "330kV", capacityMva: 350, latitude: 12.0022, longitude: 8.5920, state: "Kano", ownerOrgId: tcnOrg!.id } }),
  ]);

  const [ikejaWest, beninSub, shiroroSub, kadunaSub, jebbaSub, newHavenSub, onitshaLoc, kanoSub] = substations;

  // TRANSMISSION LINES
  await Promise.all([
    prisma.transmissionLine.create({ data: { name: "Egbin–Ikeja West", voltageKv: 330, lengthKm: 62, capacityMva: 750, currentLoadingPct: 91, fromSubstationId: ikejaWest!.id, toSubstationId: ikejaWest!.id, status: "ACTIVE", lossesPct: 1.2 } }),
    prisma.transmissionLine.create({ data: { name: "Benin–Ikeja West", voltageKv: 330, lengthKm: 280, capacityMva: 600, currentLoadingPct: 74, fromSubstationId: beninSub!.id, toSubstationId: ikejaWest!.id, status: "ACTIVE", lossesPct: 2.1 } }),
    prisma.transmissionLine.create({ data: { name: "Shiroro–Kaduna", voltageKv: 330, lengthKm: 96, capacityMva: 450, currentLoadingPct: 65, fromSubstationId: shiroroSub!.id, toSubstationId: kadunaSub!.id, status: "ACTIVE", lossesPct: 0.9 } }),
    prisma.transmissionLine.create({ data: { name: "Jebba–Shiroro", voltageKv: 330, lengthKm: 244, capacityMva: 400, currentLoadingPct: 58, fromSubstationId: jebbaSub!.id, toSubstationId: shiroroSub!.id, status: "ACTIVE", lossesPct: 1.5 } }),
    prisma.transmissionLine.create({ data: { name: "Onitsha–New Haven", voltageKv: 330, lengthKm: 96, capacityMva: 300, currentLoadingPct: 82, fromSubstationId: onitshaLoc!.id, toSubstationId: newHavenSub!.id, status: "ACTIVE", lossesPct: 1.0 } }),
    prisma.transmissionLine.create({ data: { name: "Kaduna–Kano", voltageKv: 330, lengthKm: 230, capacityMva: 350, currentLoadingPct: 71, fromSubstationId: kadunaSub!.id, toSubstationId: kanoSub!.id, status: "ACTIVE", lossesPct: 1.8 } }),
  ]);

  console.log("  → Transmission infrastructure created");

  // PLANTS
  const plants = await Promise.all([
    prisma.plant.create({ data: { name: "Egbin Power Station", type: "GAS_STEAM", installedMw: 1320, availableMw: 608, actualMw: 447, state: "Lagos", latitude: 6.5228, longitude: 3.7403, status: "PARTIAL", gencoOrgId: saharaOrg!.id, paf: 46, commissioningDate: new Date("1985-01-01"), notes: "Gas-constrained. Sep 2025: 46% PAF" } }),
    prisma.plant.create({ data: { name: "Delta IV (Ughelli Power)", type: "GAS_STEAM", installedMw: 900, availableMw: 540, actualMw: 420, state: "Delta", latitude: 5.5167, longitude: 6.0167, status: "PARTIAL", gencoOrgId: transcorpOrg!.id, paf: 60 } }),
    prisma.plant.create({ data: { name: "Kainji Hydro", type: "HYDRO", installedMw: 760, availableMw: 693, actualMw: 693, state: "Niger", latitude: 9.8664, longitude: 4.5714, status: "OPERATING", gencoOrgId: mainstreamOrg!.id, paf: 91, commissioningDate: new Date("1968-01-01"), notes: "Mainstream Energy concession. 91% Load Factor Sep 2025" } }),
    prisma.plant.create({ data: { name: "Jebba Hydro", type: "HYDRO", installedMw: 578, availableMw: 422, actualMw: 422, state: "Niger", latitude: 9.1422, longitude: 4.8317, status: "OPERATING", gencoOrgId: mainstreamOrg!.id, paf: 73, notes: "73% Load Factor Sep 2025" } }),
    prisma.plant.create({ data: { name: "Shiroro Hydro", type: "HYDRO", installedMw: 600, availableMw: 360, actualMw: 320, state: "Niger", latitude: 9.9792, longitude: 6.8284, status: "PARTIAL", gencoOrgId: mainstreamOrg!.id, paf: 55 } }),
    prisma.plant.create({ data: { name: "Zungeru Hydro", type: "HYDRO", installedMw: 700, availableMw: 700, actualMw: 700, state: "Niger", latitude: 9.8042, longitude: 6.1530, status: "OPERATING", gencoOrgId: tcnOrg!.id, paf: 100, commissioningDate: new Date("2023-06-01"), notes: "100% PAF Sep 2025" } }),
    prisma.plant.create({ data: { name: "Azura-Edo IPP", type: "GAS_OCGT", installedMw: 461, availableMw: 443, actualMw: 443, state: "Edo", latitude: 6.4590, longitude: 5.6295, status: "OPERATING", gencoOrgId: azuraOrg!.id, paf: 96, commissioningDate: new Date("2018-05-01"), notes: "~96% utilisation. Vesting contract-backed" } }),
    prisma.plant.create({ data: { name: "Olorunsogo NIPP", type: "GAS_OCGT", installedMw: 754, availableMw: 181, actualMw: 181, state: "Ogun", latitude: 6.9736, longitude: 3.7681, status: "CONSTRAINED", gencoOrgId: ndphcOrg!.id, paf: 24, notes: "~24% util. Gas-constrained" } }),
    prisma.plant.create({ data: { name: "Geregu I & II", type: "GAS_CCGT", installedMw: 849, availableMw: 509, actualMw: 420, state: "Kogi", latitude: 7.6832, longitude: 6.5430, status: "PARTIAL", gencoOrgId: ndphc2Org!.id, paf: 50 } }),
    prisma.plant.create({ data: { name: "Afam VI (Transcorp)", type: "GAS_CCGT", installedMw: 650, availableMw: 390, actualMw: 340, state: "Rivers", latitude: 4.8952, longitude: 7.1250, status: "PARTIAL", gencoOrgId: transcorpOrg!.id, paf: 52, notes: "Acquired from Shell 2021 by Transcorp Power" } }),
    prisma.plant.create({ data: { name: "Okpai I & II (Agip)", type: "GAS_CCGT", installedMw: 900, availableMw: 810, actualMw: 750, state: "Delta", latitude: 5.8052, longitude: 6.6250, status: "OPERATING", gencoOrgId: agipOrg!.id, paf: 83 } }),
    prisma.plant.create({ data: { name: "Sapele Power", type: "GAS_STEAM", installedMw: 720, availableMw: 130, actualMw: 100, state: "Delta", latitude: 5.8958, longitude: 5.6775, status: "CONSTRAINED", gencoOrgId: transcorpOrg!.id, paf: 18, notes: "~18% util. Gas-constrained" } }),
    prisma.plant.create({ data: { name: "Calabar NIPP", type: "GAS_CCGT", installedMw: 563, availableMw: 214, actualMw: 190, state: "Cross River", latitude: 4.9517, longitude: 8.3221, status: "CONSTRAINED", gencoOrgId: ndphcOrg!.id, paf: 38, notes: "~38% util" } }),
    prisma.plant.create({ data: { name: "Alaoji NIPP", type: "GAS_CCGT", installedMw: 1131, availableMw: 0, actualMw: 0, state: "Abia", latitude: 5.1288, longitude: 7.3875, status: "OUT", gencoOrgId: ndphcOrg!.id, paf: 0, notes: "0 MW output Sep 2025 — gas allocation issue" } }),
    prisma.plant.create({ data: { name: "Omoku Rivers IPP", type: "GAS_OCGT", installedMw: 150, availableMw: 0, actualMw: 0, state: "Rivers", latitude: 5.3225, longitude: 6.6893, status: "OUT", gencoOrgId: ndphc2Org!.id, paf: 0, notes: "0 MW output Sep 2025" } }),
  ]);

  const [egbinPlant, , , , , , , , , , , , , , ] = plants;

  // Add plant units to Egbin
  await prisma.plantUnit.createMany({
    data: [
      { plantId: egbinPlant!.id, unitName: "Unit 1", capacityMw: 220, currentOutputMw: 80, status: "PARTIAL", fuelStatus: "GAS_AVAILABLE" },
      { plantId: egbinPlant!.id, unitName: "Unit 2", capacityMw: 220, currentOutputMw: 120, status: "PARTIAL", fuelStatus: "GAS_AVAILABLE" },
      { plantId: egbinPlant!.id, unitName: "Unit 3", capacityMw: 220, currentOutputMw: 0, status: "MAINTENANCE", fuelStatus: "GAS_AVAILABLE" },
      { plantId: egbinPlant!.id, unitName: "Unit 4", capacityMw: 220, currentOutputMw: 147, status: "OPERATING", fuelStatus: "GAS_AVAILABLE" },
      { plantId: egbinPlant!.id, unitName: "Unit 5", capacityMw: 220, currentOutputMw: 100, status: "PARTIAL", fuelStatus: "GAS_CONSTRAINED" },
      { plantId: egbinPlant!.id, unitName: "Unit 6", capacityMw: 220, currentOutputMw: 0, status: "OUT", fuelStatus: "NO_GAS", lastTripCause: "Low gas pressure" },
    ],
  });

  console.log("  → Plants created (14 grid-connected)");

  // DISCOS with Q1 2025 NERC actuals
  const discoData = [
    { name: "Eko", atcc: 29.06, collEff: 84.79, metRate: 55.2, hours: 18.5, complaints: 22000, rank: 1, badge: "GOOD" as const, myto: 21.32, lat: 6.4531, lng: 3.3958, orgId: ekoOrg!.id, remittance: 100 },
    { name: "Ikeja", atcc: 34.14, collEff: 78.52, metRate: 48.1, hours: 16.2, complaints: 38000, rank: 2, badge: "GOOD" as const, myto: 21.32, lat: 6.6194, lng: 3.3505, orgId: ikejaOrg!.id, remittance: 100 },
    { name: "Abuja", atcc: 44.00, collEff: 72.30, metRate: 42.5, hours: 14.8, complaints: 18000, rank: 3, badge: "WARN" as const, myto: 21.32, lat: 9.0579, lng: 7.4951, orgId: abujaOrg!.id, remittance: 99 },
    { name: "Ibadan", atcc: 41.70, collEff: 74.10, metRate: 39.8, hours: 13.5, complaints: 35000, rank: 4, badge: "WARN" as const, myto: 21.32, lat: 7.3775, lng: 3.9470, orgId: ibadanOrg!.id, remittance: 100 },
    { name: "Enugu", atcc: 24.65, collEff: 76.90, metRate: 52.1, hours: 17.2, complaints: 15000, rank: 1, badge: "GOOD" as const, myto: 21.32, lat: 6.4584, lng: 7.5464, orgId: enuguOrg!.id, remittance: 99 },
    { name: "Benin", atcc: 42.83, collEff: 70.20, metRate: 38.5, hours: 12.8, complaints: 20000, rank: 4, badge: "WARN" as const, myto: 21.32, lat: 6.3350, lng: 5.6270, orgId: beninOrg!.id, remittance: 100 },
    { name: "Port Harcourt", atcc: 55.90, collEff: 60.40, metRate: 30.2, hours: 10.5, complaints: 42000, rank: 5, badge: "BAD" as const, myto: 21.32, lat: 4.8156, lng: 7.0498, orgId: phOrg!.id, remittance: 100 },
    { name: "Kaduna", atcc: 68.57, collEff: 55.10, metRate: 25.8, hours: 8.2, complaints: 28000, rank: 6, badge: "BAD" as const, myto: 21.32, lat: 10.5264, lng: 7.4384, orgId: kadunaOrg!.id, remittance: 40 },
    { name: "Jos", atcc: 62.13, collEff: 47.19, metRate: 28.4, hours: 9.1, complaints: 19000, rank: 6, badge: "BAD" as const, myto: 21.32, lat: 9.8965, lng: 8.8583, orgId: josOrg!.id, remittance: 71 },
    { name: "Kano", atcc: 49.00, collEff: 65.30, metRate: 33.7, hours: 11.2, complaints: 32000, rank: 5, badge: "BAD" as const, myto: 21.32, lat: 12.0022, lng: 8.5920, orgId: kanoOrg!.id, remittance: 100 },
    { name: "Yola", atcc: 46.56, collEff: 68.10, metRate: 35.1, hours: 12.0, complaints: 12000, rank: 5, badge: "WARN" as const, myto: 21.32, lat: 9.2035, lng: 12.4954, orgId: yolaOrg!.id, remittance: 100 },
  ];

  const discos = await Promise.all(
    discoData.map(d => prisma.disCo.create({
      data: {
        name: d.name, atccLossPct: d.atcc, collectionEffPct: d.collEff, meteringRatePct: d.metRate,
        hoursOfSupplyDaily: d.hours, complaintsLastQuarter: d.complaints, rank: d.rank,
        badge: d.badge, mytoTargetAtcc: d.myto, latitude: d.lat, longitude: d.lng,
        operatorOrgId: d.orgId,
      },
    }))
  );

  // Feeders for each DisCo
  for (let i = 0; i < discos.length; i++) {
    const disco = discos[i]!;
    const dd = discoData[i]!;
    await prisma.feeder.createMany({
      data: [
        { discoId: disco.id, name: `${dd.name} Feeder A`, voltage: "11kV", customerCount: 12000, supplyHours: dd.hours - 2, atccLossPct: dd.atcc - 5, securityRisk: false },
        { discoId: disco.id, name: `${dd.name} Feeder B`, voltage: "11kV", customerCount: 8500, supplyHours: dd.hours - 4, atccLossPct: dd.atcc + 8, securityRisk: dd.atcc > 55 },
        { discoId: disco.id, name: `${dd.name} Feeder C (Rural)`, voltage: "11kV", customerCount: 3200, supplyHours: dd.hours - 8, atccLossPct: dd.atcc + 20, securityRisk: true },
      ],
    });
  }

  console.log("  → DisCos and feeders created");

  // SETTLEMENT INVOICES Q1 2025
  const totalDrog = 432130000000;
  const totalRemitted = 414260000000;
  const discoWeights = [0.12, 0.18, 0.11, 0.14, 0.08, 0.09, 0.10, 0.05, 0.04, 0.06, 0.03];

  for (let i = 0; i < discos.length; i++) {
    const disco = discos[i]!;
    const dd = discoData[i]!;
    const weight = discoWeights[i] ?? 0.09;
    const drog = totalDrog * weight;
    const remitted = drog * (dd.remittance / 100);
    await prisma.settlementInvoice.create({
      data: {
        period: "2025-Q1",
        discoId: disco.id,
        drogAdjustedNgn: drog,
        remittedNgn: remitted,
        remittancePct: dd.remittance,
        nbetInvoiceNgn: drog * 1.05,
        mooInvoiceNgn: drog * 1.08,
        notes: "NERC Q1 2025 settlement data",
      },
    });
  }

  console.log("  → Settlement invoices created");

  // GAS PIPELINES
  await prisma.gasPipeline.createMany({
    data: [
      { name: "ELPS (Escravos-Lagos Pipeline)", capacity: "1.1 Bcf/d", operator: "NGIC", status: "OPERATIONAL", fromPoint: "Escravos, Delta", toPoint: "Lagos", notes: "Primary gas supply to Lagos generation" },
      { name: "Trans-Forcados Pipeline", capacity: "400 Mmscf/d", operator: "Shell/NGIC", status: "OPERATIONAL", fromPoint: "Forcados, Delta", toPoint: "Warri", notes: "Feeds western plants" },
      { name: "OB3 Phase 1 Oben–Ajaokuta", capacity: "2.0 Bcf/d", operator: "NGIC", status: "OPERATIONAL", fromPoint: "Oben, Edo", toPoint: "Ajaokuta, Kogi", notes: "Commissioned. Critical spine for AKK" },
      { name: "AKK – Ajaokuta–Kaduna–Kano", capacity: "614 km, 3.5 Bcf/d capacity", operator: "NNPC/NGIC", status: "CONSTRUCTION", fromPoint: "Ajaokuta, Kogi", toPoint: "Kano, Kano", notes: "Mainline welding completed Dec 2025 incl. River Niger crossing. First gas to Abuja target Jul 2026. Midline compressor at Ajaokuta still required per NGIC Jul 2025." },
      { name: "Nigeria–Morocco Gas Pipeline", capacity: "~3 Bcf/d planned", operator: "NNPC/ONHYM", status: "PROPOSED", fromPoint: "Warri, Delta", toPoint: "Tangier, Morocco", notes: "5,660 km trans-West Africa pipeline" },
      { name: "Trans-Saharan Gas Pipeline (TSGP)", capacity: "30 Bcm/yr planned", operator: "NNPC/Algeria/Niger", status: "PROPOSED", fromPoint: "Warri, Delta", toPoint: "Hassi R'Mel, Algeria", notes: "4,128 km to Europe via Algeria" },
    ],
  });

  // CAPITAL PROJECTS
  await prisma.capitalProject.createMany({
    data: [
      { name: "Mambilla Hydropower Project", category: "GENERATION", status: "EPC_UNDER_REVIEW", sponsorOrgId: fmpOrg!.id, latitude: 7.1833, longitude: 11.9500, capexUsd: 5800000000, completionPct: 8, notes: "3,050 MW. EPC contract under review. Critical to northern grid.", sourceRef: "FEC approval 2017" },
      { name: "Zungeru Hydropower (Completed)", category: "GENERATION", status: "OPERATIONAL", sponsorOrgId: fmpOrg!.id, latitude: 9.8042, longitude: 6.1530, capexUsd: 1300000000, completionPct: 100, notes: "700 MW. Fully operational as at Sep 2025." },
      { name: "Kashimbila Hydropower", category: "GENERATION", status: "OPERATIONAL", sponsorOrgId: fmpOrg!.id, latitude: 7.4456, longitude: 9.4127, capexUsd: 310000000, completionPct: 100, notes: "40 MW. On-grid." },
      { name: "Siemens PPI Phase 1", category: "TRANSMISSION", status: "NEAR_COMPLETE", sponsorOrgId: tcnOrg!.id, latitude: 9.0579, longitude: 7.4951, capexUsd: 2000000000, completionPct: 85, notes: "12 sites: Apo, Ajah, Okene, Nike Lake, Kwanar Dangora, Maryland, Omouaran, Ojo, Amukpe, Ihovbor, Potiskum, Birnin Kebbi. ~85% installed." },
      { name: "Siemens PPI Phase 2", category: "TRANSMISSION", status: "CONSTRUCTION", sponsorOrgId: tcnOrg!.id, latitude: 9.0579, longitude: 7.4951, capexUsd: 328800000, completionPct: 15, notes: "$328.8M CMEC EPC signed Apr 2025. 7 line upgrades + 10 new lines, 544 km, 7,140 MW.", sourceRef: "CMEC EPC Agreement Apr 2025" },
      { name: "Qua Iboe IPP", category: "GENERATION", status: "CONSTRUCTION", sponsorOrgId: azuraOrg!.id, latitude: 4.6058, longitude: 7.9850, capexUsd: 1200000000, completionPct: 40, notes: "540 MW gas-fired IPP in Akwa Ibom" },
      { name: "Afam III Fast Power", category: "GENERATION", status: "CONSTRUCTION", sponsorOrgId: transcorpOrg!.id, latitude: 4.8952, longitude: 7.1250, capexUsd: 450000000, completionPct: 55, notes: "240 MW addition to Afam complex" },
    ],
  });

  // MINI-GRIDS
  await prisma.miniGrid.createMany({
    data: [
      { name: "Bayero University Solar MiniGrid", capacityKw: 7100, beneficiaries: 25000, latitude: 12.0022, longitude: 8.5920, operatorOrgId: reaOrg!.id, programme: "NEP", status: "OPERATIONAL" },
      { name: "ABU Zaria Solar MiniGrid", capacityKw: 7100, beneficiaries: 22000, latitude: 11.1521, longitude: 7.6601, operatorOrgId: reaOrg!.id, programme: "NEP", status: "OPERATIONAL" },
      { name: "UDUS Sokoto Solar MiniGrid", capacityKw: 7100, beneficiaries: 18000, latitude: 12.9050, longitude: 5.2320, operatorOrgId: reaOrg!.id, programme: "NEP", status: "OPERATIONAL" },
      { name: "Sabon Gari Market Solar (Kano)", capacityKw: 1000, beneficiaries: 5000, latitude: 12.0103, longitude: 8.5891, operatorOrgId: reaOrg!.id, programme: "NEP", status: "OPERATIONAL" },
      { name: "Ariaria Market Solar (Aba)", capacityKw: 9500, beneficiaries: 45000, latitude: 5.1063, longitude: 7.3540, operatorOrgId: reaOrg!.id, programme: "DARES", status: "OPERATIONAL" },
      { name: "DARES Phase 1 (World Bank 1GW)", capacityKw: 125000, beneficiaries: 500000, latitude: 9.0579, longitude: 7.4951, operatorOrgId: reaOrg!.id, programme: "DARES", status: "CONSTRUCTION" },
    ],
  });

  console.log("  → Gas pipelines, capital projects, minigrids created");

  // DIVERSION OPPORTUNITIES
  await prisma.diversionOpportunity.create({
    data: { plantId: plants[0]!.id, tapPoint: "Lagos-Lekki Corridor", tapLatitude: 6.4698, tapLongitude: 3.5852, lengthKm: 12, capacityRequired: 100, indicativeCapex: 45000000, note: "High-density commercial zone with reliable revenue potential", priority: 1 },
  });

  // GRID METRICS (recent history)
  const now = new Date();
  await prisma.gridMetric.createMany({
    data: Array.from({ length: 48 }, (_, i) => ({
      timestamp: new Date(now.getTime() - (47 - i) * 30 * 60 * 1000),
      frequencyHz: 50 + (Math.random() - 0.5) * 0.4,
      upperVoltageKv: 330 + (Math.random() - 0.5) * 10,
      lowerVoltageKv: 132 + (Math.random() - 0.5) * 5,
      sentOutMwh: 4500 + Math.random() * 500,
      demandMwh: 5200 + Math.random() * 300,
    })),
  });

  console.log("  → Grid metrics seeded (48 datapoints)");

  // ALERTS
  await prisma.alert.createMany({
    data: [
      { severity: "CRITICAL", category: "GENERATION", title: "Alaoji NIPP: Zero Output", message: "Alaoji NIPP (1,131 MW installed) has zero output due to gas allocation failure. 750,000+ customers affected.", actionRequired: "Activate emergency gas supply protocol. Engage NGIC and gas shippers.", status: "OPEN" },
      { severity: "HIGH", category: "TRANSMISSION", title: "Egbin–Ikeja West Loading at 91%", message: "Egbin–Ikeja West 330kV line operating at 91% capacity. Trip risk during peak demand.", actionRequired: "Reduce Egbin dispatch or manage load. Alert TCN control centre.", status: "ACKNOWLEDGED" },
      { severity: "HIGH", category: "SETTLEMENT", title: "Kaduna DisCo: 40% Remittance Rate", message: "Kaduna DisCo remitted only 40% of Q1 2025 DRO-adjusted invoice. Cumulative debt increasing.", actionRequired: "Enforce per CPR 2023. Consider supply restriction order.", status: "OPEN" },
      { severity: "MEDIUM", category: "COMPLAINTS", title: "SLA Breach Spike — Ibadan", message: "Ibadan DisCo has 847 complaints with SLA breached. Estimated billing category dominates.", actionRequired: "Issue compliance notice to Ibadan DisCo CCU.", status: "OPEN" },
      { severity: "INFO", category: "PROJECTS", title: "AKK Pipeline Milestone", message: "AKK mainline welding completed Dec 2025 including River Niger crossing. First gas to Abuja target Jul 2026.", actionRequired: "Confirm midline compressor delivery schedule with NGIC.", status: "ACKNOWLEDGED" },
    ],
  });

  console.log("  → Alerts created");

  // VALUE CHAIN LINKS
  const valueChainLinks = [
    { key: "gas", name: "Gas Supply", status: "R" as const, order: 1, meta: "Gas supply chain from wellhead to power plant gate. Primary constraint on generation capacity utilisation. ~44% of theoretical gas allocation actually delivered." },
    { key: "gen", name: "Generation", status: "A" as const, order: 2, meta: "Grid-connected generation from 28 plants. Average available capacity 5,366 MW vs 13,000+ MW installed — 39% PAF." },
    { key: "tx", name: "Transmission", status: "A" as const, order: 3, meta: "TCN operates 5,523 km of 330kV and 6,801 km of 132kV lines. Key constraint: wheeling capacity and right-of-way disputes." },
    { key: "dist", name: "Distribution", status: "R" as const, order: 4, meta: "11 DisCos. Weighted ATC&C loss 39.61% vs MYTO target 20.54%. Metering rate 46.98%." },
    { key: "settlement", name: "Settlement & Trading", status: "A" as const, order: 5, meta: "NBET as single buyer. DRO-adjusted invoice ₦432.13bn Q1 2025. 95.86% remittance rate overall but Kaduna 40%, Jos 71%." },
    { key: "customer", name: "Customer & Metering", status: "R" as const, order: 6, meta: "254,404 complaints Q1 2025. Forum Office resolution rate 74.10%. DisCo-CCU resolution rate 37.27%. Estimated billing: highest political risk." },
    { key: "offgrid", name: "Off-Grid & DRE", status: "G" as const, order: 7, meta: "REA managing NEP and DARES. 1GW DARES target, $750M World Bank facility. 6 flagship minigrids operational." },
    { key: "capex", name: "Capital Projects", status: "A" as const, order: 8, meta: "Siemens PPI Phase 1 at 85%. Phase 2 EPC signed Apr 2025. Mambilla under EPC review. AKK nearing first gas." },
  ];

  const vcLinks = await Promise.all(
    valueChainLinks.map(v => prisma.valueChainLink.create({ data: v }))
  );

  // STAKEHOLDERS per value chain link
  const vcMap = Object.fromEntries(vcLinks.map(v => [v.key, v]));

  await prisma.stakeholder.createMany({
    data: [
      { valueChainLinkId: vcMap["gas"]!.id, role: "OPERATOR", title: "Group Managing Director / CEO, NNPC Ltd", organisationId: ngicOrg!.id, escalationOrder: 1 },
      { valueChainLinkId: vcMap["gas"]!.id, role: "REGULATOR", title: "Executive Vice-President, NMDPRA", escalationOrder: 2 },
      { valueChainLinkId: vcMap["gas"]!.id, role: "COUNTERPART", title: "MD/CEO, NGIC", organisationId: ngicOrg!.id, escalationOrder: 3 },
      { valueChainLinkId: vcMap["gen"]!.id, role: "OPERATOR", title: "CEO, Mainstream Energy Solutions", organisationId: mainstreamOrg!.id, escalationOrder: 1 },
      { valueChainLinkId: vcMap["gen"]!.id, role: "REGULATOR", title: "Chairman, NERC", organisationId: nercOrg!.id, escalationOrder: 2 },
      { valueChainLinkId: vcMap["gen"]!.id, role: "COUNTERPART", title: "MD/CEO, Azura Power", organisationId: azuraOrg!.id, escalationOrder: 3 },
      { valueChainLinkId: vcMap["tx"]!.id, role: "OPERATOR", title: "MD/CEO, TCN", organisationId: tcnOrg!.id, escalationOrder: 1 },
      { valueChainLinkId: vcMap["tx"]!.id, role: "REGULATOR", title: "Chairman, NERC", organisationId: nercOrg!.id, escalationOrder: 2 },
      { valueChainLinkId: vcMap["dist"]!.id, role: "OPERATOR", title: "MD/CEO, Ikeja Electric", organisationId: ikejaOrg!.id, escalationOrder: 1 },
      { valueChainLinkId: vcMap["dist"]!.id, role: "REGULATOR", title: "Chairman, NERC", organisationId: nercOrg!.id, escalationOrder: 2 },
      { valueChainLinkId: vcMap["settlement"]!.id, role: "OPERATOR", title: "MD/CEO, NBET", organisationId: nbetOrg!.id, escalationOrder: 1 },
      { valueChainLinkId: vcMap["customer"]!.id, role: "REGULATOR", title: "Director, Consumer Affairs, NERC", organisationId: nercOrg!.id, escalationOrder: 1 },
      { valueChainLinkId: vcMap["offgrid"]!.id, role: "OPERATOR", title: "MD/CEO, REA", organisationId: reaOrg!.id, escalationOrder: 1 },
    ],
  });

  await prisma.authorityInstrument.createMany({
    data: [
      { valueChainLinkId: vcMap["gas"]!.id, name: "Petroleum Industry Act 2021", citation: "PIA 2021, Part IV", description: "Upstream gas governance and deregulation" },
      { valueChainLinkId: vcMap["gen"]!.id, name: "Electricity Act 2023", citation: "EA 2023", description: "Sector reform and subnational role expansion" },
      { valueChainLinkId: vcMap["gen"]!.id, name: "MYTO 2025", citation: "NERC MYTO Order 2025", description: "Multi-Year Tariff Order setting cost-reflective tariff path" },
      { valueChainLinkId: vcMap["gen"]!.id, name: "Vesting Contracts", citation: "NBET Vesting Contracts", description: "Take-or-pay power purchase agreements backstopped by FGN" },
      { valueChainLinkId: vcMap["tx"]!.id, name: "Grid Code", citation: "TCN Grid Code 2014 (revised 2023)", description: "Technical standards for grid connection and operation" },
      { valueChainLinkId: vcMap["dist"]!.id, name: "Distribution Licence", citation: "NERC Distribution Licences", description: "Exclusive distribution licences per DisCo" },
      { valueChainLinkId: vcMap["customer"]!.id, name: "Customer Protection Regulations 2023", citation: "CPR 2023", description: "NERC CPR specifying SLA windows and complaint escalation" },
    ],
  });

  await prisma.escalationStep.createMany({
    data: [
      { valueChainLinkId: vcMap["gas"]!.id, stepOrder: 1, who: "MD/CEO, NGIC", whatRole: "Gas pipeline operator" },
      { valueChainLinkId: vcMap["gas"]!.id, stepOrder: 2, who: "EVP, NMDPRA", whatRole: "Regulator" },
      { valueChainLinkId: vcMap["gas"]!.id, stepOrder: 3, who: "Hon. Minister of Petroleum Resources", whatRole: "Policy authority" },
      { valueChainLinkId: vcMap["gas"]!.id, stepOrder: 4, who: "Hon. Minister of Power", whatRole: "Sector coordination" },
      { valueChainLinkId: vcMap["gen"]!.id, stepOrder: 1, who: "Plant CEO/MD", whatRole: "Plant operator" },
      { valueChainLinkId: vcMap["gen"]!.id, stepOrder: 2, who: "Chairman, NERC", whatRole: "Regulator" },
      { valueChainLinkId: vcMap["gen"]!.id, stepOrder: 3, who: "Hon. Minister of Power", whatRole: "Ministerial authority" },
      { valueChainLinkId: vcMap["dist"]!.id, stepOrder: 1, who: "DisCo CCU Manager", whatRole: "First-line complaint resolution" },
      { valueChainLinkId: vcMap["dist"]!.id, stepOrder: 2, who: "MD/CEO of DisCo", whatRole: "DisCo executive authority" },
      { valueChainLinkId: vcMap["dist"]!.id, stepOrder: 3, who: "Director, Consumer Affairs, NERC", whatRole: "Regulatory intervention" },
      { valueChainLinkId: vcMap["dist"]!.id, stepOrder: 4, who: "Chairman, NERC", whatRole: "Regulatory enforcement" },
      { valueChainLinkId: vcMap["dist"]!.id, stepOrder: 5, who: "Hon. Minister of Power", whatRole: "Ministerial directive" },
    ],
  });

  console.log("  → Value chain, stakeholders, instruments, escalation steps created");

  // ESCALATION RULES
  await prisma.escalationRule.createMany({
    data: [
      { name: "Estimated Billing >72h at Level 1 → Level 2", condition: { category: "ESTIMATED_BILLING", ageHours: 72, currentLevel: 1 }, actionLevel: 2, notifyRole: "DISCO_AGENT", isActive: true, priority: 1 },
      { name: "Electrocution → Instant Level 3 (NERC)", condition: { category: "ELECTROCUTION", ageHours: 0, currentLevel: 1 }, actionLevel: 3, notifyOrgId: nercOrg!.id, notifyRole: "NERC_VIEWER", isActive: true, priority: 1 },
      { name: "Kaduna DisCo >48h at any Level → Escalate +1", condition: { discoId: discos[7]!.id, ageHours: 48, currentLevel: 1 }, actionLevel: 2, notifyRole: "MINISTRY_STAFF", isActive: true, priority: 2 },
      { name: "Satisfaction Score <2 → Reopen + Escalate", condition: { satisfactionScore: { lt: 2 }, currentLevel: 1 }, actionLevel: 2, isActive: true, priority: 2 },
      { name: "Supply Interruption >24h at Level 1 → Level 2", condition: { category: "SUPPLY_INTERRUPTION", ageHours: 24, currentLevel: 1 }, actionLevel: 2, isActive: true, priority: 2 },
      { name: "Metering >5 Working Days (40h) at Level 2 → Level 3", condition: { category: "METERING", ageHours: 40, currentLevel: 2 }, actionLevel: 3, notifyOrgId: nercOrg!.id, isActive: true, priority: 3 },
      { name: "Level 4 >72h → Ministerial", condition: { ageHours: 72, currentLevel: 4 }, actionLevel: 5, notifyRole: "MINISTER", isActive: true, priority: 4 },
      { name: "Infrastructure Damage >48h at Level 1 → Level 2", condition: { category: "INFRASTRUCTURE_DAMAGE", ageHours: 48, currentLevel: 1 }, actionLevel: 2, isActive: true, priority: 3 },
    ],
  });

  console.log("  → Escalation rules seeded");

  // COMPLAINTS — 250 realistic across all DisCos
  const categories = ["ESTIMATED_BILLING","ESTIMATED_BILLING","ESTIMATED_BILLING","SUPPLY_INTERRUPTION","SUPPLY_INTERRUPTION","METERING","METERING","BILLING","VOLTAGE","ELECTROCUTION","INFRASTRUCTURE_DAMAGE","CONNECTION_DELAY","DISCONNECTION","REFUND","OTHER"] as const;
  const statuses = ["FILED","IN_REVIEW","IN_PROGRESS","ESCALATED","RESOLVED","RESOLVED","RESOLVED","CLOSED"] as const;
  const severities = ["CRITICAL","HIGH","MEDIUM","MEDIUM","MEDIUM","LOW","LOW"] as const;

  const citizenNames = ["Chukwuemeka Obi","Fatima Abdullahi","Oluwaseun Adeyemi","Ngozi Okonkwo","Ibrahim Musa","Amaka Ezeh","Yusuf Aliyu","Chidinma Eze","Bello Garba","Adaeze Nwosu","Musa Suleiman","Onyeka Igwe","Halima Umar","Emeka Nwachukwu","Kemi Adesanya","Lawal Isa","Blessing Okafor","Rabiu Abdulkadir","Chisom Obiora","Abubakar Tanko"];

  const discoWeightedSelection = [0,0,0,0,0,1,1,1,1,1,1,2,2,2,3,3,3,3,4,4,5,5,5,6,6,6,6,6,7,7,7,7,8,8,9,9,9,10,10,10];

  const nigerianLocations = ["Agege, Lagos","Victoria Island, Lagos","Kuje, Abuja","Maitama, Abuja","New GRA, Port Harcourt","D-Line, Port Harcourt","Bodija, Ibadan","Challenge, Ibadan","Barnawa, Kaduna","Sabon Tasha, Kaduna","Onitsha Main Market, Anambra","Nnewi, Anambra","Diobu, Port Harcourt","Rumuola, Rivers","Tudun Wada, Jos","Bukuru, Jos","Wuse 2, Abuja","Garki, Abuja","Isale Eko, Lagos","Surulere, Lagos"];

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  for (let i = 0; i < 250; i++) {
    const discoIdx = discoWeightedSelection[i % discoWeightedSelection.length]!;
    const disco = discos[discoIdx]!;
    const category = categories[i % categories.length]!;
    const status = statuses[i % statuses.length]!;
    const severity = category === "ELECTROCUTION" ? "CRITICAL" : severities[i % severities.length]!;
    const daysAgo = Math.floor(Math.random() * 90);
    const createdAt = new Date(ninetyDaysAgo.getTime() + (90 - daysAgo) * 24 * 60 * 60 * 1000);
    const citizenName = citizenNames[i % citizenNames.length]!;
    const location = nigerianLocations[i % nigerianLocations.length]!;
    const phone = `0${(8000000000 + i * 7).toString().substring(0, 10)}`;

    const escalationLevel = status === "ESCALATED" ? Math.min(5, 2 + (i % 3)) :
                           status === "RESOLVED" ? 1 :
                           i % 30 === 0 ? 5 : 1;

    const slaBreached = daysAgo > 30 && status !== "RESOLVED";

    const ticket = `WR-${createdAt.getFullYear()}${String(createdAt.getMonth()+1).padStart(2,"0")}${String(createdAt.getDate()).padStart(2,"0")}-${String(100000 + i).padStart(6,"0")}`;
    const satisfactionToken = randomBytes(32).toString("hex");

    const complaint = await prisma.complaint.create({
      data: {
        ticketNumber: ticket,
        source: "WEB",
        citizenName,
        citizenPhone: phone,
        citizenEmail: `${citizenName.toLowerCase().replace(/\s/g, ".")}${i}@example.ng`,
        discoId: disco.id,
        category,
        description: `${category === "ESTIMATED_BILLING" ? "I have been receiving estimated bills for over 3 months without meter reading." : category === "SUPPLY_INTERRUPTION" ? "There has been no power supply for several days in my area." : category === "METERING" ? "My prepaid meter is not dispensing correct units." : "I need urgent assistance with my electricity issue."} Location: ${location}. Account: ${uid()}`,
        status,
        severity,
        escalationLevel,
        slaBreached,
        slaBreachAt: slaBreached ? new Date(createdAt.getTime() + 24 * 60 * 60 * 1000) : null,
        location,
        satisfactionToken,
        satisfactionScore: status === "RESOLVED" ? Math.floor(Math.random() * 5) + 1 : null,
        resolvedAt: status === "RESOLVED" ? new Date(createdAt.getTime() + (2 + Math.random() * 10) * 24 * 60 * 60 * 1000) : null,
        resolutionText: status === "RESOLVED" ? "Issue has been investigated and resolved by the DisCo technical team." : null,
        createdAt,
        updatedAt: createdAt,
      },
    });

    // Create initial event
    await prisma.complaintEvent.create({
      data: { complaintId: complaint.id, eventType: "CREATED", notes: `Complaint filed via WEB`, createdAt },
    });

    // Add status change events for non-filed complaints
    if (status !== "FILED") {
      await prisma.complaintEvent.create({
        data: { complaintId: complaint.id, eventType: "STATUS_CHANGE", fromValue: "FILED", toValue: "IN_REVIEW", createdAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000) },
      });
    }
    if (status === "RESOLVED") {
      await prisma.complaintEvent.create({
        data: { complaintId: complaint.id, eventType: "RESOLVED", notes: "Resolved by DisCo technical team", createdAt: complaint.resolvedAt! },
      });
    }
    if (status === "ESCALATED" || escalationLevel > 1) {
      await prisma.complaintEvent.create({
        data: { complaintId: complaint.id, eventType: "ESCALATED", fromValue: "1", toValue: String(escalationLevel), notes: "Escalated due to SLA breach", createdAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000) },
      });
    }
    if (slaBreached) {
      await prisma.complaintEvent.create({
        data: { complaintId: complaint.id, eventType: "SLA_BREACHED", notes: "SLA window exceeded", createdAt: new Date(createdAt.getTime() + 25 * 60 * 60 * 1000) },
      });
    }
  }

  console.log("  → 250 complaints seeded");

  // SYSTEM SETTINGS
  await prisma.systemSetting.createMany({
    data: [
      { key: "classification_banner", value: "RESTRICTED — Minister's War Room" },
      { key: "complaints_panel_note", value: "Per NERC's Q1 2025 Quarterly Report, DisCos resolved only 1,554 of 4,169 NERC-CCU complaints (37.27% resolution rate). Forum Offices achieved 74.10%. The most common categories are metering, billing, and supply interruption. Estimated billing remains the highest-political-risk category." },
      { key: "sla_metering_hours", value: "40" },
      { key: "sla_billing_hours", value: "120" },
      { key: "sla_supply_interruption_hours", value: "24" },
      { key: "sla_electrocution_hours", value: "0" },
    ],
  });

  console.log("✅ Seed complete!");
  console.log("   Admin login: admin@warroom.gov.ng / Admin@WarRoom2025!");
  console.log("   Minister: minister@power.gov.ng / Staff@Ministry2025");
  console.log("   Staff: staff@power.gov.ng / Staff@Ministry2025");
  console.log("   NERC Viewer: analyst@nerc.gov.ng / Staff@Ministry2025");
  console.log("   Eko DisCo Agent: agent@ekedc.com.ng / Agent@DisCo2025");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
