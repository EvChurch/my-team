import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ teamId: string }>;
};

export default async function TeamTrainingRedirectPage({ params }: Props) {
  const { teamId } = await params;
  redirect(`/teams/${teamId}?tab=training&trainingMode=manage`);
}
