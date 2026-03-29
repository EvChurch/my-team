import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { prisma } from "../db";

export const preferencesRouter = createTRPCRouter({
  getTheme: protectedProcedure.query(async ({ ctx }) => {
    const pref = await prisma.userPreference.findUnique({
      where: { personId: ctx.personId },
      select: { theme: true },
    });
    return pref?.theme ?? "SYSTEM";
  }),

  setTheme: protectedProcedure
    .input(z.object({ theme: z.enum(["LIGHT", "DARK", "SYSTEM"]) }))
    .mutation(async ({ ctx, input }) => {
      await prisma.userPreference.upsert({
        where: { personId: ctx.personId },
        create: { personId: ctx.personId, theme: input.theme },
        update: { theme: input.theme },
      });
      return { success: true };
    }),

  getLocale: protectedProcedure.query(async ({ ctx }) => {
    const pref = await prisma.userPreference.findUnique({
      where: { personId: ctx.personId },
      select: { locale: true },
    });
    return pref?.locale ?? "en";
  }),

  setLocale: protectedProcedure
    .input(z.object({ locale: z.enum(["en", "zh-CN", "zh-TW", "mi", "sm", "hi", "ko", "to", "tl", "ja"]) }))
    .mutation(async ({ ctx, input }) => {
      await prisma.userPreference.upsert({
        where: { personId: ctx.personId },
        create: { personId: ctx.personId, locale: input.locale },
        update: { locale: input.locale },
      });
      return { success: true };
    }),
});
