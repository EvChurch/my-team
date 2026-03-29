import Link from "next/link";
import { MessageSquarePlus, Target, BookPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

type LeaderActionsProps = {
  teamId: string;
  pendingGoalsCount?: number;
};

export function LeaderActions({ teamId, pendingGoalsCount = 0 }: LeaderActionsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 md:-mx-0 md:px-0">
      <Link href={`/teams/${teamId}/feedback/new`}>
        <Button variant="primary" className="text-xs shrink-0">
          <MessageSquarePlus className="w-4 h-4" />
          Write Feedback
        </Button>
      </Link>
      <Link href={`/teams/${teamId}/goals/review`}>
        <Button variant="secondary" className="text-xs shrink-0">
          <Target className="w-4 h-4" />
          Review Goals{pendingGoalsCount > 0 ? ` (${pendingGoalsCount})` : ""}
        </Button>
      </Link>
      <Link href={`/teams/${teamId}/guides/new`}>
        <Button variant="secondary" className="text-xs shrink-0">
          <BookPlus className="w-4 h-4" />
          New Guide
        </Button>
      </Link>
    </div>
  );
}
