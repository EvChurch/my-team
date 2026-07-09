import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, leaderProcedure, protectedProcedure } from "../init";
import { prisma } from "../db";
import {
  evaluateCourseQuestionSubmission,
  parseCourseQuestionPages,
} from "../lib/training/course-content";
import { calculateExpiry } from "../lib/training/validity";
import { resolveTraining } from "../lib/training/resolve";

const completionModeEnum = z.enum(["ACKNOWLEDGE", "QUIZ_ATTEMPT", "QUIZ_PASS"]);
const expiryBehaviorEnum = z.enum(["BLOCKING", "NON_BLOCKING"]);
const quizSchema = z.object({
  question: z.string().min(1).max(1000),
  answers: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1).max(500),
        correct: z.boolean(),
      }),
    )
    .min(2)
    .max(6),
});

function isMissingTrainingTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const code = "code" in error ? error.code : null;
  const message = "message" in error ? error.message : null;

  return (
    code === "P2021" &&
    typeof message === "string" &&
    message.includes("Training")
  );
}

function parseQuiz(quiz: unknown) {
  const parsed = quizSchema.safeParse(quiz);
  return parsed.success ? parsed.data : null;
}

async function getOrCreateTeamTrainingScope(teamId: string) {
  const existing = await prisma.trainingScope.findFirst({
    where: { type: "TEAM", teamId },
  });
  if (existing) return existing;

  const team = await prisma.team.findUniqueOrThrow({
    where: { id: teamId },
    select: { name: true },
  });

  return prisma.trainingScope.create({
    data: {
      type: "TEAM",
      teamId,
      name: `${team.name} Training`,
    },
  });
}

export const trainingRouter = createTRPCRouter({
  teamManagement: leaderProcedure.query(async ({ input }) => {
    const [team, modules, requirements] = await Promise.all([
      prisma.team.findUniqueOrThrow({
        where: { id: input.teamId },
        select: {
          id: true,
          name: true,
          positions: {
            select: {
              id: true,
              name: true,
              assignments: {
                select: {
                  id: true,
                  person: { select: { id: true, fullName: true, image: true } },
                },
              },
            },
            orderBy: { name: "asc" },
          },
        },
      }),
      prisma.trainingModule.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            { scope: { teamId: input.teamId } },
            { scope: null },
            { requirements: { some: { teamId: input.teamId } } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          completionMode: true,
          expiryDays: true,
          expiryBehavior: true,
          guide: { select: { id: true, title: true } },
        },
        orderBy: [{ createdAt: "desc" }],
      }),
      prisma.trainingRequirement.findMany({
        where: { teamId: input.teamId },
        include: {
          scope: { select: { type: true } },
          module: {
            select: {
              id: true,
              title: true,
              description: true,
              version: true,
              expiryBehavior: true,
              expiryDays: true,
            },
          },
          position: { select: { id: true, name: true } },
        },
        orderBy: [{ source: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      }),
    ]);

    const moduleIds = [...new Set(requirements.map((item) => item.moduleId))];
    const assignmentPeople = team.positions.flatMap((position) =>
      position.assignments.map((assignment) => ({
        assignmentId: assignment.id,
        personId: assignment.person.id,
        personName: assignment.person.fullName,
        personImage: assignment.person.image,
        positionId: position.id,
        positionName: position.name,
      })),
    );
    const personIds = [...new Set(assignmentPeople.map((item) => item.personId))];
    const completions =
      personIds.length > 0 && moduleIds.length > 0
        ? await prisma.trainingCompletion.findMany({
            where: {
              personId: {
                in: personIds,
              },
              moduleId: { in: moduleIds },
            },
          })
        : [];
    const completionsByPersonId = new Map<
      string,
      typeof completions
    >();
    for (const completion of completions) {
      const personCompletions =
        completionsByPersonId.get(completion.personId) ?? [];
      personCompletions.push(completion);
      completionsByPersonId.set(completion.personId, personCompletions);
    }

    const complianceRows = assignmentPeople.map((assignment) => {
      const resolved = resolveTraining({
        assignments: [
          {
            assignmentId: assignment.assignmentId,
            teamId: team.id,
            teamName: team.name,
            positionId: assignment.positionId,
            positionName: assignment.positionName,
          },
        ],
        requirements,
        completions: completionsByPersonId.get(assignment.personId) ?? [],
      });
      const resolvedAssignment = resolved.assignments[0];
      const blockingTitles = resolved.modules
        .filter((module) =>
          resolvedAssignment?.blockingModuleIds.includes(module.id),
        )
        .map((module) => module.title);

      return {
        assignmentId: assignment.assignmentId,
        personId: assignment.personId,
        personName: assignment.personName,
        personImage: assignment.personImage,
        positionId: assignment.positionId,
        positionName: assignment.positionName,
        profileId: assignment.personId,
        isReady: resolvedAssignment?.isReady ?? true,
        moduleCount: resolvedAssignment?.moduleIds.length ?? 0,
        blockingCount: resolvedAssignment?.blockingModuleIds.length ?? 0,
        blockingTitles,
      };
    });

    const teamRequirementModuleIds = new Set(
      requirements
        .filter((requirement) => requirement.source === "TEAM_ONBOARDING")
        .map((requirement) => requirement.moduleId),
    );
    const roleRequirementModuleIds = new Map<string, Set<string>>();
    for (const requirement of requirements) {
      if (requirement.source !== "ROLE_ONBOARDING" || !requirement.positionId) {
        continue;
      }
      const modulesForRole =
        roleRequirementModuleIds.get(requirement.positionId) ?? new Set();
      modulesForRole.add(requirement.moduleId);
      roleRequirementModuleIds.set(requirement.positionId, modulesForRole);
    }

    return {
      team,
      modules,
      teamRequirements: requirements.filter(
        (requirement) => requirement.source === "TEAM_ONBOARDING",
      ),
      roleRequirements: requirements.filter(
        (requirement) => requirement.source === "ROLE_ONBOARDING",
      ),
      complianceRows,
      availableForTeam: modules.filter(
        (module) => !teamRequirementModuleIds.has(module.id),
      ),
      availableForRoles: Object.fromEntries(
        team.positions.map((position) => [
          position.id,
          modules.filter(
            (module) =>
              !roleRequirementModuleIds.get(position.id)?.has(module.id),
          ),
        ]),
      ),
    };
  }),

  myTraining: protectedProcedure.query(async ({ ctx }) => {
    const assignments = await prisma.assignment.findMany({
      where: { personId: { in: ctx.personIds } },
      include: {
        position: {
          include: {
            team: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (assignments.length === 0) {
      return { modules: [], assignments: [] };
    }

    const teamIds = [
      ...new Set(assignments.map((assignment) => assignment.position.teamId)),
    ];
    const positionIds = [
      ...new Set(assignments.map((assignment) => assignment.positionId)),
    ];

    try {
      const requirements = await prisma.trainingRequirement.findMany({
        where: {
          module: { status: "PUBLISHED" },
          OR: [
            { source: "COMPULSORY" },
            { teamId: { in: teamIds } },
            { positionId: { in: positionIds } },
            { scope: { teamId: { in: teamIds } } },
            { scope: { positionId: { in: positionIds } } },
          ],
        },
        include: {
          scope: { select: { type: true } },
          module: {
            select: {
              id: true,
              title: true,
              description: true,
              version: true,
              expiryBehavior: true,
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });

      const moduleIds = [...new Set(requirements.map((item) => item.moduleId))];
      const completions =
        moduleIds.length > 0
          ? await prisma.trainingCompletion.findMany({
              where: {
                personId: ctx.profileId,
                moduleId: { in: moduleIds },
              },
            })
          : [];

      return resolveTraining({
        assignments: assignments.map((assignment) => ({
          assignmentId: assignment.id,
          teamId: assignment.position.teamId,
          teamName: assignment.position.team.name,
          positionId: assignment.positionId,
          positionName: assignment.position.name,
        })),
        requirements,
        completions,
      });
    } catch (error) {
      if (!isMissingTrainingTableError(error)) throw error;

      return {
        modules: [],
        assignments: assignments.map((assignment) => ({
          assignmentId: assignment.id,
          teamId: assignment.position.teamId,
          teamName: assignment.position.team.name,
          positionId: assignment.positionId,
          positionName: assignment.position.name,
          isReady: true,
          blockingModuleIds: [],
          moduleIds: [],
        })),
      };
    }
  }),

  getModule: protectedProcedure
    .input(z.object({ moduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const module = await prisma.trainingModule.findUniqueOrThrow({
        where: { id: input.moduleId },
        include: {
          guide: { select: { id: true, title: true, teamId: true } },
          completions: {
            where: { personId: ctx.profileId },
            take: 1,
          },
        },
      });

      if (module.status !== "PUBLISHED") {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const completion = module.completions[0] ?? null;

      return {
        id: module.id,
        title: module.title,
        description: module.description,
        content: module.content,
        completionMode: module.completionMode,
        quiz: module.quiz,
        guide: module.guide,
        isComplete: Boolean(completion),
        completedAt: completion?.completedAt ?? null,
        expiresAt: completion?.expiresAt ?? null,
      };
    }),

  completeModule: protectedProcedure
    .input(
      z.object({
        moduleId: z.string(),
        quizAnswerId: z.string().optional(),
        courseQuestionAnswers: z
          .record(z.union([z.string(), z.array(z.string())]))
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const module = await prisma.trainingModule.findUniqueOrThrow({
        where: { id: input.moduleId },
        select: {
          id: true,
          content: true,
          version: true,
          expiryDays: true,
          status: true,
          completionMode: true,
          quiz: true,
        },
      });

      if (module.status !== "PUBLISHED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only published training modules can be completed.",
        });
      }

      const courseQuestionBlocks = parseCourseQuestionPages(module.content).flatMap(
        (page) => page.questions,
      );
      if (courseQuestionBlocks.length > 0) {
        const evaluation = evaluateCourseQuestionSubmission({
          questions: courseQuestionBlocks,
          submission: input.courseQuestionAnswers ?? {},
        });

        if (!evaluation.passed) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Answer the required course questions before completing this module.",
          });
        }
      }

      if (
        module.completionMode === "QUIZ_PASS" ||
        module.completionMode === "QUIZ_ATTEMPT"
      ) {
        const quiz = parseQuiz(module.quiz);
        if (!quiz) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This training module does not have a valid quiz.",
          });
        }

        const selectedAnswer = quiz.answers.find(
          (answer) => answer.id === input.quizAnswerId,
        );
        if (!selectedAnswer) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Select an answer before completing this module.",
          });
        }

        const passed = selectedAnswer.correct;
        await prisma.trainingQuizAttempt.create({
          data: {
            personId: ctx.profileId,
            moduleId: module.id,
            moduleVersion: module.version,
            answers: { answerId: selectedAnswer.id },
            score: passed ? 100 : 0,
            passed,
          },
        });

        if (module.completionMode === "QUIZ_PASS" && !passed) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "That answer was not correct. Try again when you are ready.",
          });
        }
      }

      const completedAt = new Date();
      const expiresAt = calculateExpiry(completedAt, module.expiryDays);

      return prisma.trainingCompletion.upsert({
        where: {
          personId_moduleId: {
            personId: ctx.profileId,
            moduleId: module.id,
          },
        },
        create: {
          personId: ctx.profileId,
          moduleId: module.id,
          moduleVersion: module.version,
          completedAt,
          expiresAt,
          requiresRedoAt: null,
        },
        update: {
          moduleVersion: module.version,
          completedAt,
          expiresAt,
          requiresRedoAt: null,
        },
      });
    }),

  createTeamModule: leaderProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().max(1000).optional(),
        content: z.any().optional(),
        guideId: z.string().optional(),
        completionMode: completionModeEnum.default("ACKNOWLEDGE"),
        quiz: quizSchema.optional(),
        passingScore: z.number().int().min(0).max(100).optional(),
        expiryDays: z.number().int().positive().optional(),
        expiryBehavior: expiryBehaviorEnum.default("BLOCKING"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = await getOrCreateTeamTrainingScope(input.teamId);

      return prisma.trainingModule.create({
        data: {
          title: input.title.trim(),
          description: input.description?.trim(),
          content: input.content,
          guideId: input.guideId,
          completionMode: input.completionMode,
          quiz: input.quiz,
          passingScore: input.passingScore,
          expiryDays: input.expiryDays,
          expiryBehavior: input.expiryBehavior,
          scopeId: scope.id,
          authorId: ctx.profileId,
          status: "PUBLISHED",
        },
      });
    }),

  addTeamOnboardingModule: leaderProcedure
    .input(z.object({ moduleId: z.string() }))
    .mutation(async ({ input }) => {
      const existing = await prisma.trainingRequirement.findFirst({
        where: {
          source: "TEAM_ONBOARDING",
          teamId: input.teamId,
          positionId: null,
          moduleId: input.moduleId,
        },
      });
      if (existing) return existing;

      return prisma.trainingRequirement.create({
        data: {
          source: "TEAM_ONBOARDING",
          teamId: input.teamId,
          moduleId: input.moduleId,
        },
      });
    }),

  addRoleOnboardingModule: leaderProcedure
    .input(
      z.object({
        moduleId: z.string(),
        positionId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const position = await prisma.position.findFirst({
        where: { id: input.positionId, teamId: input.teamId },
        select: { id: true },
      });
      if (!position) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Position does not belong to this team.",
        });
      }

      const existing = await prisma.trainingRequirement.findFirst({
        where: {
          source: "ROLE_ONBOARDING",
          teamId: input.teamId,
          positionId: input.positionId,
          moduleId: input.moduleId,
        },
      });
      if (existing) return existing;

      return prisma.trainingRequirement.create({
        data: {
          source: "ROLE_ONBOARDING",
          teamId: input.teamId,
          positionId: input.positionId,
          moduleId: input.moduleId,
        },
      });
    }),

  removeRequirement: leaderProcedure
    .input(z.object({ requirementId: z.string() }))
    .mutation(async ({ input }) => {
      const requirement = await prisma.trainingRequirement.findFirst({
        where: { id: input.requirementId, teamId: input.teamId },
        select: { id: true },
      });

      if (!requirement) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return prisma.trainingRequirement.delete({
        where: { id: requirement.id },
      });
    }),
});
