import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type Member = {
  id: string;
  fullName: string;
  image?: string | null;
  role: string;
  isLeader: boolean;
};

type TeamMembersListProps = {
  members: Member[];
};

export function TeamMembersList({ members }: TeamMembersListProps) {
  if (members.length === 0) return null;

  return (
    <div className="space-y-3">
      {members.map((member) => (
        <div key={member.id} className="flex items-center gap-3">
          <Avatar name={member.fullName} src={member.image} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {member.fullName}
            </p>
          </div>
          <Badge variant={member.isLeader ? "accent" : "muted"}>
            {member.role}
          </Badge>
        </div>
      ))}
    </div>
  );
}
