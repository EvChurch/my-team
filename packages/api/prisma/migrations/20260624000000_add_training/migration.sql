-- CreateEnum
CREATE TYPE "TrainingModuleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TrainingScopeType" AS ENUM ('CHURCH', 'PURPOSE', 'CAMPUS', 'PURPOSE_CAMPUS', 'TEAM', 'ROLE');

-- CreateEnum
CREATE TYPE "TrainingRequirementSource" AS ENUM ('COMPULSORY', 'TEAM_ONBOARDING', 'ROLE_ONBOARDING');

-- CreateEnum
CREATE TYPE "TrainingCompletionMode" AS ENUM ('ACKNOWLEDGE', 'QUIZ_ATTEMPT', 'QUIZ_PASS');

-- CreateEnum
CREATE TYPE "TrainingExpiryBehavior" AS ENUM ('BLOCKING', 'NON_BLOCKING');

-- CreateTable
CREATE TABLE "TrainingScope" (
    "id" TEXT NOT NULL,
    "type" "TrainingScopeType" NOT NULL,
    "name" TEXT NOT NULL,
    "purposeKey" TEXT,
    "campusKey" TEXT,
    "teamId" TEXT,
    "positionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingScopeOwner" (
    "id" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingScopeOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingModule" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" JSONB,
    "status" "TrainingModuleStatus" NOT NULL DEFAULT 'DRAFT',
    "scopeId" TEXT,
    "guideId" TEXT,
    "authorId" TEXT,
    "completionMode" "TrainingCompletionMode" NOT NULL DEFAULT 'ACKNOWLEDGE',
    "quiz" JSONB,
    "passingScore" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "expiryDays" INTEGER,
    "expiryBehavior" "TrainingExpiryBehavior" NOT NULL DEFAULT 'BLOCKING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingRequirement" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "source" "TrainingRequirementSource" NOT NULL,
    "scopeId" TEXT,
    "teamId" TEXT,
    "positionId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingCompletion" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "moduleVersion" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "requiresRedoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingQuizAttempt" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "moduleVersion" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER,
    "passed" BOOLEAN,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingQuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingScope_type_idx" ON "TrainingScope"("type");

-- CreateIndex
CREATE INDEX "TrainingScope_teamId_idx" ON "TrainingScope"("teamId");

-- CreateIndex
CREATE INDEX "TrainingScope_positionId_idx" ON "TrainingScope"("positionId");

-- CreateIndex
CREATE INDEX "TrainingScope_purposeKey_idx" ON "TrainingScope"("purposeKey");

-- CreateIndex
CREATE INDEX "TrainingScope_campusKey_idx" ON "TrainingScope"("campusKey");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingScopeOwner_scopeId_profileId_key" ON "TrainingScopeOwner"("scopeId", "profileId");

-- CreateIndex
CREATE INDEX "TrainingScopeOwner_profileId_idx" ON "TrainingScopeOwner"("profileId");

-- CreateIndex
CREATE INDEX "TrainingModule_scopeId_idx" ON "TrainingModule"("scopeId");

-- CreateIndex
CREATE INDEX "TrainingModule_guideId_idx" ON "TrainingModule"("guideId");

-- CreateIndex
CREATE INDEX "TrainingModule_authorId_idx" ON "TrainingModule"("authorId");

-- CreateIndex
CREATE INDEX "TrainingModule_status_idx" ON "TrainingModule"("status");

-- CreateIndex
CREATE INDEX "TrainingRequirement_moduleId_idx" ON "TrainingRequirement"("moduleId");

-- CreateIndex
CREATE INDEX "TrainingRequirement_scopeId_idx" ON "TrainingRequirement"("scopeId");

-- CreateIndex
CREATE INDEX "TrainingRequirement_teamId_idx" ON "TrainingRequirement"("teamId");

-- CreateIndex
CREATE INDEX "TrainingRequirement_positionId_idx" ON "TrainingRequirement"("positionId");

-- CreateIndex
CREATE INDEX "TrainingRequirement_source_idx" ON "TrainingRequirement"("source");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCompletion_profileId_moduleId_key" ON "TrainingCompletion"("profileId", "moduleId");

-- CreateIndex
CREATE INDEX "TrainingCompletion_moduleId_idx" ON "TrainingCompletion"("moduleId");

-- CreateIndex
CREATE INDEX "TrainingCompletion_expiresAt_idx" ON "TrainingCompletion"("expiresAt");

-- CreateIndex
CREATE INDEX "TrainingQuizAttempt_profileId_moduleId_idx" ON "TrainingQuizAttempt"("profileId", "moduleId");

-- CreateIndex
CREATE INDEX "TrainingQuizAttempt_moduleId_idx" ON "TrainingQuizAttempt"("moduleId");

-- CreateIndex
CREATE INDEX "TrainingQuizAttempt_attemptedAt_idx" ON "TrainingQuizAttempt"("attemptedAt");

-- AddForeignKey
ALTER TABLE "TrainingScope" ADD CONSTRAINT "TrainingScope_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingScope" ADD CONSTRAINT "TrainingScope_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingScopeOwner" ADD CONSTRAINT "TrainingScopeOwner_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "TrainingScope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingScopeOwner" ADD CONSTRAINT "TrainingScopeOwner_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingModule" ADD CONSTRAINT "TrainingModule_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "TrainingScope"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingModule" ADD CONSTRAINT "TrainingModule_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingModule" ADD CONSTRAINT "TrainingModule_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRequirement" ADD CONSTRAINT "TrainingRequirement_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "TrainingModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRequirement" ADD CONSTRAINT "TrainingRequirement_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "TrainingScope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRequirement" ADD CONSTRAINT "TrainingRequirement_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRequirement" ADD CONSTRAINT "TrainingRequirement_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCompletion" ADD CONSTRAINT "TrainingCompletion_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCompletion" ADD CONSTRAINT "TrainingCompletion_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "TrainingModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingQuizAttempt" ADD CONSTRAINT "TrainingQuizAttempt_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingQuizAttempt" ADD CONSTRAINT "TrainingQuizAttempt_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "TrainingModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
