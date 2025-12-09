"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Id } from "@/convex/_generated/dataModel";
import { MdxRenderer } from "./MdxRenderer";
import { onboardingMdxComponents } from "./mdx-components";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-gray-200 bg-white p-4 text-gray-600 text-sm">
      Loading editor…
    </div>
  ),
});

export type StepDraft = {
  stepId?: Id<"onboarding_steps">;
  title: string;
  summary: string;
  content: string;
  isPublished: boolean;
  order: number;
};

type OnboardingStepEditorProps = {
  initialValue: StepDraft;
  onSave: (draft: StepDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  deleting: boolean;
};

const helperShortcuts = [
  '`<LoomVideo url="https://www.loom.com/share/..." />`',
  '`<TypeformEmbed formId="abc123" />`',
  '`<CalComButton handle="tayloredinstruction/onboarding" />`',
  '`<Callout tone="success">Wins!</Callout>`',
];

const TITLE_FIELD_ID = "onboarding-step-title";
const ORDER_FIELD_ID = "onboarding-step-order";
const SUMMARY_FIELD_ID = "onboarding-step-summary";
const PUBLISHED_FIELD_ID = "onboarding-step-published";

export function OnboardingStepEditor({
  initialValue,
  onSave,
  onDelete,
  onCancel,
  saving,
  deleting,
}: OnboardingStepEditorProps) {
  const [draft, setDraft] = useState<StepDraft>(initialValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(initialValue);
  }, [initialValue]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.title.trim()) {
      setError("A title is required.");
      return;
    }

    if (!draft.content.trim()) {
      setError("Content cannot be empty.");
      return;
    }

    setError(null);
    try {
      await onSave({
        ...draft,
        summary: draft.summary.trim(),
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to save step. Please try again.";
      setError(message);
    }
  };

  const editorDescription = useMemo(
    () =>
      helperShortcuts.map((shortcut) => (
        <li className="font-mono text-gray-600 text-xs" key={shortcut}>
          {shortcut}
        </li>
      )),
    []
  );

  return (
    <form
      className="rounded-xl border border-gray-200 bg-white shadow-sm"
      onSubmit={handleSubmit}
    >
      <div className="border-gray-200 border-b px-6 py-4">
        <h2 className="font-semibold text-xl">
          {draft.stepId ? "Edit onboarding step" : "Create onboarding step"}
        </h2>
        <p className="mt-1 text-gray-600 text-sm">
          Changes are saved to Convex, so instructors can update onboarding
          without touching Git.
        </p>
      </div>

      <div className="space-y-6 px-6 py-6">
        {error ? (
          <div
            className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900 text-sm"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label
              className="font-medium text-gray-700 text-sm"
              htmlFor={TITLE_FIELD_ID}
            >
              Step title
            </label>
            <Input
              id={TITLE_FIELD_ID}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="Example: Get certified in our LMS"
              value={draft.title}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              className="font-medium text-gray-700 text-sm"
              htmlFor={ORDER_FIELD_ID}
            >
              Step order
            </label>
            <Input
              id={ORDER_FIELD_ID}
              min={1}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  order: Number.parseInt(event.target.value, 10) || 1,
                }))
              }
              type="number"
              value={draft.order}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label
            className="font-medium text-gray-700 text-sm"
            htmlFor={SUMMARY_FIELD_ID}
          >
            Summary (optional)
          </label>
          <Textarea
            id={SUMMARY_FIELD_ID}
            maxLength={260}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, summary: event.target.value }))
            }
            placeholder="Quick context shown in the step list."
            value={draft.summary}
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            checked={draft.isPublished}
            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
            id={PUBLISHED_FIELD_ID}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                isPublished: event.target.checked,
              }))
            }
            type="checkbox"
          />
          <label
            className="font-medium text-gray-700 text-sm"
            htmlFor={PUBLISHED_FIELD_ID}
          >
            Published for instructors
          </label>
        </div>

        <div className="rounded-lg border border-gray-300 border-dashed bg-gray-50 px-4 py-3 text-gray-600 text-sm">
          <p className="font-medium">Need embeds?</p>
          <p className="mt-1">
            Drop these React components straight into your MDX to embed rich
            content:
          </p>
          <ul className="mt-2 space-y-1">{editorDescription}</ul>
        </div>

        <div data-color-mode="light">
          <MDEditor
            height={400}
            onChange={(value) =>
              setDraft((prev) => ({ ...prev, content: value ?? "" }))
            }
            preview="edit"
            textareaProps={{
              placeholder: "Use markdown + MDX to outline this step…",
            }}
            value={draft.content}
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="font-medium text-gray-700 text-sm">Live preview</p>
          <div className="mt-3">
            <MdxRenderer
              components={onboardingMdxComponents}
              source={draft.content}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-gray-200 border-t px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <Button disabled={saving} type="submit">
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <Button
            className="border-gray-300 text-gray-700"
            onClick={onCancel}
            type="button"
            variant="secondary"
          >
            Cancel
          </Button>
        </div>

        {draft.stepId && onDelete ? (
          <button
            className="font-medium text-rose-600 text-sm transition-colors duration-200 ease-out hover:text-rose-500"
            disabled={deleting}
            onClick={async () => {
              try {
                await onDelete();
              } catch {
                setError("Unable to delete step. Please try again.");
              }
            }}
            type="button"
          >
            {deleting ? "Deleting…" : "Delete step"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
