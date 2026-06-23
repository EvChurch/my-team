"use client";

import { useRef, useState } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuideEditor } from "@/components/guides/guide-editor";
import {
  GuideCategorySelect,
  type GuideCategory,
} from "@/components/guides/guide-category-select";
import { GuideRoleSelect } from "@/components/guides/guide-role-select";
import { MobileCompactGuideHeader } from "@/components/guides/mobile-compact-guide-header";
import { useToast } from "@/components/ui/toast";

type GuideCreateContentProps = {
  teamId: string;
};

export function GuideCreateContent({ teamId }: GuideCreateContentProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const t = useTranslations("Guides");
  const tCommon = useTranslations("Common");
  const headerSentinelRef = useRef<HTMLDivElement>(null);

  const { data: team } = useSuspenseQuery(
    trpc.teams.get.queryOptions({ teamId }),
  );

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<GuideCategory>("QUICK_START");
  const [content, setContent] = useState<unknown>(null);
  const [roleId, setRoleId] = useState<string>("");
  const [isRedirecting, setIsRedirecting] = useState(false);

  const createMutation = useMutation(
    trpc.guides.create.mutationOptions({
      onSuccess: (guide) => {
        setIsRedirecting(true);
        queryClient.invalidateQueries({ queryKey: trpc.guides.listAll.queryOptions().queryKey });
        queryClient.invalidateQueries({
          queryKey: trpc.teams.get.queryOptions({ teamId }).queryKey,
        });
        toast(t("guideSaved"));
        router.push(`/teams/${teamId}/guides/${guide.id}`);
      },
      onError: () => {
        toast(t("guideSaveFailed"), "error");
      },
    }),
  );

  const handleSave = () => {
    if (!title.trim()) return;
    createMutation.mutate({
      teamId,
      title: title.trim(),
      content: content ?? { type: "doc", content: [{ type: "paragraph" }] },
      category,
      roleId: roleId || undefined,
      isVisibleToTeam: true,
    });
  };

  const isSaving = createMutation.isPending || isRedirecting;
  const teamGuidesHref = `/teams/${teamId}?tab=guides`;

  // Get positions for role selector
  const positions = team.positions ?? [];

  return (
    <div className="space-y-5">
      <MobileCompactGuideHeader
        backHref={teamGuidesHref}
        backLabel={team.name}
        title={title.trim() || t("newGuide")}
        sentinelRef={headerSentinelRef}
      />

      <div ref={headerSentinelRef}>
        <Link
          href={teamGuidesHref}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          {team.name}
        </Link>
        <input
          type="text"
          placeholder={t("guideTitlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label={t("guideTitlePlaceholder")}
          className="block w-full bg-transparent text-2xl font-bold text-text-primary placeholder:text-text-tertiary outline-none"
        />
        <p className="text-sm text-text-secondary mt-0.5">{team.name}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <GuideCategorySelect value={category} onChange={setCategory} />
        <GuideRoleSelect
          value={roleId}
          onChange={setRoleId}
          positions={positions}
        />
      </div>

      <GuideEditor content={null} teamId={teamId} onChange={setContent} />

      <div className="rounded-xl border border-border bg-bg-page/95 px-4 py-3 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-end gap-2">
          <Link href={teamGuidesHref}>
            <Button type="button" variant="secondary">
              {tCommon("cancel")}
            </Button>
          </Link>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
          >
            {isSaving ? t("saving") : t("createGuide")}
          </Button>
        </div>
      </div>
    </div>
  );
}
