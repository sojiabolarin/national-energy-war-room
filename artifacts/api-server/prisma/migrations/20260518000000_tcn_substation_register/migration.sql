-- TCN data integration: adds verification, geometry, and regional FK fields
-- on Substation so the asset-register import can attribute each record to
-- a TcnRegion, capture geocoding quality, and persist a PostGIS point.

-- Substation: verification metadata + region link
ALTER TABLE "Substation"
  ADD COLUMN "tcnRegionId" TEXT,
  ADD COLUMN "dataClass"   TEXT,
  ADD COLUMN "verifiedAt"  TIMESTAMP(3),
  ADD COLUMN "geomQuality" TEXT,
  ADD COLUMN "source"      TEXT;

ALTER TABLE "Substation"
  ADD CONSTRAINT "Substation_tcnRegionId_fkey"
  FOREIGN KEY ("tcnRegionId") REFERENCES "TcnRegion"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Substation_tcnRegionId_idx" ON "Substation"("tcnRegionId");
CREATE INDEX "Substation_dataClass_idx"  ON "Substation"("dataClass");

-- PostGIS point column. The Prisma client treats this as Unsupported so it
-- is populated via raw SQL in the seed patch (ST_SetSRID(ST_MakePoint(...))).
ALTER TABLE "Substation"
  ADD COLUMN "geom" geometry(Point, 4326);

CREATE INDEX "Substation_geom_gix" ON "Substation" USING GIST ("geom");
