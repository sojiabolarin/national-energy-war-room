-- AlterTable
ALTER TABLE "CapitalProject" ADD COLUMN     "dataSource" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "lowConfidence" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceAuthorityScore" INTEGER;

-- AlterTable
ALTER TABLE "ForumOffice" ADD COLUMN     "dataSource" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "lowConfidence" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceAuthorityScore" INTEGER,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "GasPipeline" ADD COLUMN     "dataSource" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "lowConfidence" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceAuthorityScore" INTEGER;

-- AlterTable
ALTER TABLE "GlossaryTerm" ADD COLUMN     "dataSource" TEXT,
ADD COLUMN     "lowConfidence" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceAuthorityScore" INTEGER;

-- AlterTable
ALTER TABLE "MiniGrid" ADD COLUMN     "dataSource" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "lowConfidence" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceAuthorityScore" INTEGER;

-- AlterTable
ALTER TABLE "NemsaFieldOffice" ADD COLUMN     "dataSource" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "lowConfidence" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceAuthorityScore" INTEGER,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Organisation" ADD COLUMN     "dataSource" TEXT,
ADD COLUMN     "establishedYear" INTEGER,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "legalBasis" TEXT,
ADD COLUMN     "lowConfidence" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mandate" TEXT,
ADD COLUMN     "mission" TEXT,
ADD COLUMN     "shortName" TEXT,
ADD COLUMN     "sourceAuthorityScore" INTEGER,
ADD COLUMN     "vision" TEXT;

-- AlterTable
ALTER TABLE "Plant" ADD COLUMN     "constraintReason" TEXT,
ADD COLUMN     "dataSource" TEXT,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "gencoType" TEXT,
ADD COLUMN     "lga" TEXT,
ADD COLUMN     "lowConfidence" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceAuthorityScore" INTEGER;

-- AlterTable
ALTER TABLE "ReaZonalOffice" ADD COLUMN     "dataSource" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "lowConfidence" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceAuthorityScore" INTEGER;

-- AlterTable
ALTER TABLE "Substation" ADD COLUMN     "dataSource" TEXT,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "lowConfidence" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceAuthorityScore" INTEGER;

-- AlterTable
ALTER TABLE "TcnControlCentre" ADD COLUMN     "dataSource" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "lowConfidence" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceAuthorityScore" INTEGER;

-- AlterTable
ALTER TABLE "TcnRegion" ADD COLUMN     "dataSource" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "lowConfidence" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceAuthorityScore" INTEGER;

-- CreateTable
CREATE TABLE "TariffOrder" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "orderRef" TEXT NOT NULL,
    "issuingBody" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "state" TEXT,
    "title" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "applicableTo" JSONB NOT NULL,
    "bandStructure" JSONB NOT NULL,
    "subsidyRetained" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "dataSource" TEXT,
    "sourceAuthorityScore" INTEGER,
    "lowConfidence" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TariffOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateRegulator" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "shortName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "establishedYear" INTEGER,
    "legalBasis" TEXT,
    "address" TEXT,
    "website" TEXT,
    "email" TEXT,
    "chairman" TEXT,
    "subDiscoCarveOut" JSONB,
    "firstTariffOrderDate" TIMESTAMP(3),
    "notes" TEXT,
    "dataSource" TEXT,
    "sourceAuthorityScore" INTEGER,
    "lowConfidence" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StateRegulator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchHistory" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "plantName" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "actualMw" DECIMAL(10,2) NOT NULL,
    "availableMw" DECIMAL(10,2) NOT NULL,
    "installedMw" DECIMAL(10,2) NOT NULL,
    "capacityFactor" DECIMAL(5,3) NOT NULL,
    "outageReason" TEXT,
    "dataSource" TEXT,
    "synthetic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispatchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TariffOrder_externalId_key" ON "TariffOrder"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "TariffOrder_orderRef_key" ON "TariffOrder"("orderRef");

-- CreateIndex
CREATE INDEX "TariffOrder_scope_idx" ON "TariffOrder"("scope");

-- CreateIndex
CREATE INDEX "TariffOrder_issuingBody_idx" ON "TariffOrder"("issuingBody");

-- CreateIndex
CREATE UNIQUE INDEX "StateRegulator_externalId_key" ON "StateRegulator"("externalId");

-- CreateIndex
CREATE INDEX "StateRegulator_state_idx" ON "StateRegulator"("state");

-- CreateIndex
CREATE INDEX "DispatchHistory_plantId_idx" ON "DispatchHistory"("plantId");

-- CreateIndex
CREATE INDEX "DispatchHistory_date_idx" ON "DispatchHistory"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchHistory_plantId_date_key" ON "DispatchHistory"("plantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CapitalProject_externalId_key" ON "CapitalProject"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ForumOffice_externalId_key" ON "ForumOffice"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "GasPipeline_externalId_key" ON "GasPipeline"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "MiniGrid_externalId_key" ON "MiniGrid"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "NemsaFieldOffice_externalId_key" ON "NemsaFieldOffice"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_externalId_key" ON "Organisation"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Plant_externalId_key" ON "Plant"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ReaZonalOffice_externalId_key" ON "ReaZonalOffice"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Substation_externalId_key" ON "Substation"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "TcnControlCentre_externalId_key" ON "TcnControlCentre"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "TcnRegion_externalId_key" ON "TcnRegion"("externalId");

-- AddForeignKey
ALTER TABLE "DispatchHistory" ADD CONSTRAINT "DispatchHistory_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
