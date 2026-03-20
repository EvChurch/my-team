import { createTRPCRouter } from "../init.js";
import { teamsRouter } from "./teams.js";
import { goalsRouter } from "./goals.js";
import { feedbackRouter } from "./feedback.js";
import { guidesRouter } from "./guides.js";
import { peopleRouter } from "./people.js";

export const appRouter = createTRPCRouter({
  teams: teamsRouter,
  goals: goalsRouter,
  feedback: feedbackRouter,
  guides: guidesRouter,
  people: peopleRouter,
});

export type AppRouter = typeof appRouter;
