import { describe, expect, it } from "vitest";
import { calculateExpiry, evaluateTrainingValidity } from "./validity";

const now = new Date("2026-06-24T00:00:00.000Z");
const completedAt = new Date("2026-05-24T00:00:00.000Z");

describe("calculateExpiry", () => {
  it("returns null for modules that never expire", () => {
    expect(calculateExpiry(completedAt, null)).toBeNull();
    expect(calculateExpiry(completedAt, undefined)).toBeNull();
  });

  it("adds expiry days in UTC", () => {
    expect(calculateExpiry(completedAt, 30)?.toISOString()).toBe(
      "2026-06-23T00:00:00.000Z",
    );
  });
});

describe("evaluateTrainingValidity", () => {
  it("marks missing completion as incomplete and blocking", () => {
    expect(
      evaluateTrainingValidity({
        module: { version: 1, expiryBehavior: "BLOCKING" },
        completion: null,
        now,
      }),
    ).toMatchObject({
      state: "INCOMPLETE",
      isComplete: false,
      isBlocking: true,
    });
  });

  it("keeps a non-expiring current completion valid", () => {
    expect(
      evaluateTrainingValidity({
        module: { version: 1, expiryBehavior: "BLOCKING" },
        completion: {
          moduleVersion: 1,
          completedAt,
          expiresAt: null,
        },
        now,
      }),
    ).toMatchObject({
      state: "COMPLETE",
      isComplete: true,
      isBlocking: false,
    });
  });

  it("marks expired blocking training as incomplete", () => {
    expect(
      evaluateTrainingValidity({
        module: { version: 1, expiryBehavior: "BLOCKING" },
        completion: {
          moduleVersion: 1,
          completedAt,
          expiresAt: new Date("2026-06-23T00:00:00.000Z"),
        },
        now,
      }),
    ).toMatchObject({
      state: "EXPIRED_BLOCKING",
      isComplete: false,
      isBlocking: true,
    });
  });

  it("marks expired non-blocking training as complete with renewal needed", () => {
    expect(
      evaluateTrainingValidity({
        module: { version: 1, expiryBehavior: "NON_BLOCKING" },
        completion: {
          moduleVersion: 1,
          completedAt,
          expiresAt: new Date("2026-06-23T00:00:00.000Z"),
        },
        now,
      }),
    ).toMatchObject({
      state: "EXPIRED_NON_BLOCKING",
      isComplete: true,
      isBlocking: false,
    });
  });

  it("requires re-completion when module version increases", () => {
    expect(
      evaluateTrainingValidity({
        module: { version: 2, expiryBehavior: "BLOCKING" },
        completion: {
          moduleVersion: 1,
          completedAt,
          expiresAt: null,
        },
        now,
      }),
    ).toMatchObject({
      state: "NEEDS_RECOMPLETION",
      isComplete: false,
      isBlocking: true,
    });
  });
});
