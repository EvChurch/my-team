"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronRight,
  Church,
  Circle,
  Lock,
  Mail,
  Phone,
  Plus,
  Search,
  X,
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
    source: "SYNCED" | "MY_TEAM";
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
    source: "SYNCED" | "MY_TEAM";
    person: {
      id: string;
      fullName: string;
      image?: string | null;
      email?: string | null;
      phone?: string | null;
    };
  }>;
  roleOptions: Array<{
    id: string;
    name: string;
  }>;
  children: TreeNode[];
};

type PersonOption = {
  id: string;
  fullName: string;
  image?: string | null;
  email?: string | null;
};

function PersonRow({
  person,
  roleName,
  source,
  onRemove,
}: {
  person: TreeNode["leaders"][number]["person"];
  roleName: string | null;
  source: "SYNCED" | "MY_TEAM";
  onRemove?: () => void;
}) {
  const t = useTranslations("Teams");
  const tAdmin = useTranslations("AdminMinistry");
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
        {source === "MY_TEAM" && (
          <span className="rounded-full bg-accent-light px-2 py-0.5 text-[10px] font-semibold uppercase text-accent">
            {tAdmin("myTeamSource")}
          </span>
        )}
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
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-error/10 hover:text-error"
            aria-label={tAdmin("removePerson", { name: person.fullName })}
            title={tAdmin("removePerson", { name: person.fullName })}
          >
            <X className="h-4 w-4" />
          </button>
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

function AddPersonForm({
  node,
  kind,
  onCancel,
  onAdded,
}: {
  node: TreeNode;
  kind: "leader" | "member";
  onCancel: () => void;
  onAdded: () => void;
}) {
  const trpc = useTRPC();
  const t = useTranslations("AdminMinistry");
  const [search, setSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonOption | null>(null);
  const [isLeaderSelected, setIsLeaderSelected] = useState(kind === "leader");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const peopleQuery = useQuery({
    ...trpc.ministryHierarchy.searchPeople.queryOptions({ search }),
    enabled: search.trim().length >= 2,
  });
  const addLeader = useMutation(
    trpc.ministryHierarchy.addLocalLeader.mutationOptions(),
  );
  const addMember = useMutation(
    trpc.ministryHierarchy.addLocalMember.mutationOptions(),
  );
  const isPending = isSubmitting || addLeader.isPending || addMember.isPending;

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((current) =>
      current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId],
    );
  };

  const submit = async () => {
    if (!selectedPerson) return;

    const shouldAddLeader = isLeaderSelected;
    const shouldAddMember =
      selectedRoleIds.length > 0 || !isLeaderSelected || kind === "member";

    setIsSubmitting(true);
    try {
      if (shouldAddLeader) {
        await addLeader.mutateAsync({
          teamId: node.id,
          personId: selectedPerson.id,
        });
      }

      if (shouldAddMember) {
        await addMember.mutateAsync({
          teamId: node.id,
          personId: selectedPerson.id,
          roleIds: selectedRoleIds,
        });
      }

      onAdded();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-bg-page p-3">
      <div className="relative">
        <div className="flex h-11 items-center gap-2 rounded-lg bg-bg-card px-2">
          {selectedPerson ? (
            <>
              <button
                type="button"
                onClick={() => setIsSearchOpen((current) => !current)}
                className="flex h-full min-w-0 flex-1 items-center gap-2 text-left"
                aria-expanded={isSearchOpen}
              >
                <Avatar
                  name={selectedPerson.fullName}
                  src={selectedPerson.image}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm leading-5 text-text-primary">
                    {selectedPerson.fullName}
                  </span>
                  {selectedPerson.email ? (
                    <span className="block truncate text-xs leading-4 text-text-tertiary">
                      {selectedPerson.email}
                    </span>
                  ) : null}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedPerson(null);
                  setSearch("");
                  setIsSearchOpen(false);
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary"
                aria-label={t("removePerson", { name: selectedPerson.fullName })}
                title={t("removePerson", { name: selectedPerson.fullName })}
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Search className="h-4 w-4 shrink-0 text-text-tertiary" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder={t("personSearchPlaceholder")}
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
                role="combobox"
                aria-expanded={isSearchOpen && search.trim().length >= 2}
                aria-autocomplete="list"
              />
            </>
          )}
          <button
            type="button"
            onClick={() => setIsSearchOpen((current) => !current)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary"
            aria-label={t("personSearchPlaceholder")}
            title={t("personSearchPlaceholder")}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                isSearchOpen ? "rotate-180" : "rotate-0"
              }`}
            />
          </button>
        </div>

        {isSearchOpen && search.trim().length >= 2 ? (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-xl border border-border bg-bg-card p-1 shadow-[var(--shadow-card)]">
            {peopleQuery.data && peopleQuery.data.length > 0 ? (
              peopleQuery.data.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setSelectedPerson(person);
                    setSearch(person.fullName);
                    setIsSearchOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors ${
                    selectedPerson?.id === person.id
                      ? "bg-accent-light text-text-primary"
                      : "hover:bg-bg-muted"
                  }`}
                >
                  <Avatar name={person.fullName} src={person.image} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-text-primary">
                      {person.fullName}
                    </span>
                    {person.email ? (
                      <span className="block truncate text-xs text-text-tertiary">
                        {person.email}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))
            ) : !peopleQuery.isLoading ? (
              <p className="px-2 py-2 text-xs text-text-tertiary">
                {t("noPeopleResults")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <p className="text-xs font-semibold uppercase text-text-tertiary">
          {t("roles")}
        </p>
        <div className="mt-2 space-y-1">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-bg-muted">
            <input
              type="checkbox"
              checked={isLeaderSelected}
              onChange={() => setIsLeaderSelected((current) => !current)}
              className="h-4 w-4 accent-accent"
            />
            <span className="text-sm text-text-primary">
              {t("leaderRole")}
            </span>
          </label>
          {node.roleOptions.map((role) => (
            <label
              key={role.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-bg-muted"
            >
              <input
                type="checkbox"
                checked={selectedRoleIds.includes(role.id)}
                onChange={() => toggleRole(role.id)}
                className="h-4 w-4 accent-accent"
              />
              <span className="text-sm text-text-primary">{role.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[10px] px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-muted"
        >
          {t("cancelAdd")}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!selectedPerson || isPending}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-accent px-3 py-2 text-sm font-semibold text-text-on-accent transition-colors hover:bg-accent-dark disabled:pointer-events-none disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {t("addPerson")}
        </button>
      </div>
    </div>
  );
}

function AddPersonModal({
  node,
  kind,
  onCancel,
  onAdded,
}: {
  node: TreeNode;
  kind: "leader" | "member";
  onCancel: () => void;
  onAdded: () => void;
}) {
  const t = useTranslations("AdminMinistry");
  const title = t("addPerson");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-person-modal-title"
      onClick={onCancel}
    >
      <Card
        className="max-h-[min(720px,calc(100vh-3rem))] w-full max-w-md overflow-visible p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            id="add-person-modal-title"
            className="min-w-0 truncate text-lg font-semibold text-text-primary"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary"
            aria-label={t("cancelAdd")}
            title={t("cancelAdd")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4">
          <AddPersonForm
            node={node}
            kind={kind}
            onCancel={onCancel}
            onAdded={onAdded}
          />
        </div>
      </Card>
    </div>
  );
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
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggle(node.id)}
              className="flex w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary"
              aria-label={t("toggleScope", { name: node.name })}
            >
              <ChevronRight
                className={`h-4 w-4 transition-transform duration-200 ease-out ${
                  isExpanded ? "rotate-90" : "rotate-0"
                }`}
              />
            </button>
          ) : (
            <span
              className="flex w-8 shrink-0 items-center justify-center text-text-tertiary/55"
              aria-hidden="true"
            >
              <Circle className="h-1.5 w-1.5 fill-current" />
            </span>
          )}
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

function ScopeDetail({
  node,
  className = "",
}: {
  node: TreeNode;
  className?: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const t = useTranslations("AdminMinistry");
  const [adding, setAdding] = useState<"leader" | "member" | null>(null);
  const refreshTree = () => {
    setAdding(null);
    void queryClient.invalidateQueries(
      trpc.ministryHierarchy.adminTree.queryFilter(),
    );
  };
  const removeLeader = useMutation(
    trpc.ministryHierarchy.removeLocalLeader.mutationOptions({
      onSuccess: refreshTree,
    }),
  );
  const removeMember = useMutation(
    trpc.ministryHierarchy.removeLocalMember.mutationOptions({
      onSuccess: refreshTree,
    }),
  );

  return (
    <>
      <Card className={`p-5 ${className}`}>
      <div className="min-w-0">
        <h2 className="truncate text-xl font-bold text-text-primary">
          {node.name}
        </h2>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-text-primary">
            {t("leaders")}
          </h3>
          <button
            type="button"
            onClick={() => setAdding("leader")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary"
            aria-label={t("addLeader")}
            title={t("addLeader")}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {node.leaders.length > 0 ? (
            node.leaders.map((leader) => (
              <PersonRow
                key={leader.id}
                person={leader.person}
                roleName={leader.roleName}
                source={leader.source}
                onRemove={
                  leader.source === "MY_TEAM"
                    ? () =>
                        removeLeader.mutate({
                          teamId: node.id,
                          localLeaderId: leader.id,
                        })
                    : undefined
                }
              />
            ))
          ) : (
            <p className="text-sm text-text-tertiary">{t("noLeaders")}</p>
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-text-primary">
            {t("members")}
          </h3>
          <button
            type="button"
            onClick={() => setAdding("member")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary"
            aria-label={t("addMember")}
            title={t("addMember")}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {node.members.length > 0 ? (
            node.members.map((member) => (
              <PersonRow
                key={member.id}
                person={member.person}
                roleName={member.roleName}
                source={member.source}
                onRemove={
                  member.source === "MY_TEAM"
                    ? () =>
                        removeMember.mutate({
                          teamId: node.id,
                          localMemberId: member.id,
                        })
                    : undefined
                }
              />
            ))
          ) : (
            <p className="text-sm text-text-tertiary">{t("noMembers")}</p>
          )}
        </div>
      </div>
      </Card>
      {adding ? (
        <AddPersonModal
          node={node}
          kind={adding}
          onCancel={() => setAdding(null)}
          onAdded={refreshTree}
        />
      ) : null}
    </>
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
    <div className="grid gap-4 xl:grid-cols-[minmax(520px,1fr)_360px] xl:items-stretch">
      <Card className="flex min-h-0 flex-col overflow-hidden xl:max-h-[calc(100vh-12rem)]">
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
        <div className="min-h-0 max-h-[72vh] flex-1 overflow-auto p-3">
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

      <aside className="xl:sticky xl:top-10 xl:min-h-0">
        {selectedNode ? (
          <ScopeDetail
            node={selectedNode}
            className="xl:max-h-[calc(100vh-12rem)] xl:overflow-auto"
          />
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
