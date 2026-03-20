import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client/client.js";

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });

  return new PrismaClient({ adapter }).$extends({
    result: {
      team: {
        descriptionMarkdown: {
          needs: { description: true },
          compute(team) {
            const value = team.description;
            if (typeof value === "string") return value;
            if (
              value &&
              typeof value === "object" &&
              !Array.isArray(value) &&
              "markdown" in value &&
              typeof value.markdown === "string"
            ) {
              return value.markdown;
            }
            return null;
          },
        },
      },
      position: {
        descriptionMarkdown: {
          needs: { description: true },
          compute(position) {
            const value = position.description;
            if (typeof value === "string") return value;
            if (
              value &&
              typeof value === "object" &&
              !Array.isArray(value) &&
              "markdown" in value &&
              typeof value.markdown === "string"
            ) {
              return value.markdown;
            }
            return null;
          },
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
