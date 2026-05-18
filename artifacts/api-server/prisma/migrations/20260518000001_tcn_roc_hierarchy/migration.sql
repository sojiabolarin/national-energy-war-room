-- Sprint 2: TCN organisational hierarchy.
--
-- 1. Adds soft-deprecation columns to TcnControlCentre so the obsolete
--    2018-FMP-era RCCs can be retained as historical records.
-- 2. Adds the TcnROC table for the Regional Operations Coordinating Units
--    introduced in TCN's 2024 SO structure.
-- 3. Adds tcnRocId FK on Substation for the ROC backfill.

ALTER TABLE "TcnControlCentre"
  ADD COLUMN "deprecatedAt" TIMESTAMP(3),
  ADD COLUMN "notes"        TEXT,
  ADD COLUMN "latitude"     DECIMAL(10, 7),
  ADD COLUMN "longitude"    DECIMAL(10, 7);

CREATE TABLE "TcnROC" (
  "id"                  TEXT          PRIMARY KEY,
  "externalId"          TEXT          UNIQUE,
  "name"                TEXT          NOT NULL UNIQUE,
  "rccId"               TEXT          NOT NULL,
  "latitude"            DECIMAL(10, 7),
  "longitude"           DECIMAL(10, 7),
  "geom"                geometry(Point, 4326),
  "statesCovered"       JSONB,
  "headquartersAddress" TEXT,
  "notes"               TEXT,
  "source"              TEXT,
  "dataClass"           TEXT,
  "verifiedAt"          TIMESTAMP(3),
  "createdAt"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3)  NOT NULL,
  CONSTRAINT "TcnROC_rccId_fkey"
    FOREIGN KEY ("rccId") REFERENCES "TcnControlCentre"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "TcnROC_rccId_idx" ON "TcnROC"("rccId");
CREATE INDEX "TcnROC_geom_gix"  ON "TcnROC" USING GIST ("geom");

ALTER TABLE "Substation"
  ADD COLUMN "tcnRocId" TEXT;

ALTER TABLE "Substation"
  ADD CONSTRAINT "Substation_tcnRocId_fkey"
  FOREIGN KEY ("tcnRocId") REFERENCES "TcnROC"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Substation_tcnRocId_idx" ON "Substation"("tcnRocId");
