import { describe, expect, it } from "vitest";

import { buildMinistryTeamCandidates } from "./ministry-hierarchy";

describe("buildMinistryTeamCandidates", () => {
  it("maps PCO-shaped campus serving teams into purpose, driver, team, and role artifacts", () => {
    const scopes = buildMinistryTeamCandidates([
      {
        id: 1,
        name: "Magnification",
        groupTypeId: 38,
        parentGroupId: null,
      },
      { id: 2, name: "CT MAG", groupTypeId: 23, parentGroupId: 1 },
      { id: 3, name: "Central", groupTypeId: 23, parentGroupId: 2 },
      { id: 4, name: "Music", groupTypeId: 23, parentGroupId: 3 },
      {
        id: 5,
        name: "Acoustic Guitar",
        groupTypeId: 23,
        parentGroupId: 4,
        pcoMarker: "position",
      },
    ]);

    expect(scopes).toEqual([
      expect.objectContaining({
        remoteId: "1",
        kind: "PURPOSE",
        parentRemoteId: null,
        teamProvider: "ROCK",
        teamRemoteId: "1",
      }),
      expect.objectContaining({
        remoteId: "2",
        kind: "CAMPUS",
        name: "Central",
        parentRemoteId: "1",
        teamProvider: "ROCK",
        teamRemoteId: "2",
      }),
      expect.objectContaining({
        remoteId: "4",
        kind: "SERVING_TEAM",
        parentRemoteId: "2",
        teamRemoteId: "4",
      }),
    ]);
    expect(scopes.some((scope) => scope.remoteId === "3")).toBe(false);
    expect(scopes.some((scope) => scope.remoteId === "5")).toBe(false);
  });

  it("retains PCO marker team ids as source trace while linking scopes to Rock teams", () => {
    const scopes = buildMinistryTeamCandidates([
      { id: 1, name: "Magnification", groupTypeId: 38, parentGroupId: null },
      {
        id: 4,
        name: "Music",
        groupTypeId: 23,
        parentGroupId: 1,
        pcoMarker: JSON.stringify({ teamId: "pco-music" }),
      },
    ]);

    expect(scopes).toContainEqual(
      expect.objectContaining({
        remoteId: "4",
        kind: "SERVING_TEAM",
        teamProvider: "ROCK",
        teamRemoteId: "4",
        sourceSnapshot: expect.objectContaining({
          pcoTeamRemoteId: "pco-music",
        }),
      }),
    );
  });

  it("treats PCO team leader and team position markers as role artifacts", () => {
    const scopes = buildMinistryTeamCandidates([
      { id: 1, name: "Magnification", groupTypeId: 38, parentGroupId: null },
      {
        id: 2,
        name: "Pack & Save - Team Leader",
        groupTypeId: 23,
        parentGroupId: 1,
        pcoMarker: JSON.stringify({
          teamid: "6377613",
          teampositionid: "6377613",
          name: "Pack & Save - Team Leader",
          type: "team_leader",
        }),
      },
      {
        id: 3,
        name: "Pack & Save - P&S Tech",
        groupTypeId: 23,
        parentGroupId: 1,
        pcoMarker: JSON.stringify({
          teamid: "6377613",
          teampositionid: "33993343",
          name: "Pack & Save - P&S Tech",
          type: "team_position",
        }),
      },
    ]);

    expect(scopes).toEqual([
      expect.objectContaining({
        remoteId: "1",
        kind: "PURPOSE",
        linkedPcoTeamRemoteIds: ["6377613"],
      }),
    ]);
  });

  it("promotes child PCO markers to the nearest visible Rock scope", () => {
    const scopes = buildMinistryTeamCandidates([
      { id: 1, name: "Magnification", groupTypeId: 38, parentGroupId: null },
      { id: 2, name: "CT MAG", groupTypeId: 23, parentGroupId: 1 },
      { id: 3, name: "Central", groupTypeId: 23, parentGroupId: 2 },
      { id: 4, name: "Music", groupTypeId: 23, parentGroupId: 3 },
      {
        id: 5,
        name: "Music - Team Leader",
        groupTypeId: 23,
        parentGroupId: 4,
        pcoMarker: JSON.stringify({
          teamid: "6382886",
          teampositionid: "6382886",
          type: "team_leader",
        }),
      },
    ]);

    expect(scopes).toContainEqual(
      expect.objectContaining({
        remoteId: "4",
        kind: "SERVING_TEAM",
        linkedPcoTeamRemoteIds: ["6382886"],
      }),
    );
    expect(scopes.some((scope) => scope.remoteId === "5")).toBe(false);
  });

  it("allows nested areas below an area before the actual team", () => {
    const scopes = buildMinistryTeamCandidates([
      {
        id: 10,
        name: "M Support",
        groupTypeId: 38,
        parentGroupId: null,
      },
      { id: 11, name: "~HQ M SUP", groupTypeId: 39, parentGroupId: 10 },
      { id: 12, name: "Ev Catering", groupTypeId: 40, parentGroupId: 11 },
      {
        id: 13,
        name: "Catering Cooks",
        groupTypeId: 23,
        parentGroupId: 12,
      },
      {
        id: 14,
        name: "UC Dinner Makers Team 1",
        groupTypeId: 23,
        parentGroupId: 13,
      },
    ]);

    expect(scopes).toEqual([
      expect.objectContaining({ remoteId: "10", kind: "PURPOSE" }),
      expect.objectContaining({
        remoteId: "11",
        name: "HQ",
        kind: "CAMPUS",
        parentRemoteId: "10",
      }),
      expect.objectContaining({
        remoteId: "12",
        kind: "AREA",
        parentRemoteId: "11",
      }),
      expect.objectContaining({
        remoteId: "13",
        kind: "AREA",
        parentRemoteId: "12",
      }),
      expect.objectContaining({
        remoteId: "14",
        kind: "SERVING_TEAM",
        parentRemoteId: "13",
        teamRemoteId: "14",
      }),
    ]);
  });

  it("renames campus-purpose prefixes to campus names", () => {
    const scopes = buildMinistryTeamCandidates([
      { id: 1, name: "Magnification", groupTypeId: 38, parentGroupId: null },
      { id: 2, name: "CT MAG", groupTypeId: 39, parentGroupId: 1 },
      { id: 3, name: "~HQ MAG", groupTypeId: 39, parentGroupId: 1 },
      { id: 4, name: "NS MAG", groupTypeId: 39, parentGroupId: 1 },
      { id: 5, name: "UC MAG", groupTypeId: 39, parentGroupId: 1 },
    ]);

    expect(scopes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ remoteId: "2", name: "Central" }),
        expect.objectContaining({ remoteId: "3", name: "HQ" }),
        expect.objectContaining({ remoteId: "4", name: "North Shore" }),
        expect.objectContaining({ remoteId: "5", name: "Unichurch" }),
      ]),
    );
  });

  it("folds repeated Unichurch campus container nodes", () => {
    const scopes = buildMinistryTeamCandidates([
      { id: 1, name: "Magnification", groupTypeId: 38, parentGroupId: null },
      { id: 2, name: "UC MAG", groupTypeId: 23, parentGroupId: 1 },
      { id: 3, name: "Unichurch", groupTypeId: 23, parentGroupId: 2 },
      {
        id: 4,
        name: "Pack and Save Team A",
        groupTypeId: 23,
        parentGroupId: 3,
      },
    ]);

    expect(scopes).toContainEqual(
      expect.objectContaining({
        remoteId: "2",
        kind: "CAMPUS",
        name: "Unichurch",
      }),
    );
    expect(scopes.some((scope) => scope.remoteId === "3")).toBe(false);
    expect(scopes).toContainEqual(
      expect.objectContaining({
        remoteId: "4",
        kind: "SERVING_TEAM",
        parentRemoteId: "2",
      }),
    );
  });
});
