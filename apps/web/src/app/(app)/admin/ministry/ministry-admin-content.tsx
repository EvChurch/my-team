"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { useTranslations } from "next-intl";
import {
  ChevronRight,
  Church,
  Lock,
  Mail,
  Phone,
  Search,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

type ScopeKind = "CHURCH" | "PURPOSE" | "CAMPUS" | "AREA" | "SERVING_TEAM";

type TreeNode = {
  id: string;
  kind: ScopeKind;
  name: string;
  sources: Array<{
    provider: "PCO" | "ROCK";
    remoteId: string;
    sourceGroupTypeId: number | null;
    sourceName: string;
  }>;
  leaders: Array<{
    id: string;
    roleName: string | null;
    person: {
      id: string;
      fullName: string;
      image?: string | null;
      email?: string | null;
      phone?: string | null;
    };
  }>;
  members: Array<{
    id: string;
    roleName: string | null;
    person: {
      id: string;
      fullName: string;
      image?: string | null;
      email?: string | null;
      phone?: string | null;
    };
  }>;
  children: TreeNode[];
};

function PersonRow({
  person,
  roleName,
}: {
  person: TreeNode["leaders"][number]["person"];
  roleName: string | null;
}) {
  const t = useTranslations("Teams");
  const phoneHref = person.phone
    ? `tel:${person.phone.replace(/[^\d+]/g, "")}`
    : null;

  return (
    <div className="flex items-center gap-2">
      <Avatar
        name={person.fullName}
        src={person.image}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-text-primary">
          {person.fullName}
        </p>
        {roleName && (
          <p className="truncate text-xs text-text-tertiary">
            {roleName}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {phoneHref ? (
          <a
            href={phoneHref}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary"
            aria-label={t("callPerson", { name: person.fullName })}
            title={t("callPerson", { name: person.fullName })}
          >
            <Phone className="h-4 w-4" />
          </a>
        ) : null}
        {person.email ? (
          <a
            href={`mailto:${person.email}`}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary"
            aria-label={t("emailPerson", { name: person.fullName })}
            title={t("emailPerson", { name: person.fullName })}
          >
            <Mail className="h-4 w-4" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function collectExpandedIds(nodes: TreeNode[], maxDepth = 2) {
  const ids = new Set<string>();
  const visit = (node: TreeNode, depth: number) => {
    if (node.children.length > 0 && depth < maxDepth) ids.add(node.id);
    node.children.forEach((child) => visit(child, depth + 1));
  };
  nodes.forEach((node) => visit(node, 0));
  return ids;
}

function findNode(nodes: TreeNode[], id: string | null): TreeNode | null {
  if (!id) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }
  return null;
}

function filterTree(nodes: TreeNode[], search: string): TreeNode[] {
  const query = search.trim().toLowerCase();
  if (!query) return nodes;

  return nodes
    .map((node) => {
      const children = filterTree(node.children, query);
      const matches =
        node.name.toLowerCase().includes(query) ||
        node.leaders.some((leader) =>
          leader.person.fullName.toLowerCase().includes(query),
        ) ||
        node.members.some((member) =>
          member.person.fullName.toLowerCase().includes(query),
        );

      if (!matches && children.length === 0) return null;
      return { ...node, children };
    })
    .filter((node): node is TreeNode => Boolean(node));
}

function CollapsibleTreeChildren({
  isExpanded,
  children,
}: {
  isExpanded: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity,transform] duration-200 ease-out ${
        isExpanded
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-1 opacity-0"
      }`}
      style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
      aria-hidden={!isExpanded}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function TreeRow({
  node,
  depth,
  isLast,
  expandedIds,
  selectedId,
  onToggle,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  isLast: boolean;
  expandedIds: Set<string>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations("AdminMinistry");
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;
  const handleSelect = () => {
    if (isSelected && hasChildren) {
      onToggle(node.id);
      return;
    }

    onSelect(node.id);
  };

  return (
    <li className="relative py-0.5">
      {depth > 0 && (
        <span
          className={`absolute left-[calc(var(--depth)*22px-11px)] top-0 hidden border-l border-border md:block ${
            isLast ? "h-5" : "bottom-0"
          }`}
          style={{ "--depth": depth } as CSSProperties}
        />
      )}
      <div
        className="relative"
        style={{ paddingLeft: depth === 0 ? 0 : depth * 22 }}
      >
        {depth > 0 && (
          <span
            className="absolute left-[calc(var(--depth)*22px-11px)] top-5 hidden w-4 border-t border-border md:block"
            style={{ "--depth": depth } as CSSProperties}
          />
        )}
        <div
          className={`group flex min-h-11 items-stretch gap-1 rounded-xl p-1 transition-[background-color,box-shadow,transform] duration-200 ease-out ${
            isSelected
              ? "bg-accent-light/70 text-text-primary shadow-sm"
              : "hover:bg-bg-muted/80 hover:shadow-sm"
          }`}
        >
          <button
            type="button"
            onClick={() => hasChildren && onToggle(node.id)}
            className={`flex w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
              hasChildren
                ? "text-text-secondary hover:bg-bg-card hover:text-text-primary"
                : "text-transparent"
            }`}
            aria-label={t("toggleScope", { name: node.name })}
            disabled={!hasChildren}
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform duration-200 ease-out ${
                hasChildren && isExpanded ? "rotate-90" : "rotate-0"
              }`}
            />
          </button>
          <button
            type="button"
            onClick={handleSelect}
            className="grid min-w-0 flex-1 items-center rounded-lg px-1.5 text-left transition-transform duration-150 ease-out active:translate-x-0.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">
                {node.name}
              </p>
            </div>
          </button>
        </div>
      </div>
      {hasChildren && (
        <CollapsibleTreeChildren isExpanded={isExpanded}>
        <ul>
          {node.children.map((child, index) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              isLast={index === node.children.length - 1}
              expandedIds={expandedIds}
              selectedId={selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
        </CollapsibleTreeChildren>
      )}
    </li>
  );
}

function ScopeDetail({ node }: { node: TreeNode }) {
  const t = useTranslations("AdminMinistry");

  return (
    <Card className="p-5">
      <div className="min-w-0">
        <h2 className="truncate text-xl font-bold text-text-primary">
          {node.name}
        </h2>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-text-primary">
          {t("leaders")}
        </h3>
        <div className="mt-3 space-y-2">
          {node.leaders.length > 0 ? (
            node.leaders.map((leader) => (
              <PersonRow
                key={leader.id}
                person={leader.person}
                roleName={leader.roleName}
              />
            ))
          ) : (
            <p className="text-sm text-text-tertiary">{t("noLeaders")}</p>
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-5">
        <h3 className="text-sm font-semibold text-text-primary">
          {t("members")}
        </h3>
        <div className="mt-3 space-y-2">
          {node.members.length > 0 ? (
            node.members.map((member) => (
              <PersonRow
                key={member.id}
                person={member.person}
                roleName={member.roleName}
              />
            ))
          ) : (
            <p className="text-sm text-text-tertiary">{t("noMembers")}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function MinistryTreeExplorer({ tree }: { tree: TreeNode[] }) {
  const t = useTranslations("AdminMinistry");
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    collectExpandedIds(tree),
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    tree[0]?.id ?? null,
  );
  const filteredTree = useMemo(() => filterTree(tree, search), [tree, search]);
  const visibleExpandedIds = search.trim()
    ? collectExpandedIds(filteredTree, 99)
    : expandedIds;
  const selectedNode =
    findNode(tree, selectedId) ?? filteredTree[0] ?? tree[0] ?? null;

  const toggle = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(520px,1fr)_360px]">
      <Card className="overflow-hidden">
        <div className="border-b border-border p-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-10 w-full rounded-xl border border-border bg-bg-page pl-9 pr-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-accent"
            />
          </label>
        </div>
        <div className="max-h-[72vh] overflow-auto p-3">
          {filteredTree.length > 0 ? (
            <ul className="min-w-[520px]">
              {filteredTree.map((node, index) => (
                <TreeRow
                  key={node.id}
                  node={node}
                  depth={0}
                  isLast={index === filteredTree.length - 1}
                  expandedIds={visibleExpandedIds}
                  selectedId={selectedNode?.id ?? null}
                  onToggle={toggle}
                  onSelect={setSelectedId}
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Search}
              title={t("noSearchResults")}
              description={t("noSearchResultsDescription")}
              className="py-10"
            />
          )}
        </div>
      </Card>

      <aside className="xl:sticky xl:top-10 xl:self-start">
        {selectedNode ? (
          <ScopeDetail node={selectedNode} />
        ) : (
          <EmptyState
            icon={Church}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        )}
      </aside>
    </div>
  );
}

export function MinistryAdminContent() {
  const trpc = useTRPC();
  const t = useTranslations("AdminMinistry");
  const treeQuery = useQuery({
    ...trpc.ministryHierarchy.adminTree.queryOptions(),
    retry: false,
  });
  const tree = (treeQuery.data ?? []) as TreeNode[];
  const errorCode = (treeQuery.error as { data?: { code?: string } } | null)
    ?.data?.code;

  if (treeQuery.isError) {
    if (errorCode !== "FORBIDDEN") {
      return (
        <ErrorState
          title={t("loadFailedTitle")}
          description={t("loadFailedDescription")}
          onRetry={() => void treeQuery.refetch()}
        />
      );
    }

    return (
      <EmptyState
        icon={Lock}
        title={t("forbiddenTitle")}
        description={t("forbiddenDescription")}
      />
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <div>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Church className="h-4 w-4 text-accent" />
          <span>{t("admin")}</span>
          <ChevronRight className="h-4 w-4" />
          <span>{t("title")}</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-text-primary">
          {t("title")}
        </h1>
      </div>

      {treeQuery.isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-24 rounded-2xl bg-bg-card" />
          <div className="h-24 rounded-2xl bg-bg-card" />
          <div className="h-24 rounded-2xl bg-bg-card" />
        </div>
      ) : tree.length > 0 ? (
        <MinistryTreeExplorer tree={tree} />
      ) : (
        <EmptyState
          icon={Church}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      )}
    </div>
  );
}
