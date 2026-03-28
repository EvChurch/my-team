-- CreateTable
CREATE TABLE "PlanTime" (
    "id" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "name" TEXT,
    "timeType" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanTime_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanTime_scheduleId_idx" ON "PlanTime"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanTime_remoteId_provider_scheduleId_key" ON "PlanTime"("remoteId", "provider", "scheduleId");

-- AddForeignKey
ALTER TABLE "PlanTime" ADD CONSTRAINT "PlanTime_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
