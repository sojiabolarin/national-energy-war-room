-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MINISTER', 'MINISTRY_STAFF', 'NERC_VIEWER', 'DISCO_AGENT', 'CITIZEN', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('GENCO', 'DISCO', 'TCN', 'NBET', 'NERC', 'NMDPRA', 'NGIC', 'REA', 'FMP', 'FGN_POWER_CO', 'NDPHC', 'OTHER');

-- CreateEnum
CREATE TYPE "PlantType" AS ENUM ('GAS_OCGT', 'GAS_CCGT', 'GAS_STEAM', 'HYDRO', 'SOLAR', 'WIND', 'COAL', 'IPP', 'NIPP');

-- CreateEnum
CREATE TYPE "PlantStatus" AS ENUM ('OPERATING', 'PARTIAL', 'MAINTENANCE', 'OUT', 'CONSTRAINED');

-- CreateEnum
CREATE TYPE "VoltageKv" AS ENUM ('KV_330', 'KV_132');

-- CreateEnum
CREATE TYPE "LineStatus" AS ENUM ('ACTIVE', 'OUT', 'MAINTENANCE', 'CONSTRAINED');

-- CreateEnum
CREATE TYPE "BadgeStatus" AS ENUM ('GOOD', 'WARN', 'BAD');

-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('OPERATIONAL', 'CONSTRUCTION', 'PROPOSED');

-- CreateEnum
CREATE TYPE "ProjectCategory" AS ENUM ('GENERATION', 'TRANSMISSION', 'GAS_INFRA', 'DRE', 'DISTRIBUTION', 'OTHER');

-- CreateEnum
CREATE TYPE "MiniGridProgramme" AS ENUM ('NEP', 'DARES', 'EEP', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PARTIAL', 'UNPAID', 'DEFAULT');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'INFO');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ComplaintSource" AS ENUM ('WEB', 'WHATSAPP', 'NERC_PORTAL', 'FORUM_OFFICE', 'IN_PERSON', 'EMAIL', 'IMPORT');

-- CreateEnum
CREATE TYPE "ComplaintCategory" AS ENUM ('METERING', 'BILLING', 'ESTIMATED_BILLING', 'SUPPLY_INTERRUPTION', 'VOLTAGE', 'ELECTROCUTION', 'INFRASTRUCTURE_DAMAGE', 'CONNECTION_DELAY', 'DISCONNECTION', 'REFUND', 'ENERGY_THEFT_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('FILED', 'IN_REVIEW', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ComplaintSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ComplaintEventType" AS ENUM ('CREATED', 'STATUS_CHANGE', 'ASSIGNED', 'ESCALATED', 'NOTE_ADDED', 'ATTACHMENT_ADDED', 'SLA_BREACHED', 'RESOLVED', 'REOPENED', 'CITIZEN_RESPONDED');

-- CreateEnum
CREATE TYPE "StakeholderRole" AS ENUM ('OPERATOR', 'REGULATOR', 'COUNTERPART', 'FUNDING_PARTNER', 'AUTHORITY');

-- CreateEnum
CREATE TYPE "ValueChainStatus" AS ENUM ('G', 'A', 'R');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CITIZEN',
    "fullName" TEXT NOT NULL,
    "organisationId" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrgType" NOT NULL,
    "parentId" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PlantType" NOT NULL,
    "installedMw" DECIMAL(10,2) NOT NULL,
    "availableMw" DECIMAL(10,2) NOT NULL,
    "actualMw" DECIMAL(10,2) NOT NULL,
    "state" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "status" "PlantStatus" NOT NULL DEFAULT 'OPERATING',
    "gencoOrgId" TEXT,
    "commissioningDate" TIMESTAMP(3),
    "paf" DECIMAL(5,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Plant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantUnit" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "capacityMw" DECIMAL(10,2) NOT NULL,
    "currentOutputMw" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL,
    "fuelStatus" TEXT,
    "lastTripAt" TIMESTAMP(3),
    "lastTripCause" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PlantUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Substation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "voltageClass" TEXT NOT NULL,
    "capacityMva" DECIMAL(10,2) NOT NULL,
    "transformerConfig" TEXT,
    "circuitCount" INTEGER,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "state" TEXT,
    "ownerOrgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Substation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransmissionLine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "voltageKv" INTEGER NOT NULL,
    "lengthKm" DECIMAL(10,2),
    "capacityMva" DECIMAL(10,2),
    "fromSubstationId" TEXT,
    "toSubstationId" TEXT,
    "status" "LineStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentLoadingPct" DECIMAL(5,2),
    "lossesPct" DECIMAL(5,2),
    "notes" TEXT,
    "geometry" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TransmissionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisCo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "licenceNumber" TEXT,
    "allocationPct" DECIMAL(5,2),
    "operatorOrgId" TEXT,
    "registeredOffice" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "atccLossPct" DECIMAL(5,2),
    "collectionEffPct" DECIMAL(5,2),
    "billingEffPct" DECIMAL(5,2),
    "meteringRatePct" DECIMAL(5,2),
    "hoursOfSupplyDaily" DECIMAL(4,1),
    "complaintsLastQuarter" INTEGER,
    "rank" INTEGER,
    "badge" "BadgeStatus" NOT NULL DEFAULT 'WARN',
    "enforcementStatus" TEXT,
    "mytoTargetAtcc" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DisCo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feeder" (
    "id" TEXT NOT NULL,
    "discoId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "voltage" TEXT,
    "customerCount" INTEGER,
    "supplyHours" DECIMAL(4,1),
    "energyBilledMm" DECIMAL(12,2),
    "atccLossPct" DECIMAL(5,2),
    "profile" TEXT,
    "securityRisk" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Feeder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GasPipeline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" TEXT,
    "capacityMmscfd" DECIMAL(10,2),
    "operator" TEXT,
    "status" "PipelineStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "geometry" JSONB,
    "routeCoordinates" JSONB,
    "notes" TEXT,
    "fromPoint" TEXT,
    "toPoint" TEXT,
    "lengthKm" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GasPipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiversionOpportunity" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "tapPoint" TEXT NOT NULL,
    "tapLatitude" DECIMAL(10,7),
    "tapLongitude" DECIMAL(10,7),
    "lengthKm" DECIMAL(10,2),
    "capacityRequired" DECIMAL(10,2),
    "indicativeCapex" DECIMAL(15,2),
    "note" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DiversionOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapitalProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ProjectCategory" NOT NULL,
    "status" TEXT NOT NULL,
    "sponsorOrgId" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "timeline" TEXT,
    "capexUsd" DECIMAL(15,2),
    "completionPct" DECIMAL(5,2),
    "funder" TEXT,
    "contractorOrEpc" TEXT,
    "notes" TEXT,
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CapitalProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiniGrid" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacityKw" DECIMAL(10,2) NOT NULL,
    "beneficiaries" INTEGER,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "state" TEXT,
    "lga" TEXT,
    "operatorOrgId" TEXT,
    "programme" "MiniGridProgramme" NOT NULL DEFAULT 'NEP',
    "status" TEXT NOT NULL DEFAULT 'OPERATIONAL',
    "completionYear" INTEGER,
    "funder" TEXT,
    "operatorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MiniGrid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementInvoice" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "discoId" TEXT NOT NULL,
    "mooInvoiceNgn" DECIMAL(18,2),
    "nbetInvoiceNgn" DECIMAL(18,2),
    "drogAdjustedNgn" DECIMAL(18,2),
    "remittedNgn" DECIMAL(18,2),
    "remittancePct" DECIMAL(5,2),
    "cumulativeDebtNgn" DECIMAL(18,2),
    "enforcementStatus" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SettlementInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GencoAllocation" (
    "id" TEXT NOT NULL,
    "settlementInvoiceId" TEXT NOT NULL,
    "gencoOrgId" TEXT NOT NULL,
    "plantId" TEXT,
    "shareNgn" DECIMAL(18,2),
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GencoAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GridMetric" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "frequencyHz" DECIMAL(6,3) NOT NULL,
    "upperVoltageKv" DECIMAL(6,2),
    "lowerVoltageKv" DECIMAL(6,2),
    "sentOutMwh" DECIMAL(10,2),
    "demandMwh" DECIMAL(10,2),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GridMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sourceEntity" TEXT,
    "sourceEntityId" TEXT,
    "actionRequired" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "source" "ComplaintSource" NOT NULL DEFAULT 'WEB',
    "citizenName" TEXT NOT NULL,
    "citizenPhone" TEXT NOT NULL,
    "citizenEmail" TEXT,
    "citizenNinEncrypted" TEXT,
    "discoId" TEXT NOT NULL,
    "feederId" TEXT,
    "category" "ComplaintCategory" NOT NULL,
    "subCategory" TEXT,
    "description" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'FILED',
    "severity" "ComplaintSeverity" NOT NULL DEFAULT 'MEDIUM',
    "escalationLevel" INTEGER NOT NULL DEFAULT 1,
    "slaBreached" BOOLEAN NOT NULL DEFAULT false,
    "slaBreachAt" TIMESTAMP(3),
    "location" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "attachments" JSONB,
    "satisfactionScore" INTEGER,
    "satisfactionFeedback" TEXT,
    "satisfactionToken" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionText" TEXT,
    "assignedToUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintEvent" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "eventType" "ComplaintEventType" NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "actorUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintAssignment" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "assignedToUserId" TEXT NOT NULL,
    "assignedFromUserId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "ComplaintAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalationRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "condition" JSONB NOT NULL,
    "actionLevel" INTEGER NOT NULL,
    "notifyOrgId" TEXT,
    "notifyRole" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EscalationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValueChainLink" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ValueChainStatus" NOT NULL DEFAULT 'G',
    "meta" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ValueChainLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stakeholder" (
    "id" TEXT NOT NULL,
    "valueChainLinkId" TEXT NOT NULL,
    "role" "StakeholderRole" NOT NULL,
    "title" TEXT NOT NULL,
    "organisationId" TEXT,
    "description" TEXT,
    "escalationOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Stakeholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorityInstrument" (
    "id" TEXT NOT NULL,
    "valueChainLinkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "citation" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorityInstrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalationStep" (
    "id" TEXT NOT NULL,
    "valueChainLinkId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "who" TEXT NOT NULL,
    "whatRole" TEXT,
    "instrument" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscalationStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "payload" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumOffice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "statesCovered" JSONB,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumOffice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NemsaFieldOffice" (
    "id" TEXT NOT NULL,
    "zoneName" TEXT NOT NULL,
    "statesCovered" JSONB,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NemsaFieldOffice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TcnRegion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headquarters" TEXT,
    "coverageStates" JSONB,
    "contactNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TcnRegion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TcnControlCentre" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "address" TEXT,
    "coverageStates" JSONB,
    "contactNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TcnControlCentre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReaZonalOffice" (
    "id" TEXT NOT NULL,
    "zoneName" TEXT NOT NULL,
    "headquarters" TEXT,
    "statesCovered" JSONB,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReaZonalOffice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoCustomerCareChannel" (
    "id" TEXT NOT NULL,
    "discoId" TEXT,
    "discoShortName" TEXT NOT NULL,
    "channels" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscoCustomerCareChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlossaryTerm" (
    "id" TEXT NOT NULL,
    "acronym" TEXT NOT NULL,
    "expansion" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlossaryTerm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_organisationId_idx" ON "User"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "Organisation_type_idx" ON "Organisation"("type");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Plant_status_idx" ON "Plant"("status");

-- CreateIndex
CREATE INDEX "Plant_type_idx" ON "Plant"("type");

-- CreateIndex
CREATE INDEX "Plant_gencoOrgId_idx" ON "Plant"("gencoOrgId");

-- CreateIndex
CREATE INDEX "PlantUnit_plantId_idx" ON "PlantUnit"("plantId");

-- CreateIndex
CREATE INDEX "Substation_ownerOrgId_idx" ON "Substation"("ownerOrgId");

-- CreateIndex
CREATE INDEX "TransmissionLine_status_idx" ON "TransmissionLine"("status");

-- CreateIndex
CREATE INDEX "TransmissionLine_voltageKv_idx" ON "TransmissionLine"("voltageKv");

-- CreateIndex
CREATE UNIQUE INDEX "DisCo_name_key" ON "DisCo"("name");

-- CreateIndex
CREATE INDEX "DisCo_badge_idx" ON "DisCo"("badge");

-- CreateIndex
CREATE INDEX "Feeder_discoId_idx" ON "Feeder"("discoId");

-- CreateIndex
CREATE INDEX "GasPipeline_status_idx" ON "GasPipeline"("status");

-- CreateIndex
CREATE INDEX "DiversionOpportunity_plantId_idx" ON "DiversionOpportunity"("plantId");

-- CreateIndex
CREATE INDEX "CapitalProject_category_idx" ON "CapitalProject"("category");

-- CreateIndex
CREATE INDEX "CapitalProject_status_idx" ON "CapitalProject"("status");

-- CreateIndex
CREATE INDEX "MiniGrid_programme_idx" ON "MiniGrid"("programme");

-- CreateIndex
CREATE INDEX "SettlementInvoice_period_idx" ON "SettlementInvoice"("period");

-- CreateIndex
CREATE INDEX "SettlementInvoice_discoId_idx" ON "SettlementInvoice"("discoId");

-- CreateIndex
CREATE INDEX "GencoAllocation_settlementInvoiceId_idx" ON "GencoAllocation"("settlementInvoiceId");

-- CreateIndex
CREATE INDEX "GencoAllocation_gencoOrgId_idx" ON "GencoAllocation"("gencoOrgId");

-- CreateIndex
CREATE INDEX "GridMetric_timestamp_idx" ON "GridMetric"("timestamp");

-- CreateIndex
CREATE INDEX "Alert_status_idx" ON "Alert"("status");

-- CreateIndex
CREATE INDEX "Alert_severity_idx" ON "Alert"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_ticketNumber_key" ON "Complaint"("ticketNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_satisfactionToken_key" ON "Complaint"("satisfactionToken");

-- CreateIndex
CREATE INDEX "Complaint_ticketNumber_idx" ON "Complaint"("ticketNumber");

-- CreateIndex
CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");

-- CreateIndex
CREATE INDEX "Complaint_discoId_idx" ON "Complaint"("discoId");

-- CreateIndex
CREATE INDEX "Complaint_category_idx" ON "Complaint"("category");

-- CreateIndex
CREATE INDEX "Complaint_escalationLevel_idx" ON "Complaint"("escalationLevel");

-- CreateIndex
CREATE INDEX "Complaint_slaBreached_idx" ON "Complaint"("slaBreached");

-- CreateIndex
CREATE INDEX "Complaint_createdAt_idx" ON "Complaint"("createdAt");

-- CreateIndex
CREATE INDEX "Complaint_satisfactionToken_idx" ON "Complaint"("satisfactionToken");

-- CreateIndex
CREATE INDEX "ComplaintEvent_complaintId_idx" ON "ComplaintEvent"("complaintId");

-- CreateIndex
CREATE INDEX "ComplaintEvent_createdAt_idx" ON "ComplaintEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ComplaintAssignment_complaintId_idx" ON "ComplaintAssignment"("complaintId");

-- CreateIndex
CREATE INDEX "ComplaintAssignment_assignedToUserId_idx" ON "ComplaintAssignment"("assignedToUserId");

-- CreateIndex
CREATE INDEX "EscalationRule_isActive_idx" ON "EscalationRule"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ValueChainLink_key_key" ON "ValueChainLink"("key");

-- CreateIndex
CREATE INDEX "ValueChainLink_order_idx" ON "ValueChainLink"("order");

-- CreateIndex
CREATE INDEX "Stakeholder_valueChainLinkId_idx" ON "Stakeholder"("valueChainLinkId");

-- CreateIndex
CREATE INDEX "AuthorityInstrument_valueChainLinkId_idx" ON "AuthorityInstrument"("valueChainLinkId");

-- CreateIndex
CREATE INDEX "EscalationStep_valueChainLinkId_idx" ON "EscalationStep"("valueChainLinkId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_readAt_idx" ON "Notification"("readAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "GlossaryTerm_acronym_key" ON "GlossaryTerm"("acronym");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organisation" ADD CONSTRAINT "Organisation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_gencoOrgId_fkey" FOREIGN KEY ("gencoOrgId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantUnit" ADD CONSTRAINT "PlantUnit_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Substation" ADD CONSTRAINT "Substation_ownerOrgId_fkey" FOREIGN KEY ("ownerOrgId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransmissionLine" ADD CONSTRAINT "TransmissionLine_fromSubstationId_fkey" FOREIGN KEY ("fromSubstationId") REFERENCES "Substation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransmissionLine" ADD CONSTRAINT "TransmissionLine_toSubstationId_fkey" FOREIGN KEY ("toSubstationId") REFERENCES "Substation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisCo" ADD CONSTRAINT "DisCo_operatorOrgId_fkey" FOREIGN KEY ("operatorOrgId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feeder" ADD CONSTRAINT "Feeder_discoId_fkey" FOREIGN KEY ("discoId") REFERENCES "DisCo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiversionOpportunity" ADD CONSTRAINT "DiversionOpportunity_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapitalProject" ADD CONSTRAINT "CapitalProject_sponsorOrgId_fkey" FOREIGN KEY ("sponsorOrgId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiniGrid" ADD CONSTRAINT "MiniGrid_operatorOrgId_fkey" FOREIGN KEY ("operatorOrgId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementInvoice" ADD CONSTRAINT "SettlementInvoice_discoId_fkey" FOREIGN KEY ("discoId") REFERENCES "DisCo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GencoAllocation" ADD CONSTRAINT "GencoAllocation_settlementInvoiceId_fkey" FOREIGN KEY ("settlementInvoiceId") REFERENCES "SettlementInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GencoAllocation" ADD CONSTRAINT "GencoAllocation_gencoOrgId_fkey" FOREIGN KEY ("gencoOrgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GencoAllocation" ADD CONSTRAINT "GencoAllocation_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_discoId_fkey" FOREIGN KEY ("discoId") REFERENCES "DisCo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_feederId_fkey" FOREIGN KEY ("feederId") REFERENCES "Feeder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintEvent" ADD CONSTRAINT "ComplaintEvent_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintEvent" ADD CONSTRAINT "ComplaintEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintAssignment" ADD CONSTRAINT "ComplaintAssignment_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintAssignment" ADD CONSTRAINT "ComplaintAssignment_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stakeholder" ADD CONSTRAINT "Stakeholder_valueChainLinkId_fkey" FOREIGN KEY ("valueChainLinkId") REFERENCES "ValueChainLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stakeholder" ADD CONSTRAINT "Stakeholder_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorityInstrument" ADD CONSTRAINT "AuthorityInstrument_valueChainLinkId_fkey" FOREIGN KEY ("valueChainLinkId") REFERENCES "ValueChainLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationStep" ADD CONSTRAINT "EscalationStep_valueChainLinkId_fkey" FOREIGN KEY ("valueChainLinkId") REFERENCES "ValueChainLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoCustomerCareChannel" ADD CONSTRAINT "DiscoCustomerCareChannel_discoId_fkey" FOREIGN KEY ("discoId") REFERENCES "DisCo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
