"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@mt/api/client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type NewGoalFormProps = {
  teams: { id: string; name: string }[];
  onClose: () => void;
};

export function NewGoalForm({ teams, onClose }: NewGoalFormProps) {
  const trpc = useTRPC();
  const tf = useTranslations("GoalForm");
  const tGoals = useTranslations("Goals");
  const tCommon = useTranslations("Common");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  const createGoal = useMutation(trpc.goals.create.mutationOptions());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError(tf("titleRequired"));
      return;
    }
    if (!teamId) {
      setError(tf("teamRequired"));
      return;
    }

    createGoal.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        teamId,
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: [["goals"]] });
          toast(tGoals("goalCreated"));
          onClose();
        },
        onError: (err) => {
          setError(err.message);
          toast(tGoals("goalCreateFailed"), "error");
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="goal-title"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          {tf("titleLabel")} <span className="text-error">*</span>
        </label>
        <input
          id="goal-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={tf("titlePlaceholder")}
          className="w-full rounded-[10px] border border-border bg-bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          maxLength={255}
        />
      </div>

      <div>
        <label
          htmlFor="goal-description"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          {tf("descriptionLabel")}
        </label>
        <textarea
          id="goal-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={tf("descriptionPlaceholder")}
          rows={3}
          className="w-full rounded-[10px] border border-border bg-bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
        />
      </div>

      <div>
        <label
          htmlFor="goal-due-date"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          {tf("dueDateLabel")}
        </label>
        <input
          id="goal-due-date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full rounded-[10px] border border-border bg-bg-card px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
        />
      </div>

      {teams.length > 1 && (
        <div>
          <label
            htmlFor="goal-team"
            className="block text-sm font-medium text-text-primary mb-1"
          >
            {tf("teamLabel")}
          </label>
          <select
            id="goal-team"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="w-full rounded-[10px] border border-border bg-bg-card px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p className="text-sm text-error">{error}</p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={createGoal.isPending}>
          {createGoal.isPending ? tf("creating") : tf("createGoal")}
        </Button>
      </div>
    </form>
  );
}
