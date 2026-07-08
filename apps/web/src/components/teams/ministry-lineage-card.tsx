"use client";

import { ChevronDown, Mail, Phone } from "lucide-react";
import { useTranslations } from "next-intl";

import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

type ScopeLeader = {
  id: string;
  roleName: string | null;
  person: {
    id: string;
    fullName: string;
    image?: string | null;
    email?: string | null;
    phone?: string | null;
  };
};

type LineageScope = {
  id: string;
  kind: "CHURCH" | "PURPOSE" | "CAMPUS" | "AREA" | "SERVING_TEAM";
  name: string;
  leaders: ScopeLeader[];
};

type MinistryLineageCardProps = {
  lineage: LineageScope[];
};

function ContactButtons({ leader }: { leader: ScopeLeader }) {
  const t = useTranslations("Teams");
  const phoneHref = leader.person.phone
    ? `tel:${leader.person.phone.replace(/[^\d+]/g, "")}`
    : null;

  return (
    <div className="flex shrink-0 items-center gap-1">
      {phoneHref ? (
        <a
          href={phoneHref}
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary"
          aria-label={t("callPerson", { name: leader.person.fullName })}
          title={t("callPerson", { name: leader.person.fullName })}
        >
          <Phone className="h-4 w-4" />
        </a>
      ) : (
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary/45"
          aria-label={t("callPerson", { name: leader.person.fullName })}
          title={t("callPerson", { name: leader.person.fullName })}
        >
          <Phone className="h-4 w-4" />
        </span>
      )}
      {leader.person.email ? (
        <a
          href={`mailto:${leader.person.email}`}
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary"
          aria-label={t("emailPerson", { name: leader.person.fullName })}
          title={t("emailPerson", { name: leader.person.fullName })}
        >
          <Mail className="h-4 w-4" />
        </a>
      ) : (
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary/45"
          aria-label={t("emailPerson", { name: leader.person.fullName })}
          title={t("emailPerson", { name: leader.person.fullName })}
        >
          <Mail className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}

export function MinistryLineageCard({ lineage }: MinistryLineageCardProps) {
  const t = useTranslations("Teams");

  if (lineage.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">
          {t("lineageTitle")}
        </h2>
      </div>

      <div className="space-y-2 sm:max-w-md">
        {lineage.map((scope, index) => (
          <div key={scope.id}>
            <Card className="p-4">
              <div className="space-y-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {scope.name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {t(`scopeKind.${scope.kind}`)}
                  </p>
                </div>

                {scope.leaders.length > 0 ? (
                  <div className="space-y-2">
                    {scope.leaders.map((leader) => (
                      <div
                        key={leader.id}
                        className="flex min-w-0 items-center gap-2 rounded-xl bg-bg-muted/70 px-2.5 py-2"
                      >
                        <Avatar
                          name={leader.person.fullName}
                          src={leader.person.image}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-text-primary">
                            {leader.person.fullName}
                          </p>
                          {leader.roleName && (
                            <p className="truncate text-xs text-text-tertiary">
                              {leader.roleName}
                            </p>
                          )}
                        </div>
                        <ContactButtons leader={leader} />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </Card>

            {index < lineage.length - 1 && (
              <div className="flex justify-center py-1 text-text-tertiary">
                <ChevronDown className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
