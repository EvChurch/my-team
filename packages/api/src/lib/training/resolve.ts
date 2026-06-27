import { evaluateTrainingValidity } from "./validity";
import type {
  TrainingCompletionState,
  TrainingExpiryBehavior,
  TrainingValidityCompletion,
} from "./types";

export type TrainingAssignmentContext = {
  assignmentId: string;
  teamId: string;
  teamName: string;
  positionId: string;
  positionName: string | null;
};

export type TrainingRequirementRecord = {
  id: string;
  source: "COMPULSORY" | "TEAM_ONBOARDING" | "ROLE_ONBOARDING";
  teamId: string | null;
  positionId: string | null;
  scope: { type: string } | null;
  module: {
    id: string;
    title: string;
    description: string | null;
    version: number;
    expiryBehavior: TrainingExpiryBehavior;
  };
};

export type TrainingCompletionRecord = {
  moduleId: string;
  moduleVersion: number;
  completedAt: Date;
  expiresAt: Date | null;
  requiresRedoAt?: Date | null;
};

export type ResolvedTraining = {
  modules: Array<{
    id: string;
    title: string;
    description: string | null;
    state: TrainingCompletionState;
    isComplete: boolean;
    isBlocking: boolean;
    completedAt: Date | null;
    expiresAt: Date | null;
    requirementIds: string[];
  }>;
  assignments: Array<{
    assignmentId: string;
    teamId: string;
    teamName: string;
    positionId: string;
    positionName: string | null;
    isReady: boolean;
    blockingModuleIds: string[];
    moduleIds: string[];
  }>;
};

function requirementAppliesToAssignment(
  requirement: TrainingRequirementRecord,
  assignment: TrainingAssignmentContext,
) {
  if (requirement.positionId) {
    return requirement.positionId === assignment.positionId;
  }

  if (requirement.teamId) {
    return requirement.teamId === assignment.teamId;
  }

  if (requirement.source === "COMPULSORY") {
    return true;
  }

  return false;
}

export function resolveTraining({
  assignments,
  requirements,
  completions,
  now = new Date(),
}: {
  assignments: TrainingAssignmentContext[];
  requirements: TrainingRequirementRecord[];
  completions: TrainingCompletionRecord[];
  now?: Date;
}): ResolvedTraining {
  const completionsByModuleId = new Map(
    completions.map((completion) => [completion.moduleId, completion]),
  );
  const requirementsByModuleId = new Map<
    string,
    TrainingRequirementRecord[]
  >();

  for (const requirement of requirements) {
    const moduleRequirements =
      requirementsByModuleId.get(requirement.module.id) ?? [];
    moduleRequirements.push(requirement);
    requirementsByModuleId.set(requirement.module.id, moduleRequirements);
  }

  const modules = Array.from(requirementsByModuleId.entries()).map(
    ([moduleId, moduleRequirements]) => {
      const module = moduleRequirements[0]!.module;
      const completion = completionsByModuleId.get(moduleId) ?? null;
      const validity = evaluateTrainingValidity({
        module,
        completion: completion as TrainingValidityCompletion,
        now,
      });

      return {
        id: module.id,
        title: module.title,
        description: module.description,
        state: validity.state,
        isComplete: validity.isComplete,
        isBlocking: validity.isBlocking,
        completedAt: validity.completedAt,
        expiresAt: validity.expiresAt,
        requirementIds: moduleRequirements.map((requirement) => requirement.id),
      };
    },
  );
  const modulesById = new Map(modules.map((module) => [module.id, module]));

  const resolvedAssignments = assignments.map((assignment) => {
    const assignmentRequirements = requirements.filter((requirement) =>
      requirementAppliesToAssignment(requirement, assignment),
    );
    const moduleIds = [
      ...new Set(
        assignmentRequirements.map((requirement) => requirement.module.id),
      ),
    ];
    const blockingModuleIds = moduleIds.filter((moduleId) => {
      const module = modulesById.get(moduleId);
      return module ? !module.isComplete && module.isBlocking : true;
    });

    return {
      ...assignment,
      isReady: blockingModuleIds.length === 0,
      blockingModuleIds,
      moduleIds,
    };
  });

  return {
    modules,
    assignments: resolvedAssignments,
  };
}
