-- Add guide sections and persisted ordering for team guide lists.
CREATE TABLE "GuideSection" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuideSection_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Guide" ADD COLUMN "sectionId" TEXT;
ALTER TABLE "Guide" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "GuideSection_teamId_sortOrder_idx" ON "GuideSection"("teamId", "sortOrder");
CREATE INDEX "Guide_teamId_sectionId_sortOrder_idx" ON "Guide"("teamId", "sectionId", "sortOrder");
CREATE INDEX "Guide_sectionId_idx" ON "Guide"("sectionId");

ALTER TABLE "GuideSection"
ADD CONSTRAINT "GuideSection_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Guide"
ADD CONSTRAINT "Guide_sectionId_fkey"
FOREIGN KEY ("sectionId") REFERENCES "GuideSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
