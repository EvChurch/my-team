"use client";

import { useState } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@repo/api/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, Wrench, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { GuideEditor } from "@/components/guides/guide-editor";
import { useToast } from "@/components/ui/toast";

type GuideCreateContentProps = {
  teamId: string;
};

const CATEGORIES = [
  { value: "QUICK_START" as const, label: "Quick Start", icon: Play },
  { value: "TROUBLESHOOTING" as const, label: "Troubleshooting", icon: Wrench },
  { value: "SOP" as const, label: "SOP", icon: FileText },
];

export function GuideCreateContent({ teamId }: GuideCreateContentProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: team } = useSuspenseQuery(
    trpc.teams.get.queryOptions({ teamId }),
  );

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<"QUICK_START" | "TROUBLESHOOTING" | "SOP">("QUICK_START");
  const [content, setContent] = useState<unknown>(null);
  const [roleId, setRoleId] = useState<string>("");
  const [isVisibleToTeam, setIsVisibleToTeam] = useState(true);

  const createMutation = useMutation(
    trpc.guides.create.mutationOptions({
      onSuccess: (guide) => {
        queryClient.invalidateQueries({ queryKey: trpc.guides.listAll.queryOptions().queryKey });
        toast("Guide saved as draft");
        router.push(`/guides/${guide.id}`);
      },
      onError: () => {
        toast("Failed to create guide", "error");
      },
    }),
  );

  const publishMutation = useMutation(
    trpc.guides.publish.mutationOptions({
      onSuccess: (guide) => {
        queryClient.invalidateQueries({ queryKey: trpc.guides.listAll.queryOptions().queryKey });
        toast("Guide published");
        router.push(`/guides/${guide.id}`);
      },
      onError: () => {
        toast("Failed to publish guide", "error");
      },
    }),
  );

  const handleSaveDraft = () => {
    if (!title.trim()) return;
    createMutation.mutate({
      teamId,
      title: title.trim(),
      content: content ?? { type: "doc", content: [{ type: "paragraph" }] },
      category,
      roleId: roleId || undefined,
      isVisibleToTeam,
    });
  };

  const handlePublish = async () => {
    if (!title.trim()) return;
    createMutation.mutate(
      {
        teamId,
        title: title.trim(),
        content: content ?? { type: "doc", content: [{ type: "paragraph" }] },
        category,
        roleId: roleId || undefined,
        isVisibleToTeam,
      },
      {
        onSuccess: (guide) => {
          publishMutation.mutate({ teamId, guideId: guide.id });
        },
      },
    );
  };

  const isSaving = createMutation.isPending || publishMutation.isPending;

  // Get positions for role selector
  const positions = team.positions ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/guides"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Guides
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">New Guide</h1>
        <p className="text-sm text-text-secondary mt-0.5">{team.name}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Main editor area */}
        <div className="flex-1 space-y-4">
          {/* Category chips */}
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = category === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent text-text-on-accent"
                      : "bg-bg-muted text-text-secondary hover:bg-border"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Title */}
          <input
            type="text"
            placeholder="Guide title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xl font-semibold text-text-primary placeholder:text-text-tertiary bg-transparent outline-none"
          />

          {/* Editor */}
          <GuideEditor content={null} onChange={setContent} />
        </div>

        {/* Desktop right panel */}
        <div className="hidden md:block w-72 space-y-4 shrink-0">
          <Card className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">
              Guide Details
            </h3>

            {/* Role selector */}
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">
                Role
              </label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-card text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="">All Roles</option>
                {positions.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.name}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">
              Visibility
            </h3>
            <Toggle
              checked={isVisibleToTeam}
              onChange={setIsVisibleToTeam}
              label="Visible to team"
            />
          </Card>
        </div>
      </div>

      {/* Mobile role selector + visibility */}
      <div className="md:hidden space-y-4">
        <Card className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">
              Role
            </label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-card text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="">All Roles</option>
              {positions.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.name}
                </option>
              ))}
            </select>
          </div>
          <Toggle
            checked={isVisibleToTeam}
            onChange={setIsVisibleToTeam}
            label="Visible to team"
          />
        </Card>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 sticky bottom-20 md:bottom-4 bg-bg-page py-3">
        <Button
          variant="secondary"
          onClick={handleSaveDraft}
          disabled={isSaving || !title.trim()}
        >
          {createMutation.isPending ? "Saving..." : "Save Draft"}
        </Button>
        <Button
          onClick={handlePublish}
          disabled={isSaving || !title.trim()}
        >
          {publishMutation.isPending ? "Publishing..." : "Publish"}
        </Button>
      </div>
    </div>
  );
}
