-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('PCO');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('ENCOURAGEMENT', 'GROWTH_AREA', 'GENERAL');

-- CreateEnum
CREATE TYPE "GuideCategory" AS ENUM ('QUICK_START', 'TROUBLESHOOTING', 'SOP');

-- CreateEnum
CREATE TYPE "GuideStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "email" TEXT,
    "fullName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceType" (
    "id" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "name" TEXT NOT NULL,
    "description" JSONB,
    "serviceTypeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT,
    "description" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leader" (
    "id" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "personId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Leader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "personId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "GoalStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "personId" TEXT,
    "teamId" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "FeedbackType" NOT NULL,
    "authorId" TEXT,
    "recipientId" TEXT,
    "teamId" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guide" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "category" "GuideCategory" NOT NULL,
    "status" "GuideStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT,
    "teamId" TEXT NOT NULL,
    "roleId" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isVisibleToTeam" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_remoteId_provider_key" ON "Person"("remoteId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceType_remoteId_provider_key" ON "ServiceType"("remoteId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "Team_remoteId_provider_key" ON "Team"("remoteId", "provider");

-- CreateIndex
CREATE INDEX "Position_teamId_idx" ON "Position"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Position_remoteId_provider_key" ON "Position"("remoteId", "provider");

-- CreateIndex
CREATE INDEX "Leader_teamId_idx" ON "Leader"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Leader_personId_teamId_key" ON "Leader"("personId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Leader_remoteId_provider_key" ON "Leader"("remoteId", "provider");

-- CreateIndex
CREATE INDEX "Assignment_positionId_idx" ON "Assignment"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_personId_positionId_key" ON "Assignment"("personId", "positionId");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_remoteId_provider_key" ON "Assignment"("remoteId", "provider");

-- CreateIndex
CREATE INDEX "Goal_personId_idx" ON "Goal"("personId");

-- CreateIndex
CREATE INDEX "Goal_teamId_idx" ON "Goal"("teamId");

-- CreateIndex
CREATE INDEX "Goal_teamId_status_idx" ON "Goal"("teamId", "status");

-- CreateIndex
CREATE INDEX "Goal_reviewedBy_idx" ON "Goal"("reviewedBy");

-- CreateIndex
CREATE INDEX "Feedback_teamId_idx" ON "Feedback"("teamId");

-- CreateIndex
CREATE INDEX "Feedback_recipientId_idx" ON "Feedback"("recipientId");

-- CreateIndex
CREATE INDEX "Feedback_recipientId_teamId_idx" ON "Feedback"("recipientId", "teamId");

-- CreateIndex
CREATE INDEX "Feedback_authorId_idx" ON "Feedback"("authorId");

-- CreateIndex
CREATE INDEX "Guide_teamId_idx" ON "Guide"("teamId");

-- CreateIndex
CREATE INDEX "Guide_teamId_status_idx" ON "Guide"("teamId", "status");

-- CreateIndex
CREATE INDEX "Guide_teamId_roleId_idx" ON "Guide"("teamId", "roleId");

-- CreateIndex
CREATE INDEX "Guide_roleId_idx" ON "Guide"("roleId");

-- CreateIndex
CREATE INDEX "Guide_authorId_idx" ON "Guide"("authorId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leader" ADD CONSTRAINT "Leader_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leader" ADD CONSTRAINT "Leader_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guide" ADD CONSTRAINT "Guide_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guide" ADD CONSTRAINT "Guide_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guide" ADD CONSTRAINT "Guide_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;
