import { Check, Clock, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type RosterMember = {
  id: string;
  name: string | null;
  position: string | null;
  status: string;
  photoThumbnail: string | null;
  personPcoId: string | null;
};

type TeamGroup = {
  teamId: string;
  teamName: string;
  members: RosterMember[];
};

type PlanRosterProps = {
  roster: TeamGroup[];
  currentUserPcoId: string | null;
};

const statusConfig: Record<
  string,
  { icon: typeof Check; labelKey: string; className: string }
> = {
  Confirmed: { icon: Check, labelKey: "confirmed", className: "text-accent" },
  Unconfirmed: {
    icon: Clock,
    labelKey: "unconfirmed",
    className: "text-text-tertiary",
  },
  Declined: { icon: X, labelKey: "declined", className: "text-error" },
};

export function PlanRoster({ roster, currentUserPcoId }: PlanRosterProps) {
  const t = useTranslations("Plans");
  if (roster.length === 0) return null;

  return (
    <div className="space-y-3">
        {roster.map((group) => (
          <Card key={group.teamId} className="p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              {group.teamName}
            </h3>
            <div className="space-y-2.5">
              {group.members.map((member) => {
                const isCurrentUser =
                  currentUserPcoId != null &&
                  member.personPcoId === currentUserPcoId;
                const config = statusConfig[member.status] ??
                  statusConfig.Unconfirmed!;
                const StatusIcon = config.icon;

                return (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between gap-3 rounded-lg py-2 px-3 ${
                      isCurrentUser
                        ? "bg-accent/5 ring-1 ring-accent/20"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        src={member.photoThumbnail}
                        name={member.name ?? "?"}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-text-primary truncate">
                          {member.name ?? t("unknown")}
                          {isCurrentUser && (
                            <span className="text-xs text-accent ml-1.5">
                              {t("youLabel")}
                            </span>
                          )}
                        </p>
                        {member.position && (
                          <Badge
                            variant="muted"
                            className="mt-0.5 text-[10px]"
                          >
                            {member.position}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <StatusIcon
                        className={`w-3.5 h-3.5 ${config.className}`}
                      />
                      <span className={`text-xs ${config.className}`}>
                        {t(config.labelKey)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
    </div>
  );
}
