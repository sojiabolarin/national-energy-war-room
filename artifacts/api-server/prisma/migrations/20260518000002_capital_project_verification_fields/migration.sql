-- Sprint 3: extend CapitalProject with the verification fields used by
-- the TCN TREP import (and matching the columns added to Substation in
-- migration 20260518000000).

ALTER TABLE "CapitalProject"
  ADD COLUMN "source"     TEXT,
  ADD COLUMN "dataClass"  TEXT,
  ADD COLUMN "verifiedAt" TIMESTAMP(3);

CREATE INDEX "CapitalProject_dataClass_idx" ON "CapitalProject"("dataClass");
