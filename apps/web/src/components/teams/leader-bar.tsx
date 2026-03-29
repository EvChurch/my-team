import { Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type LeaderBarProps = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
};

export function LeaderBar({ href, icon: Icon, label }: LeaderBarProps) {
  const t = useTranslations("Teams");
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-accent/5 border border-accent/15 px-4 py-2.5">
      <div className="flex items-center gap-2 text-accent">
        <Shield className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold uppercase tracking-wide">
          {t("teamLead")}
        </span>
      </div>
      <Link href={href}>
        <Button variant="primary" className="text-xs px-3 py-1.5">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </Button>
      </Link>
    </div>
  );
}
