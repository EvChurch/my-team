"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@repo/api/client";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";

type Member = {
  id: string;
  fullName: string;
  image?: string | null;
  role: string;
};

type FeedbackFormProps = {
  teamId: string;
  members: Member[];
};

const feedbackTypes = [
  { value: "ENCOURAGEMENT" as const, label: "Encouragement", color: "var(--accent)" },
  { value: "GROWTH_AREA" as const, label: "Growth Area", color: "var(--coral)" },
  { value: "GENERAL" as const, label: "General", color: "var(--text-secondary)" },
];

export function FeedbackForm({ teamId, members }: FeedbackFormProps) {
  const trpc = useTRPC();
  const router = useRouter();

  const [recipientId, setRecipientId] = useState("");
  const [type, setType] = useState<"ENCOURAGEMENT" | "GROWTH_AREA" | "GENERAL">("ENCOURAGEMENT");
  const [content, setContent] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createFeedback = useMutation(trpc.feedback.create.mutationOptions());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!recipientId) {
      setError("Please select a team member.");
      return;
    }
    if (!content.trim()) {
      setError("Please write some feedback.");
      return;
    }

    createFeedback.mutate(
      {
        teamId,
        recipientId,
        type,
        content: content.trim(),
        isShared,
      },
      {
        onSuccess: () => {
          router.push("/goals?tab=feedback");
        },
        onError: (err) => {
          setError(err.message);
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Member Selector */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Team Member <span className="text-error">*</span>
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {members.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => setRecipientId(member.id)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                recipientId === member.id
                  ? "border-accent bg-accent-light/20"
                  : "border-border hover:border-accent/50"
              }`}
            >
              <Avatar name={member.fullName} src={member.image} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {member.fullName}
                </p>
                <p className="text-xs text-text-secondary">{member.role}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Type */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Type
        </label>
        <div className="flex gap-2">
          {feedbackTypes.map((ft) => (
            <button
              key={ft.value}
              type="button"
              onClick={() => setType(ft.value)}
              className={`px-4 py-2 rounded-[10px] text-sm font-medium border transition-colors ${
                type === ft.value
                  ? "border-current text-text-primary"
                  : "border-border text-text-secondary hover:text-text-primary"
              }`}
              style={
                type === ft.value
                  ? { borderColor: ft.color, backgroundColor: `${ft.color}15` }
                  : undefined
              }
            >
              {ft.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>
        <label
          htmlFor="feedback-content"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Feedback <span className="text-error">*</span>
        </label>
        <textarea
          id="feedback-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your feedback..."
          rows={5}
          className="w-full rounded-[10px] border border-border bg-bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
        />
      </div>

      {/* Visibility Toggle */}
      <Toggle
        checked={isShared}
        onChange={setIsShared}
        label="Share with team member"
      />

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={createFeedback.isPending}>
          {createFeedback.isPending ? "Sending..." : "Send Feedback"}
        </Button>
      </div>
    </form>
  );
}
