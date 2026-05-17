-- Seed completion sprint: bundled migration adding the columns the seed completion
-- scripts need so they can write polygon, geometry, and synthetic-data flags.

-- DisCo: territory polygon (GeoJSON Polygon) + quality flag for the choropleth heat layer
ALTER TABLE "DisCo"
  ADD COLUMN "territoryGeom" JSONB,
  ADD COLUMN "geomQuality"   TEXT;

-- ForumOffice / NemsaFieldOffice: coordinates for the Stakeholder Locations layer
ALTER TABLE "ForumOffice"
  ADD COLUMN "latitude"  DECIMAL(10, 7),
  ADD COLUMN "longitude" DECIMAL(10, 7);

ALTER TABLE "NemsaFieldOffice"
  ADD COLUMN "latitude"  DECIMAL(10, 7),
  ADD COLUMN "longitude" DECIMAL(10, 7);

-- MiniGrid: synthetic-data flagging
ALTER TABLE "MiniGrid"
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "dataClass"  TEXT;

-- DiversionOpportunity: routed LineString from tap point to plant
ALTER TABLE "DiversionOpportunity"
  ADD COLUMN "geometry" JSONB;

-- CapitalProject: explicit GeoJSON point geometry (lat/lng remain authoritative)
ALTER TABLE "CapitalProject"
  ADD COLUMN "geometry" JSONB;
