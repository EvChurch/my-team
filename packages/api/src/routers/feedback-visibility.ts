export function feedbackRecipientVisibilityWhere({
  isLeader,
  profileId,
}: {
  isLeader: boolean;
  profileId: string;
}) {
  if (isLeader) return {};

  return {
    isShared: true,
    recipientId: profileId,
  };
}
