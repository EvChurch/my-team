"use client";

import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@repo/api/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/guides/role-badge";
import { GuideContentRenderer } from "@/components/guides/guide-content-renderer";

type GuideDetailContentProps = {
  guideId: string;
};

export function GuideDetailContent({ guideId }: GuideDetailContentProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: guide } = useSuspenseQuery(
    trpc.guides.get.queryOptions({ guideId }),
  );
  const { data: teams } = useSuspenseQuery(trpc.teams.list.queryOptions());

  // Check if user is a leader of the guide's team
  const isLeader = teams.some((t) => t.id === guide.teamId && t.isLeader);

  const deleteMutation = useMutation(
    trpc.guides.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.guides.listAll.queryFilter().queryKey });
        router.push("/guides");
      },
    }),
  );

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div>
        <Link
          href="/guides"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Guides
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-text-primary">
              {guide.title}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <RoleBadge roleName={guide.role?.name} />
              <Badge variant={guide.status === "PUBLISHED" ? "accent" : "muted"}>
                {guide.status === "PUBLISHED" ? "Published" : "Draft"}
              </Badge>
            </div>
            {guide.author && (
              <p className="text-xs text-text-secondary mt-2">
                By {guide.author.fullName} &middot; {guide.team?.name}
              </p>
            )}
          </div>
          {isLeader && (
            <div className="flex items-center gap-2 shrink-0">
              <Link href={`/guides/${guideId}/edit`}>
                <Button variant="secondary" className="gap-1.5">
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
              </Link>
              <Button
                variant="danger"
                className="gap-1.5"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <Card className="p-5 md:p-8">
        <GuideContentRenderer content={guide.content} />
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="p-6 max-w-sm mx-4">
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              Delete Guide
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              Are you sure you want to delete &ldquo;{guide.title}&rdquo;? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={deleteMutation.isPending}
                onClick={() =>
                  deleteMutation.mutate({ teamId: guide.teamId, guideId })
                }
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
