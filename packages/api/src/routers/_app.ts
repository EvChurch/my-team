import { createTRPCRouter } from "../init";
import { teamsRouter } from "./teams";
import { goalsRouter } from "./goals";
import { feedbackRouter } from "./feedback";
import { guidesRouter } from "./guides";
import { peopleRouter } from "./people";
import { schedulesRouter } from "./schedules";
import { plansRouter } from "./plans";
import { preferencesRouter } from "./preferences";
import { trainingRouter } from "./training";
import { ministryHierarchyRouter } from "./ministry-hierarchy";

export const appRouter = createTRPCRouter({
  teams: teamsRouter,
  goals: goalsRouter,
  feedback: feedbackRouter,
  guides: guidesRouter,
  people: peopleRouter,
  schedules: schedulesRouter,
  plans: plansRouter,
  preferences: preferencesRouter,
  training: trainingRouter,
  ministryHierarchy: ministryHierarchyRouter,
});

export type AppRouter = typeof appRouter;
