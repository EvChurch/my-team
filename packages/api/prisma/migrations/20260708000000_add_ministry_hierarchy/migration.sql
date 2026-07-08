-- CreateEnum
CREATE TYPE "TeamKind" AS ENUM ('CHURCH', 'PURPOSE', 'CAMPUS', 'AREA', 'SERVING_TEAM');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN "parentTeamId" TEXT;
ALTER TABLE "Team" ADD COLUMN "kind" "TeamKind" NOT NULL DEFAULT 'SERVING_TEAM';
ALTER TABLE "Team" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Team" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "TeamSource" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "remoteId" TEXT NOT NULL,
    "parentRemoteId" TEXT,
    "sourceGroupTypeId" INTEGER,
    "sourceName" TEXT NOT NULL,
    "sourceSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinistryAdmin" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MinistryAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Team_kind_idx" ON "Team"("kind");
CREATE INDEX "Team_parentTeamId_idx" ON "Team"("parentTeamId");
CREATE INDEX "Team_isActive_idx" ON "Team"("isActive");
CREATE UNIQUE INDEX "TeamSource_provider_remoteId_key" ON "TeamSource"("provider", "remoteId");
CREATE INDEX "TeamSource_teamId_idx" ON "TeamSource"("teamId");
CREATE INDEX "TeamSource_parentRemoteId_idx" ON "TeamSource"("parentRemoteId");
CREATE INDEX "TeamSource_sourceGroupTypeId_idx" ON "TeamSource"("sourceGroupTypeId");
CREATE UNIQUE INDEX "MinistryAdmin_profileId_key" ON "MinistryAdmin"("profileId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_parentTeamId_fkey" FOREIGN KEY ("parentTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeamSource" ADD CONSTRAINT "TeamSource_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MinistryAdmin" ADD CONSTRAINT "MinistryAdmin_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
