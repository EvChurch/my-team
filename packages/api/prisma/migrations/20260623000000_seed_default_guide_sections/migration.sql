WITH teams_needing_sections AS (
  SELECT t.id
  FROM "Team" t
  WHERE EXISTS (
    SELECT 1
    FROM "Guide" g
    WHERE g."teamId" = t.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "GuideSection" s
    WHERE s."teamId" = t.id
  )
),
default_sections AS (
  SELECT id AS "teamId", 'QUICK_START' AS category, 'Quick Start' AS title, 0 AS "sortOrder", 'seed_quick_' || md5(id) AS "sectionId"
  FROM teams_needing_sections
  UNION ALL
  SELECT id AS "teamId", 'SOP' AS category, 'Standard Operating Procedures' AS title, 1 AS "sortOrder", 'seed_sop_' || md5(id) AS "sectionId"
  FROM teams_needing_sections
  UNION ALL
  SELECT id AS "teamId", 'TROUBLESHOOTING' AS category, 'Troubleshooting' AS title, 2 AS "sortOrder", 'seed_trouble_' || md5(id) AS "sectionId"
  FROM teams_needing_sections
)
INSERT INTO "GuideSection" ("id", "title", "teamId", "sortOrder", "createdAt", "updatedAt")
SELECT "sectionId", title, "teamId", "sortOrder", NOW(), NOW()
FROM default_sections;

WITH default_sections AS (
  SELECT t.id AS "teamId", 'QUICK_START'::"GuideCategory" AS category, 'seed_quick_' || md5(t.id) AS "sectionId"
  FROM "Team" t
  UNION ALL
  SELECT t.id AS "teamId", 'SOP'::"GuideCategory" AS category, 'seed_sop_' || md5(t.id) AS "sectionId"
  FROM "Team" t
  UNION ALL
  SELECT t.id AS "teamId", 'TROUBLESHOOTING'::"GuideCategory" AS category, 'seed_trouble_' || md5(t.id) AS "sectionId"
  FROM "Team" t
)
UPDATE "Guide" g
SET "sectionId" = ds."sectionId"
FROM default_sections ds
WHERE g."teamId" = ds."teamId"
  AND g."category" = ds.category
  AND g."sectionId" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "GuideSection" s
    WHERE s.id = ds."sectionId"
  );
