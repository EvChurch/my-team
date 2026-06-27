import { describe, expect, it } from "vitest";
import { resolveTraining, type TrainingRequirementRecord } from "./resolve";

const assignments = [
  {
    assignmentId: "assignment-1",
    teamId: "team-1",
    teamName: "Production",
    positionId: "position-audio",
    positionName: "Audio",
  },
  {
    assignmentId: "assignment-2",
    teamId: "team-2",
    teamName: "Worship",
    positionId: "position-vocal",
    positionName: "Vocalist",
  },
];

const sharedModule = {
  id: "module-safe-ministry",
  title: "Safe Ministry",
  description: null,
  version: 1,
  expiryBehavior: "BLOCKING" as const,
};

function requirement(
  overrides: Partial<TrainingRequirementRecord>,
): TrainingRequirementRecord {
  return {
    id: "requirement-1",
    source: "COMPULSORY",
    teamId: null,
    positionId: null,
    scope: { type: "CHURCH" },
    module: sharedModule,
    ...overrides,
  };
}

describe("resolveTraining", () => {
  it("deduplicates shared modules across assignment contexts", () => {
    const result = resolveTraining({
      assignments,
      requirements: [requirement({ id: "church-safe-ministry" })],
      completions: [
        {
          moduleId: sharedModule.id,
          moduleVersion: 1,
          completedAt: new Date("2026-01-01T00:00:00.000Z"),
          expiresAt: null,
        },
      ],
      now: new Date("2026-06-24T00:00:00.000Z"),
    });

    expect(result.modules).toHaveLength(1);
    expect(result.modules[0]).toMatchObject({
      id: sharedModule.id,
      isComplete: true,
    });
    expect(result.assignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ assignmentId: "assignment-1", isReady: true }),
        expect.objectContaining({ assignmentId: "assignment-2", isReady: true }),
      ]),
    );
  });

  it("marks only the affected assignment blocked for role onboarding", () => {
    const result = resolveTraining({
      assignments,
      requirements: [
        requirement({
          id: "audio-safe-ministry",
          source: "ROLE_ONBOARDING",
          positionId: "position-audio",
          scope: null,
        }),
      ],
      completions: [],
      now: new Date("2026-06-24T00:00:00.000Z"),
    });

    expect(result.assignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assignmentId: "assignment-1",
          isReady: false,
          blockingModuleIds: [sharedModule.id],
        }),
        expect.objectContaining({
          assignmentId: "assignment-2",
          isReady: true,
          blockingModuleIds: [],
        }),
      ]),
    );
  });
});
