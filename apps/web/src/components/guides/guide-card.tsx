import Link from "next/link";
import { Play, FileText, Wrench, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RoleBadge } from "./role-badge";

type GuideCardProps = {
  id: string;
  title: string;
  category: "QUICK_START" | "TROUBLESHOOTING" | "SOP";
  roleName?: string | null;
};

const categoryIcons = {
  QUICK_START: Play,
  TROUBLESHOOTING: Wrench,
  SOP: FileText,
} as const;

const categoryColors = {
  QUICK_START: "text-accent",
  TROUBLESHOOTING: "text-text-secondary",
  SOP: "text-text-secondary",
} as const;

export function GuideCard({ id, title, category, roleName }: GuideCardProps) {
  const Icon = categoryIcons[category];
  const iconColor = categoryColors[category];

  return (
    <Link href={`/guides/${id}`}>
      <Card className="border border-transparent p-3.5 transition-colors hover:border-border hover:bg-bg-muted/30 hover:shadow-md cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-accent-light shrink-0">
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {title}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <RoleBadge roleName={roleName} />
            <ChevronRight className="w-4 h-4 text-text-tertiary" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
