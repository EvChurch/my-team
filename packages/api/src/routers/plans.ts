import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { prisma } from "../db";
import { fetchPCO } from "../lib/pco";

// --- PCO API response schemas ---

const pcoPlanTimeSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    time_type: z.string().nullable().optional(),
    starts_at: z.string().nullable().optional(),
    ends_at: z.string().nullable().optional(),
  })
  .passthrough();

const pcoPlanSchema = z
  .object({
    id: z.string(),
    title: z.string().nullable().optional(),
    dates: z.string().nullable().optional(),
    short_dates: z.string().nullable().optional(),
    sort_date: z.string().nullable().optional(),
    series_title: z.string().nullable().optional(),
    total_length: z.number().nullable().optional(),
    planning_center_url: z.string().nullable().optional(),
    plan_notes_count: z.number().nullable().optional(),
    plan_times: z.array(pcoPlanTimeSchema).optional().default([]),
  })
  .passthrough();

const pcoSongSchema = z
  .object({
    id: z.string(),
    title: z.string().nullable().optional(),
    author: z.string().nullable().optional(),
    ccli_number: z.number().nullable().optional(),
  })
  .passthrough();

const pcoArrangementSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    bpm: z.number().nullable().optional(),
    meter: z.string().nullable().optional(),
    length: z.number().nullable().optional(),
    chord_chart: z.string().nullable().optional(),
    chord_chart_key: z.string().nullable().optional(),
    has_chord_chart: z.boolean().nullable().optional(),
  })
  .passthrough();

const pcoKeySchema = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    starting_key: z.string().nullable().optional(),
    ending_key: z.string().nullable().optional(),
  })
  .passthrough();

const pcoItemNoteSchema = z
  .object({
    id: z.string(),
    content: z.string().nullable().optional(),
    category_name: z.string().nullable().optional(),
  })
  .passthrough();

const pcoMediaSchema = z
  .object({
    id: z.string(),
    title: z.string().nullable().optional(),
    media_type: z.string().nullable().optional(),
  })
  .passthrough();

const pcoItemSchema = z
  .object({
    id: z.string(),
    title: z.string().nullable().optional(),
    sequence: z.number().nullable().optional(),
    length: z.number().nullable().optional(),
    item_type: z.string().nullable().optional(),
    service_position: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    html_details: z.string().nullable().optional(),
    key_name: z.string().nullable().optional(),
    song: pcoSongSchema.nullable().optional(),
    arrangement: pcoArrangementSchema.nullable().optional(),
    key: pcoKeySchema.nullable().optional(),
    item_notes: z.array(pcoItemNoteSchema).optional().default([]),
    media: z.array(pcoMediaSchema).optional().default([]),
  })
  .passthrough();

const pcoTeamMemberSchema = z
  .object({
    id: z.string(),
    status: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    team_position_name: z.string().nullable().optional(),
    photo_thumbnail: z.string().nullable().optional(),
    person: z
      .object({ id: z.string() })
      .passthrough()
      .nullable()
      .optional(),
    team: z
      .object({
        id: z.string(),
        name: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

const pcoPlanNoteSchema = z
  .object({
    id: z.string(),
    content: z.string().nullable().optional(),
    category_name: z.string().nullable().optional(),
  })
  .passthrough();

const pcoAttachmentSchema = z
  .object({
    id: z.string(),
    filename: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    content_type: z.string().nullable().optional(),
    file_size: z.number().nullable().optional(),
    thumbnail_url: z.string().nullable().optional(),
    streamable: z.boolean().nullable().optional(),
    downloadable: z.boolean().nullable().optional(),
    remote_link: z.string().nullable().optional(),
  })
  .passthrough();

// --- Status mapping ---

const PCO_STATUS_MAP: Record<string, string> = {
  C: "Confirmed",
  Confirmed: "Confirmed",
  U: "Unconfirmed",
  Unconfirmed: "Unconfirmed",
  D: "Declined",
  Declined: "Declined",
};

// --- Router ---

export const plansRouter = createTRPCRouter({
  /**
   * Get full plan details by fetching from PCO API on-demand.
   * Access restricted to users who have a Schedule record for this plan.
   */
  get: protectedProcedure
    .input(z.object({ planRemoteId: z.string() }))
    .query(async ({ ctx, input }) => {
      // 1. Access check — find a schedule record for this user + plan
      const schedule = await prisma.schedule.findFirst({
        where: {
          planRemoteId: input.planRemoteId,
          personId: ctx.personId,
        },
        include: {
          team: {
            select: {
              serviceTypeId: true,
              serviceType: { select: { remoteId: true } },
            },
          },
        },
      });

      if (!schedule) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (!schedule.team.serviceType?.remoteId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Schedule is missing service type information.",
        });
      }

      const serviceTypeId = schedule.team.serviceType.remoteId;
      const planId = input.planRemoteId;
      const basePath = `/services/v2/service_types/${serviceTypeId}/plans/${planId}`;
      const timeout = AbortSignal.timeout(8000);

      // 2. Get current user's PCO remote ID for roster highlighting
      const person = await prisma.person.findUnique({
        where: { id: ctx.personId },
        select: { remoteId: true },
      });
      const currentUserPcoId = person?.remoteId ?? null;

      // 3. Parallel PCO API calls — required + optional
      const [requiredResults, optionalResults] = await Promise.all([
        // Required calls — fail if any error
        Promise.all([
          fetchPCO(`${basePath}?include=plan_times`, timeout),
          fetchPCO(
            `${basePath}/items?include=song,arrangement,key,item_notes,media&per_page=100`,
            timeout,
          ),
          fetchPCO(
            `${basePath}/team_members?include=person,team&per_page=100`,
            timeout,
          ),
        ]).catch((error) => {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          if (message.includes("404")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "This plan is no longer available in Planning Center.",
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch plan details: ${message}`,
          });
        }),
        // Optional calls — graceful degradation
        Promise.allSettled([
          fetchPCO(`${basePath}/notes`, timeout),
          fetchPCO(`${basePath}/all_attachments`, timeout),
        ]),
      ]);

      const [rawPlan, rawItems, rawTeamMembers] = requiredResults;
      const [notesResult, attachmentsResult] = optionalResults;

      // 4. Parse responses
      const plan = pcoPlanSchema.parse(rawPlan);

      const rawItemsArray = Array.isArray(rawItems) ? rawItems : [];
      const items = rawItemsArray
        .map((item: unknown) => pcoItemSchema.parse(item))
        .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

      const rawMembersArray = Array.isArray(rawTeamMembers)
        ? rawTeamMembers
        : [];
      const teamMembers = rawMembersArray.map((member: unknown) =>
        pcoTeamMemberSchema.parse(member),
      );

      const rawNotes =
        notesResult.status === "fulfilled" && Array.isArray(notesResult.value)
          ? notesResult.value
          : [];
      const notes = rawNotes.map((note: unknown) =>
        pcoPlanNoteSchema.parse(note),
      );

      const rawAttachments =
        attachmentsResult.status === "fulfilled" &&
        Array.isArray(attachmentsResult.value)
          ? attachmentsResult.value
          : [];
      const attachments = rawAttachments.map((att: unknown) =>
        pcoAttachmentSchema.parse(att),
      );

      // 5. Group team members by team
      const teamGroups = new Map<
        string,
        {
          teamId: string;
          teamName: string;
          members: Array<{
            id: string;
            name: string | null;
            position: string | null;
            status: string;
            photoThumbnail: string | null;
            personPcoId: string | null;
          }>;
        }
      >();

      for (const member of teamMembers) {
        const teamId = member.team?.id ?? "unknown";
        const teamName = member.team?.name ?? "Unknown Team";

        if (!teamGroups.has(teamId)) {
          teamGroups.set(teamId, { teamId, teamName, members: [] });
        }

        teamGroups.get(teamId)!.members.push({
          id: member.id,
          name: member.name ?? null,
          position: member.team_position_name ?? null,
          status: PCO_STATUS_MAP[member.status ?? ""] ?? "Unconfirmed",
          photoThumbnail: member.photo_thumbnail ?? null,
          personPcoId: member.person?.id ?? null,
        });
      }

      // 6. Transform items for the client
      const serviceOrder = items.map((item) => ({
        id: item.id,
        title: item.title ?? null,
        itemType: item.item_type ?? "item",
        servicePosition: item.service_position ?? null,
        sequence: item.sequence ?? 0,
        length: item.length ?? null,
        description: item.description ?? null,
        htmlDetails: item.html_details ?? null,
        keyName: item.key_name ?? null,
        song: item.song
          ? {
              id: item.song.id,
              title: item.song.title ?? null,
              author: item.song.author ?? null,
              ccliNumber: item.song.ccli_number ?? null,
            }
          : null,
        arrangement: item.arrangement
          ? {
              id: item.arrangement.id,
              name: item.arrangement.name ?? null,
              bpm: item.arrangement.bpm ?? null,
              meter: item.arrangement.meter ?? null,
              length: item.arrangement.length ?? null,
              chordChart: item.arrangement.chord_chart ?? null,
              chordChartKey: item.arrangement.chord_chart_key ?? null,
              hasChordChart: item.arrangement.has_chord_chart ?? false,
            }
          : null,
        key: item.key
          ? {
              name: item.key.name ?? null,
              startingKey: item.key.starting_key ?? null,
              endingKey: item.key.ending_key ?? null,
            }
          : null,
        itemNotes: item.item_notes.map((n) => ({
          id: n.id,
          content: n.content ?? null,
          categoryName: n.category_name ?? null,
        })),
      }));

      // 7. Transform plan times
      const planTimes = plan.plan_times
        .map((pt) => ({
          id: pt.id,
          name: pt.name ?? null,
          timeType: pt.time_type ?? null,
          startsAt: pt.starts_at ?? null,
          endsAt: pt.ends_at ?? null,
        }))
        .sort(
          (a, b) =>
            new Date(a.startsAt ?? 0).getTime() -
            new Date(b.startsAt ?? 0).getTime(),
        );

      // 8. Transform notes
      const planNotes = notes.map((n) => ({
        id: n.id,
        content: n.content ?? null,
        categoryName: n.category_name ?? null,
      }));

      // 9. Transform attachments
      const planAttachments = attachments.map((att) => ({
        id: att.id,
        filename: att.filename ?? null,
        url: att.url ?? null,
        contentType: att.content_type ?? null,
        fileSize: att.file_size ?? null,
        thumbnailUrl: att.thumbnail_url ?? null,
        streamable: att.streamable ?? false,
        downloadable: att.downloadable ?? false,
        remoteLink: att.remote_link ?? null,
      }));

      return {
        plan: {
          id: plan.id,
          title: plan.title ?? null,
          dates: plan.dates ?? null,
          shortDates: plan.short_dates ?? null,
          sortDate: plan.sort_date ?? null,
          seriesTitle: plan.series_title ?? null,
          totalLength: plan.total_length ?? null,
          planningCenterUrl: plan.planning_center_url ?? null,
        },
        serviceOrder,
        planTimes,
        roster: Array.from(teamGroups.values()),
        notes: planNotes,
        attachments: planAttachments,
        currentUserPcoId,
      };
    }),
});
