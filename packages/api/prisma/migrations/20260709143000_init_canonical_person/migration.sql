-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('PCO', 'ROCK');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('ENCOURAGEMENT', 'GROWTH_AREA', 'GENERAL');

-- CreateEnum
CREATE TYPE "GuideCategory" AS ENUM ('QUICK_START', 'TROUBLESHOOTING', 'SOP');

-- CreateEnum
CREATE TYPE "GuideStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('CONFIRMED', 'UNCONFIRMED', 'DECLINED');

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

-- CreateEnum
CREATE TYPE "TeamKind" AS ENUM ('CHURCH', 'PURPOSE', 'CAMPUS', 'AREA', 'SERVING_TEAM');

-- CreateEnum
CREATE TYPE "MembershipSource" AS ENUM ('SYNCED', 'MY_TEAM');

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAccount" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourcePerson" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "remoteId" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "fullName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sourceSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourcePerson_pkey" PRIMARY KEY ("id")
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
    "parentTeamId" TEXT,
    "kind" "TeamKind" NOT NULL DEFAULT 'SERVING_TEAM',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

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
    "personId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MinistryAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT,
    "description" JSONB,
    "source" "MembershipSource" NOT NULL DEFAULT 'SYNCED',
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
    "source" "MembershipSource" NOT NULL DEFAULT 'SYNCED',
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
    "source" "MembershipSource" NOT NULL DEFAULT 'SYNCED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

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
    "sectionId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isVisibleToTeam" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideSection" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuideSection_pkey" PRIMARY KEY ("id")
);

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
    "personId" TEXT NOT NULL,
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
    "personId" TEXT NOT NULL,
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
    "personId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "moduleVersion" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER,
    "passed" BOOLEAN,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingQuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "theme" "ThemePreference" NOT NULL DEFAULT 'SYSTEM',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Person_email_idx" ON "Person"("email");

-- CreateIndex
CREATE INDEX "Person_phone_idx" ON "Person"("phone");

-- CreateIndex
CREATE INDEX "Person_isActive_idx" ON "Person"("isActive");

-- CreateIndex
CREATE INDEX "AuthAccount_personId_idx" ON "AuthAccount"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccount_provider_providerAccountId_key" ON "AuthAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "SourcePerson_personId_idx" ON "SourcePerson"("personId");

-- CreateIndex
CREATE INDEX "SourcePerson_email_idx" ON "SourcePerson"("email");

-- CreateIndex
CREATE INDEX "SourcePerson_phone_idx" ON "SourcePerson"("phone");

-- CreateIndex
CREATE INDEX "SourcePerson_isActive_idx" ON "SourcePerson"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SourcePerson_provider_remoteId_key" ON "SourcePerson"("provider", "remoteId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceType_remoteId_provider_key" ON "ServiceType"("remoteId", "provider");

-- CreateIndex
CREATE INDEX "Team_kind_idx" ON "Team"("kind");

-- CreateIndex
CREATE INDEX "Team_parentTeamId_idx" ON "Team"("parentTeamId");

-- CreateIndex
CREATE INDEX "Team_isActive_idx" ON "Team"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Team_remoteId_provider_key" ON "Team"("remoteId", "provider");

-- CreateIndex
CREATE INDEX "TeamSource_teamId_idx" ON "TeamSource"("teamId");

-- CreateIndex
CREATE INDEX "TeamSource_parentRemoteId_idx" ON "TeamSource"("parentRemoteId");

-- CreateIndex
CREATE INDEX "TeamSource_sourceGroupTypeId_idx" ON "TeamSource"("sourceGroupTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamSource_provider_remoteId_key" ON "TeamSource"("provider", "remoteId");

-- CreateIndex
CREATE UNIQUE INDEX "MinistryAdmin_personId_key" ON "MinistryAdmin"("personId");

-- CreateIndex
CREATE INDEX "Position_teamId_idx" ON "Position"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Position_remoteId_provider_key" ON "Position"("remoteId", "provider");

-- CreateIndex
CREATE INDEX "Leader_teamId_idx" ON "Leader"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Leader_personId_teamId_source_key" ON "Leader"("personId", "teamId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "Leader_remoteId_provider_key" ON "Leader"("remoteId", "provider");

-- CreateIndex
CREATE INDEX "Assignment_positionId_idx" ON "Assignment"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_personId_positionId_source_key" ON "Assignment"("personId", "positionId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_remoteId_provider_key" ON "Assignment"("remoteId", "provider");

-- CreateIndex
CREATE INDEX "Schedule_personId_idx" ON "Schedule"("personId");

-- CreateIndex
CREATE INDEX "Schedule_teamId_idx" ON "Schedule"("teamId");

-- CreateIndex
CREATE INDEX "Schedule_personId_teamId_idx" ON "Schedule"("personId", "teamId");

-- CreateIndex
CREATE INDEX "Schedule_sortDate_idx" ON "Schedule"("sortDate");

-- CreateIndex
CREATE INDEX "Schedule_planRemoteId_personId_idx" ON "Schedule"("planRemoteId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_remoteId_provider_key" ON "Schedule"("remoteId", "provider");

-- CreateIndex
CREATE INDEX "PlanTime_scheduleId_idx" ON "PlanTime"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanTime_remoteId_provider_scheduleId_key" ON "PlanTime"("remoteId", "provider", "scheduleId");

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
CREATE INDEX "Guide_teamId_sectionId_sortOrder_idx" ON "Guide"("teamId", "sectionId", "sortOrder");

-- CreateIndex
CREATE INDEX "Guide_sectionId_idx" ON "Guide"("sectionId");

-- CreateIndex
CREATE INDEX "Guide_roleId_idx" ON "Guide"("roleId");

-- CreateIndex
CREATE INDEX "Guide_authorId_idx" ON "Guide"("authorId");

-- CreateIndex
CREATE INDEX "GuideSection_teamId_sortOrder_idx" ON "GuideSection"("teamId", "sortOrder");

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
CREATE INDEX "TrainingScopeOwner_personId_idx" ON "TrainingScopeOwner"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingScopeOwner_scopeId_personId_key" ON "TrainingScopeOwner"("scopeId", "personId");

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
CREATE INDEX "TrainingCompletion_moduleId_idx" ON "TrainingCompletion"("moduleId");

-- CreateIndex
CREATE INDEX "TrainingCompletion_expiresAt_idx" ON "TrainingCompletion"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCompletion_personId_moduleId_key" ON "TrainingCompletion"("personId", "moduleId");

-- CreateIndex
CREATE INDEX "TrainingQuizAttempt_personId_moduleId_idx" ON "TrainingQuizAttempt"("personId", "moduleId");

-- CreateIndex
CREATE INDEX "TrainingQuizAttempt_moduleId_idx" ON "TrainingQuizAttempt"("moduleId");

-- CreateIndex
CREATE INDEX "TrainingQuizAttempt_attemptedAt_idx" ON "TrainingQuizAttempt"("attemptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_personId_key" ON "UserPreference"("personId");

-- AddForeignKey
ALTER TABLE "AuthAccount" ADD CONSTRAINT "AuthAccount_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcePerson" ADD CONSTRAINT "SourcePerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_parentTeamId_fkey" FOREIGN KEY ("parentTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSource" ADD CONSTRAINT "TeamSource_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinistryAdmin" ADD CONSTRAINT "MinistryAdmin_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTime" ADD CONSTRAINT "PlanTime_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "Guide" ADD CONSTRAINT "Guide_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "GuideSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideSection" ADD CONSTRAINT "GuideSection_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingScope" ADD CONSTRAINT "TrainingScope_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingScope" ADD CONSTRAINT "TrainingScope_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingScopeOwner" ADD CONSTRAINT "TrainingScopeOwner_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "TrainingScope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingScopeOwner" ADD CONSTRAINT "TrainingScopeOwner_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingModule" ADD CONSTRAINT "TrainingModule_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "TrainingScope"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingModule" ADD CONSTRAINT "TrainingModule_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingModule" ADD CONSTRAINT "TrainingModule_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRequirement" ADD CONSTRAINT "TrainingRequirement_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "TrainingModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRequirement" ADD CONSTRAINT "TrainingRequirement_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "TrainingScope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRequirement" ADD CONSTRAINT "TrainingRequirement_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRequirement" ADD CONSTRAINT "TrainingRequirement_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCompletion" ADD CONSTRAINT "TrainingCompletion_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCompletion" ADD CONSTRAINT "TrainingCompletion_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "TrainingModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingQuizAttempt" ADD CONSTRAINT "TrainingQuizAttempt_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingQuizAttempt" ADD CONSTRAINT "TrainingQuizAttempt_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "TrainingModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
