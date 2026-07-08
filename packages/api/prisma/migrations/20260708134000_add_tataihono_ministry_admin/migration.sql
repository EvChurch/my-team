INSERT INTO "MinistryAdmin" ("id", "profileId", "note", "createdAt", "updatedAt")
SELECT
  'ministry-admin-' || "Profile"."id",
  "Profile"."id",
  'Initial production Ministry admin',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Profile"
WHERE lower("Profile"."email") = lower('tataihono@evchurch.nz')
ON CONFLICT ("profileId") DO NOTHING;
