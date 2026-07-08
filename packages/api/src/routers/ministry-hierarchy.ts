import { createTRPCRouter, protectedProcedure } from "../init";
import {
  assertMinistryAdmin,
  getMinistryAdminTree,
  isMinistryAdmin,
} from "../lib/ministry-team-queries";

export const ministryHierarchyRouter = createTRPCRouter({
  adminAccess: protectedProcedure.query(async ({ ctx }) =>
    isMinistryAdmin(ctx.profileId),
  ),
  adminTree: protectedProcedure.query(async ({ ctx }) => {
    await assertMinistryAdmin(ctx.profileId);
    return getMinistryAdminTree();
  }),
});
