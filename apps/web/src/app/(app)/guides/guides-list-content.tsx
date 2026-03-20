"use client";

import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollFade } from "@/components/ui/scroll-fade";
import { GuideCard } from "@/components/guides/guide-card";

type GuidesListContentProps = {
  isLeader: boolean;
  firstTeamId?: string;
};

export function GuidesListContent({ isLeader, firstTeamId }: GuidesListContentProps) {
  const trpc = useTRPC();
  const { data: guides } = useSuspenseQuery(
    trpc.guides.listAll.queryOptions(),
  );
  const [search, setSearch] = useState("");

  const filtered = guides.filter(
    (g) => g.title.toLowerCase().includes(search.toLowerCase()),
  );

  const quickStartGuides = filtered.filter((g) => g.category === "QUICK_START");
  const sopGuides = filtered.filter((g) => g.category === "SOP");
  const troubleshootingGuides = filtered.filter((g) => g.category === "TROUBLESHOOTING");

  if (guides.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No Guides Yet"
        description="Guides help your team learn processes and best practices."
        action={
          isLeader && firstTeamId ? (
            <Link href={`/teams/${firstTeamId}/guides/new`}>
              <Button>Create Guide</Button>
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Mobile scroll fade */}
      <div className="fixed bottom-[62px] left-0 right-0 md:hidden">
        <ScrollFade />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="text"
          placeholder="Search guides..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-bg-muted text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {/* Quick Start section */}
      {quickStartGuides.length > 0 && (
        <GuideSection title="QUICK START" guides={quickStartGuides} />
      )}

      {/* SOP section */}
      {sopGuides.length > 0 && (
        <GuideSection title="STANDARD OPERATING PROCEDURES" guides={sopGuides} />
      )}

      {/* Troubleshooting section */}
      {troubleshootingGuides.length > 0 && (
        <GuideSection title="TROUBLESHOOTING" guides={troubleshootingGuides} />
      )}

      {filtered.length === 0 && search && (
        <p className="text-center text-sm text-text-secondary py-8">
          No guides match &ldquo;{search}&rdquo;
        </p>
      )}
    </div>
  );
}

function GuideSection({
  title,
  guides,
}: {
  title: string;
  guides: Array<{
    id: string;
    title: string;
    category: "QUICK_START" | "TROUBLESHOOTING" | "SOP";
    status: string;
    role: { id: string; name: string | null } | null;
  }>;
}) {
  return (
    <section>
      <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
        {title}
      </h2>
      <div className="space-y-2">
        {guides.map((guide) => (
          <GuideCard
            key={guide.id}
            id={guide.id}
            title={guide.title}
            category={guide.category}
            roleName={guide.role?.name}
            status={guide.status}
          />
        ))}
      </div>
    </section>
  );
}
