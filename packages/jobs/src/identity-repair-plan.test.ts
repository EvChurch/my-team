import { describe, expect, it } from "vitest";
import { planIdentityRepair, type RepairPerson, type RepairSource } from "./identity-repair-plan";

const source = (id: string, firstName: string, provider = "ROCK"): RepairSource => ({
  id, provider, remoteId: id, firstName, lastName: "Green", fullName: `${firstName} Green`, email: "family@example.com", phone: null, isActive: true,
});
const person = (sources: RepairSource[]): RepairPerson => ({ id: "original", fullName: "Ryan Green", sourcePeople: sources, nativeReferences: {}, syncedReferences: [] });

describe("identity repair proposals", () => {
  it("partitions Rock IDs even with identical names and attaches only a unique PCO match", () => {
    const plan = planIdentityRepair([person([source("r1", "Ryan"), source("r2", "Owen"), source("p1", "Ryan", "PCO")])]);
    expect(plan.summary.newPeople).toBe(1);
    expect(plan.groups[0]?.partitions.map((p) => p.sources.map((s) => s.id))).toEqual([["r1", "p1"], ["r2"]]);
    expect(plan.groups[0]?.retainedPartition).toBe("r1");
  });
  it("does not guess ownership when two source records have the same name", () => {
    const plan = planIdentityRepair([person([source("r1", "Ryan"), source("r2", "Ryan"), source("p1", "Ryan", "PCO")])]);
    expect(plan.groups[0]?.retainedPartition).toBeNull();
    expect(plan.summary.newPeople).toBe(3);
  });
  it("flags app content and local membership for evidence instead of choosing an owner", () => {
    const input = { ...person([source("r1", "Ryan"), source("r2", "Owen")]), nativeReferences: { goalsOwned: 1, localAssignments: 1 }, syncedReferences: [{ kind: "Assignment", id: "assignment", provider: "ROCK", remoteId: "upstream-membership" }] };
    const before = JSON.stringify(input);
    const plan = planIdentityRepair([input]);
    expect(plan.groups[0]?.status).toBe("needs-ownership-evidence");
    expect(plan.summary.syncedReferencesToResolve).toBe(1);
    expect(JSON.stringify(input)).toBe(before);
  });
  it("ignores a healthy cross-provider pair", () => {
    expect(planIdentityRepair([person([source("r1", "Ryan"), source("p1", "Ryan", "PCO")])]).groups).toEqual([]);
  });
  it("does not flag a single source solely because the person has no surname", () => {
    expect(planIdentityRepair([person([{ ...source("r1", "Ryan"), lastName: "" }])]).groups).toEqual([]);
  });

});
