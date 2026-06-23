import { Shield } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type LeaderBarProps = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children?: ReactNode;
  actionVisible?: boolean;
};

export function LeaderBar({
  href,
  icon: Icon,
  label,
  children,
  actionVisible = true,
}: LeaderBarProps) {
  const t = useTranslations("Teams");
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-accent/5 border border-accent/15 px-4 py-2.5">
      <div className="flex items-center gap-2 text-accent">
        <Shield className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold uppercase tracking-wide">
          {t("teamLead")}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={href}
          className={`overflow-hidden transition-[max-width,opacity,transform] duration-200 ${
            actionVisible
              ? "max-w-40 translate-x-0 opacity-100"
              : "pointer-events-none max-w-0 translate-x-1 opacity-0"
          }`}
          aria-hidden={!actionVisible}
          tabIndex={actionVisible ? undefined : -1}
        >
          <Button variant="primary" className="h-8 px-3 py-0 text-xs">
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Button>
        </Link>
        {children}
      </div>
    </div>
  );
}
