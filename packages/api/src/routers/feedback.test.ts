import { describe, expect, it } from "vitest";
import { feedbackRecipientVisibilityWhere } from "./feedback-visibility";

describe("feedbackRecipientVisibilityWhere", () => {
  it("does not restrict feedback visibility for team leaders", () => {
    expect(
      feedbackRecipientVisibilityWhere({
        isLeader: true,
        profileId: "profile-member",
      }),
    ).toEqual({});
  });

  it("limits member visibility to feedback shared with that member", () => {
    expect(
      feedbackRecipientVisibilityWhere({
        isLeader: false,
        profileId: "profile-member",
      }),
    ).toEqual({
      isShared: true,
      recipientId: "profile-member",
    });
  });
});
