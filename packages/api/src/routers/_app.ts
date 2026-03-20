import { createTRPCRouter } from "../init";
import { teamsRouter } from "./teams";
import { goalsRouter } from "./goals";
import { feedbackRouter } from "./feedback";
import { guidesRouter } from "./guides";
import { peopleRouter } from "./people";

export const appRouter = createTRPCRouter({
  teams: teamsRouter,
  goals: goalsRouter,
  feedback: feedbackRouter,
  guides: guidesRouter,
  people: peopleRouter,
});

export type AppRouter = typeof appRouter;
