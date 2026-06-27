export type TrainingExpiryBehavior = "BLOCKING" | "NON_BLOCKING";

export type TrainingCompletionState =
  | "INCOMPLETE"
  | "COMPLETE"
  | "EXPIRED_BLOCKING"
  | "EXPIRED_NON_BLOCKING"
  | "NEEDS_RECOMPLETION";

export type TrainingValidityModule = {
  version: number;
  expiryBehavior: TrainingExpiryBehavior;
};

export type TrainingValidityCompletion = {
  moduleVersion: number;
  completedAt: Date;
  expiresAt: Date | null;
  requiresRedoAt?: Date | null;
} | null;

export type TrainingValidityResult = {
  state: TrainingCompletionState;
  isComplete: boolean;
  isBlocking: boolean;
  completedAt: Date | null;
  expiresAt: Date | null;
};
