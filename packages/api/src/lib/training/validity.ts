import type {
  TrainingValidityCompletion,
  TrainingValidityModule,
  TrainingValidityResult,
} from "./types";

export function calculateExpiry(
  completedAt: Date,
  expiryDays: number | null | undefined,
) {
  if (!expiryDays) return null;

  const expiresAt = new Date(completedAt);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + expiryDays);
  return expiresAt;
}

export function evaluateTrainingValidity({
  module,
  completion,
  now = new Date(),
}: {
  module: TrainingValidityModule;
  completion: TrainingValidityCompletion;
  now?: Date;
}): TrainingValidityResult {
  if (!completion) {
    return {
      state: "INCOMPLETE",
      isComplete: false,
      isBlocking: true,
      completedAt: null,
      expiresAt: null,
    };
  }

  if (
    completion.moduleVersion < module.version ||
    (completion.requiresRedoAt && completion.requiresRedoAt <= now)
  ) {
    return {
      state: "NEEDS_RECOMPLETION",
      isComplete: false,
      isBlocking: true,
      completedAt: completion.completedAt,
      expiresAt: completion.expiresAt,
    };
  }

  if (completion.expiresAt && completion.expiresAt <= now) {
    const isBlocking = module.expiryBehavior === "BLOCKING";

    return {
      state: isBlocking ? "EXPIRED_BLOCKING" : "EXPIRED_NON_BLOCKING",
      isComplete: !isBlocking,
      isBlocking,
      completedAt: completion.completedAt,
      expiresAt: completion.expiresAt,
    };
  }

  return {
    state: "COMPLETE",
    isComplete: true,
    isBlocking: false,
    completedAt: completion.completedAt,
    expiresAt: completion.expiresAt,
  };
}
