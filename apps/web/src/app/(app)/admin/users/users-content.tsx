"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronRight,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

type ProfileOption = {
  id: string;
  displayName: string;
  email?: string | null;
  image?: string | null;
  isAdmin: boolean;
};

function AdminUserForm({
  onCancel,
  onAdded,
}: {
  onCancel: () => void;
  onAdded: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const t = useTranslations("AdminUsers");
  const [search, setSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileOption | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchQuery = useQuery({
    ...trpc.ministryHierarchy.searchAdminProfiles.queryOptions({ search }),
    enabled: search.trim().length >= 2,
  });
  const addAdmin = useMutation(
    trpc.ministryHierarchy.addAdminUser.mutationOptions({
      onSuccess: async () => {
        setErrorMessage(null);
        setSelectedProfile(null);
        setSearch("");
        setIsSearchOpen(false);
        await queryClient.invalidateQueries(
          trpc.ministryHierarchy.adminUsers.queryFilter(),
        );
        onAdded();
      },
      onError: (error) => setErrorMessage(error.message),
    }),
  );

  return (
    <div className="rounded-xl border border-border bg-bg-page p-3">
      <div className="relative">
        <div className="flex h-11 items-center gap-2 rounded-lg bg-bg-card px-2">
          {selectedProfile ? (
            <>
              <button
                type="button"
                onClick={() => setIsSearchOpen((current) => !current)}
                className="flex h-full min-w-0 flex-1 items-center gap-2 text-left"
                aria-expanded={isSearchOpen}
              >
                <Avatar
                  name={selectedProfile.displayName}
                  src={selectedProfile.image}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm leading-5 text-text-primary">
                    {selectedProfile.displayName}
                  </span>
                  {selectedProfile.email ? (
                    <span className="block truncate text-xs leading-4 text-text-tertiary">
                      {selectedProfile.email}
                    </span>
                  ) : null}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedProfile(null);
                  setSearch("");
                  setIsSearchOpen(false);
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary"
                aria-label={t("clearSelectedProfile", {
                  name: selectedProfile.displayName,
                })}
                title={t("clearSelectedProfile", {
                  name: selectedProfile.displayName,
                })}
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
                placeholder={t("searchPlaceholder")}
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
            aria-label={t("searchPlaceholder")}
            title={t("searchPlaceholder")}
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
            {searchQuery.data && searchQuery.data.length > 0 ? (
              searchQuery.data.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setSelectedProfile(profile);
                    setSearch(profile.displayName);
                    setIsSearchOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors ${
                    selectedProfile?.id === profile.id
                      ? "bg-accent-light text-text-primary"
                      : "hover:bg-bg-muted"
                  }`}
                >
                  <Avatar
                    name={profile.displayName}
                    src={profile.image}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-text-primary">
                      {profile.displayName}
                    </span>
                    {profile.email ? (
                      <span className="block truncate text-xs text-text-tertiary">
                        {profile.email}
                      </span>
                    ) : null}
                  </span>
                  {profile.isAdmin ? (
                    <span className="shrink-0 rounded-full bg-accent-light px-2 py-0.5 text-[10px] font-semibold uppercase text-accent">
                      {t("alreadyAdmin")}
                    </span>
                  ) : null}
                </button>
              ))
            ) : !searchQuery.isLoading ? (
              <p className="px-2 py-2 text-xs text-text-tertiary">
                {t("noResults")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="mt-3 text-sm text-error">{errorMessage}</p>
      ) : null}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[10px] px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-muted"
        >
          {t("cancelAdd")}
        </button>
        <button
          type="button"
          disabled={
            !selectedProfile || selectedProfile.isAdmin || addAdmin.isPending
          }
          onClick={() => {
            if (!selectedProfile) return;
            addAdmin.mutate({ profileId: selectedProfile.id });
          }}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-accent px-3 py-2 text-sm font-semibold text-text-on-accent transition-colors hover:bg-accent-dark disabled:pointer-events-none disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {t("addAdmin")}
        </button>
      </div>
    </div>
  );
}

function AddAdminModal({
  onCancel,
  onAdded,
}: {
  onCancel: () => void;
  onAdded: () => void;
}) {
  const t = useTranslations("AdminUsers");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-admin-modal-title"
      onClick={onCancel}
    >
      <Card
        className="max-h-[min(720px,calc(100vh-3rem))] w-full max-w-md overflow-visible p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            id="add-admin-modal-title"
            className="min-w-0 truncate text-lg font-semibold text-text-primary"
          >
            {t("addAdmin")}
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
          <AdminUserForm onCancel={onCancel} onAdded={onAdded} />
        </div>
      </Card>
    </div>
  );
}

function AdminUsersList({
  admins,
}: {
  admins: Array<{
    id: string;
    profileId: string;
    profile: {
      displayName: string;
      email: string | null;
      image: string | null;
    };
  }>;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const t = useTranslations("AdminUsers");
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const refreshAdmins = () => {
    setIsAdding(false);
    void queryClient.invalidateQueries(
      trpc.ministryHierarchy.adminUsers.queryFilter(),
    );
  };
  const removeAdmin = useMutation(
    trpc.ministryHierarchy.removeAdminUser.mutationOptions({
      onSuccess: () => {
        setErrorMessage(null);
        refreshAdmins();
      },
      onError: (error) => setErrorMessage(error.message),
    }),
  );

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-text-primary">
          {t("currentAdmins")}
        </h2>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-muted hover:text-text-primary"
          aria-label={t("addAdmin")}
          title={t("addAdmin")}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {errorMessage ? (
        <p className="mt-3 text-sm text-error">{errorMessage}</p>
      ) : null}

      <div className="mt-4 space-y-2">
        {admins.map((admin) => (
          <div
            key={admin.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-bg-page p-3"
          >
            <Avatar
              name={admin.profile.displayName}
              src={admin.profile.image}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">
                {admin.profile.displayName}
              </p>
              {admin.profile.email ? (
                <p className="truncate text-xs text-text-tertiary">
                  {admin.profile.email}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={admins.length <= 1 || removeAdmin.isPending}
              onClick={() => removeAdmin.mutate({ profileId: admin.profileId })}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-error/10 hover:text-error disabled:pointer-events-none disabled:opacity-40"
              aria-label={t("removeAdmin", {
                name: admin.profile.displayName,
              })}
              title={t("removeAdmin", { name: admin.profile.displayName })}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      {isAdding ? (
        <AddAdminModal
          onCancel={() => setIsAdding(false)}
          onAdded={refreshAdmins}
        />
      ) : null}
    </Card>
  );
}

export function AdminUsersContent() {
  const trpc = useTRPC();
  const t = useTranslations("AdminUsers");
  const usersQuery = useQuery({
    ...trpc.ministryHierarchy.adminUsers.queryOptions(),
    retry: false,
  });
  const errorCode = (usersQuery.error as { data?: { code?: string } } | null)
    ?.data?.code;

  if (usersQuery.isError) {
    if (errorCode !== "FORBIDDEN") {
      return (
        <ErrorState
          title={t("loadFailedTitle")}
          description={t("loadFailedDescription")}
          onRetry={() => void usersQuery.refetch()}
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

  const admins = usersQuery.data ?? [];

  return (
    <div className="space-y-5 pb-8">
      <div>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <ShieldCheck className="h-4 w-4 text-accent" />
          <span>{t("admin")}</span>
          <ChevronRight className="h-4 w-4" />
          <span>{t("title")}</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-text-primary">
          {t("title")}
        </h1>
      </div>

      {usersQuery.isLoading ? (
        <div className="animate-pulse">
          <div className="h-80 rounded-2xl bg-bg-card" />
        </div>
      ) : (
        <AdminUsersList admins={admins} />
      )}
    </div>
  );
}
