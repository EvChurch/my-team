export type GuideCategory = "QUICK_START" | "TROUBLESHOOTING" | "SOP";

export const defaultGuideSectionTitles: Record<GuideCategory, string> = {
  QUICK_START: "Quick Start",
  SOP: "Standard Operating Procedures",
  TROUBLESHOOTING: "Troubleshooting",
};

type PrismaLike = {
  guideSection: {
    findMany: (args: {
      where: { teamId: string };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }) => Promise<Array<GuideSectionSummary>>;
    create: (args: {
      data: { teamId: string; title: string; sortOrder: number };
    }) => Promise<GuideSectionSummary>;
  };
};

type GuideSectionSummary = {
  id: string;
  title: string;
  teamId: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export function defaultGuideSectionTitle(category: GuideCategory) {
  return defaultGuideSectionTitles[category];
}

export function findMatchingGuideSection(
  sections: GuideSectionSummary[],
  category: GuideCategory,
) {
  const title = defaultGuideSectionTitle(category);
  return sections.find((section) => section.title.trim() === title);
}

export async function ensureDefaultGuideSections(
  prisma: PrismaLike,
  teamId: string,
) {
  const existingSections = await prisma.guideSection.findMany({
    where: { teamId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  if (existingSections.length > 0) {
    return existingSections;
  }

  return Promise.all(
    Object.values(defaultGuideSectionTitles).map((title, index) =>
      prisma.guideSection.create({
        data: {
          teamId,
          title,
          sortOrder: index,
        },
      }),
    ),
  );
}
