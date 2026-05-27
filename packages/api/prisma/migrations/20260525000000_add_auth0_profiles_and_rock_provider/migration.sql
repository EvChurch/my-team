ALTER TYPE "Provider" ADD VALUE 'ROCK';

CREATE TYPE "ProfileMergeCandidateStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuthAccount" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfileIdentity" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "personId" TEXT,
    "provider" "Provider" NOT NULL,
    "remoteId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileIdentity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfileMergeCandidate" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "duplicateProfileId" TEXT,
    "provider" "Provider",
    "remoteId" TEXT,
    "confidence" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ProfileMergeCandidateStatus" NOT NULL DEFAULT 'PENDING',
    "sourceSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileMergeCandidate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthAccount_provider_providerAccountId_key" ON "AuthAccount"("provider", "providerAccountId");
CREATE INDEX "AuthAccount_profileId_idx" ON "AuthAccount"("profileId");

CREATE UNIQUE INDEX "ProfileIdentity_provider_remoteId_key" ON "ProfileIdentity"("provider", "remoteId");
CREATE INDEX "ProfileIdentity_profileId_idx" ON "ProfileIdentity"("profileId");
CREATE INDEX "ProfileIdentity_personId_idx" ON "ProfileIdentity"("personId");

CREATE INDEX "ProfileMergeCandidate_profileId_idx" ON "ProfileMergeCandidate"("profileId");
CREATE INDEX "ProfileMergeCandidate_duplicateProfileId_idx" ON "ProfileMergeCandidate"("duplicateProfileId");
CREATE INDEX "ProfileMergeCandidate_status_idx" ON "ProfileMergeCandidate"("status");

ALTER TABLE "AuthAccount" ADD CONSTRAINT "AuthAccount_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProfileIdentity" ADD CONSTRAINT "ProfileIdentity_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileIdentity" ADD CONSTRAINT "ProfileIdentity_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProfileMergeCandidate" ADD CONSTRAINT "ProfileMergeCandidate_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileMergeCandidate" ADD CONSTRAINT "ProfileMergeCandidate_duplicateProfileId_fkey" FOREIGN KEY ("duplicateProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Goal" DROP CONSTRAINT "Goal_personId_fkey";
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_reviewedBy_fkey";
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Feedback" DROP CONSTRAINT "Feedback_authorId_fkey";
ALTER TABLE "Feedback" DROP CONSTRAINT "Feedback_recipientId_fkey";
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Guide" DROP CONSTRAINT "Guide_authorId_fkey";
ALTER TABLE "Guide" ADD CONSTRAINT "Guide_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserPreference" DROP CONSTRAINT "UserPreference_personId_fkey";
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
