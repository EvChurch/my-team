-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('CONFIRMED', 'UNCONFIRMED', 'DECLINED');

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "personId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "positionName" TEXT,
    "serviceTypeName" TEXT NOT NULL,
    "status" "ScheduleStatus" NOT NULL,
    "sortDate" TIMESTAMP(3) NOT NULL,
    "dates" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "planRemoteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Schedule_personId_idx" ON "Schedule"("personId");

-- CreateIndex
CREATE INDEX "Schedule_teamId_idx" ON "Schedule"("teamId");

-- CreateIndex
CREATE INDEX "Schedule_personId_teamId_idx" ON "Schedule"("personId", "teamId");

-- CreateIndex
CREATE INDEX "Schedule_sortDate_idx" ON "Schedule"("sortDate");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_remoteId_provider_key" ON "Schedule"("remoteId", "provider");

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
