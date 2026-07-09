import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  addMinistryAdmin,
  addLocalTeamLeader,
  addLocalTeamMember,
  assertMinistryAdmin,
  getMinistryAdminTree,
  isMinistryAdmin,
  listMinistryAdmins,
  removeMinistryAdmin,
  removeLocalTeamLeader,
  removeLocalTeamMember,
  searchMinistryAdminProfiles,
  searchMinistryPeople,
  updateLocalTeamMemberRoles,
} from "../lib/ministry-team-queries";

export const ministryHierarchyRouter = createTRPCRouter({
  adminAccess: protectedProcedure.query(async ({ ctx }) =>
    isMinistryAdmin(ctx.profileId),
  ),
  adminTree: protectedProcedure.query(async ({ ctx }) => {
    await assertMinistryAdmin(ctx.profileId);
    return getMinistryAdminTree();
  }),
  adminUsers: protectedProcedure.query(async ({ ctx }) =>
    listMinistryAdmins(ctx.profileId),
  ),
  searchAdminProfiles: protectedProcedure
    .input(z.object({ search: z.string() }))
    .query(async ({ ctx, input }) =>
      searchMinistryAdminProfiles(ctx.profileId, input.search),
    ),
  addAdminUser: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .mutation(async ({ ctx, input }) =>
      addMinistryAdmin({
        actorProfileId: ctx.profileId,
        profileId: input.profileId,
      }),
    ),
  removeAdminUser: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .mutation(async ({ ctx, input }) =>
      removeMinistryAdmin({
        actorProfileId: ctx.profileId,
        profileId: input.profileId,
      }),
    ),
  searchPeople: protectedProcedure
    .input(z.object({ search: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertMinistryAdmin(ctx.profileId);
      return searchMinistryPeople(input.search);
    }),
  addLocalLeader: protectedProcedure
    .input(z.object({ teamId: z.string(), personId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertMinistryAdmin(ctx.profileId);
      return addLocalTeamLeader({ ...input, profileId: ctx.profileId });
    }),
  removeLocalLeader: protectedProcedure
    .input(z.object({ teamId: z.string(), localLeaderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertMinistryAdmin(ctx.profileId);
      return removeLocalTeamLeader(input);
    }),
  addLocalMember: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        personId: z.string(),
        roleIds: z.array(z.string()).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertMinistryAdmin(ctx.profileId);
      return addLocalTeamMember({ ...input, profileId: ctx.profileId });
    }),
  updateLocalMemberRoles: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        localMemberId: z.string(),
        roleIds: z.array(z.string()).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertMinistryAdmin(ctx.profileId);
      return updateLocalTeamMemberRoles(input);
    }),
  removeLocalMember: protectedProcedure
    .input(z.object({ teamId: z.string(), localMemberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertMinistryAdmin(ctx.profileId);
      return removeLocalTeamMember(input);
    }),
});
