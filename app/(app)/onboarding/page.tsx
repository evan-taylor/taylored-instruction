"use client";

import { useAuthToken } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MdxRenderer } from "@/components/onboarding/MdxRenderer";
import { onboardingMdxComponents } from "@/components/onboarding/mdx-components";
import {
  OnboardingStepEditor,
  type StepDraft,
} from "@/components/onboarding/OnboardingStepEditor";
import { Button } from "@/components/ui/Button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useProfile } from "@/hooks/useProfile";

type OnboardingStep = {
  id: Id<"onboarding_steps">;
  slug: string;
  title: string;
  summary: string;
  content: string;
  order: number;
  isPublished: boolean;
  updatedAt: string;
  updatedByEmail: string | null;
};

type AuthTokenState = ReturnType<typeof useAuthToken>;
type AccessState = "checking" | "login" | "pending" | "ready";

const NEW_STEP_TEMPLATE = `# New onboarding step

Use this space to share context, embed Loom updates, or link to resources.

## Example embeds

<Callout tone="info">Drop components like \`<LoomVideo />\` directly in your MDX.</Callout>

- Paste documentation links
- Embed a <TypeformEmbed formId="abc123" />
- Add a <CalComButton handle="tayloredinstruction/onboarding" />
`;

const BANNER_TIMEOUT_MS = 4000;

const determineAccessState = (
  loading: boolean,
  authToken: AuthTokenState,
  isInstructor: boolean
): AccessState => {
  if (loading || authToken === undefined) {
    return "checking";
  }

  if (authToken === null) {
    return "login";
  }

  if (!isInstructor) {
    return "pending";
  }

  return "ready";
};

export default function OnboardingPage() {
  const router = useRouter();
  const authToken = useAuthToken();
  const { isInstructor, loading } = useProfile();

  const accessState = useMemo(
    () => determineAccessState(loading, authToken, isInstructor),
    [authToken, isInstructor, loading]
  );

  useEffect(() => {
    if (accessState === "login") {
      router.push("/login");
    }
  }, [accessState, router]);

  if (accessState === "checking") {
    return <CenteredNotice message="Checking your instructor access…" />;
  }

  if (accessState === "login") {
    return <LoginRequired />;
  }

  if (accessState === "pending") {
    return <PendingApproval />;
  }

  return <OnboardingWorkspace />;
}

function OnboardingWorkspace() {
  const steps = useQuery(api.onboarding.listSteps, {
    includeDrafts: true,
  }) as OnboardingStep[] | undefined;
  const saveStep = useMutation(api.onboarding.saveStep);
  const deleteStep = useMutation(api.onboarding.deleteStep);
  const reorderSteps = useMutation(api.onboarding.reorderSteps);

  const [activeStepId, setActiveStepId] =
    useState<Id<"onboarding_steps"> | null>(null);
  const [editorDraft, setEditorDraft] = useState<StepDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const sortedSteps = useMemo(() => {
    if (!steps) {
      return [];
    }

    return [...steps].sort((a, b) => {
      if (a.order === b.order) {
        return a.title.localeCompare(b.title);
      }

      return a.order - b.order;
    });
  }, [steps]);

  useEffect(() => {
    if (sortedSteps.length > 0 && !activeStepId) {
      setActiveStepId(sortedSteps[0].id);
    }
  }, [activeStepId, sortedSteps]);

  useEffect(() => {
    if (!banner) {
      return;
    }

    const timeout = window.setTimeout(() => setBanner(null), BANNER_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [banner]);

  const activeStep =
    sortedSteps.find((step) => step.id === activeStepId) ?? null;

  const startEditing = (step?: OnboardingStep) => {
    setEditorDraft({
      stepId: step?.id,
      title: step?.title ?? "",
      summary: step?.summary ?? "",
      content: step?.content ?? NEW_STEP_TEMPLATE,
      isPublished: step?.isPublished ?? false,
      order: step?.order ?? sortedSteps.length + 1,
    });
  };

  const handleSave = async (draft: StepDraft) => {
    setSaving(true);
    try {
      await saveStep({
        stepId: draft.stepId,
        title: draft.title.trim(),
        summary: draft.summary,
        content: draft.content,
        isPublished: draft.isPublished,
        order: draft.order,
      });
      setEditorDraft(null);
      setBanner("Step saved to Convex.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save step.";
      setBanner(message);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (stepId: Id<"onboarding_steps">) => {
    setDeleting(true);
    try {
      await deleteStep({ stepId });
      setEditorDraft(null);
      if (activeStepId === stepId) {
        setActiveStepId(null);
      }
      setBanner("Step deleted.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete step.";
      setBanner(message);
      throw error;
    } finally {
      setDeleting(false);
    }
  };

  const moveStep = async (
    stepId: Id<"onboarding_steps">,
    direction: "up" | "down"
  ) => {
    if (!sortedSteps.length) {
      return;
    }

    const currentIndex = sortedSteps.findIndex((step) => step.id === stepId);
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= sortedSteps.length) {
      return;
    }

    const reordered = [...sortedSteps];
    const [removed] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, removed);

    try {
      await reorderSteps({
        orderedStepIds: reordered.map((step) => step.id),
      });
      setBanner("Step order updated.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to reorder steps.";
      setBanner(message);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 py-8 text-white shadow-lg">
          <p className="text-sm uppercase tracking-wider">
            Instructor workspace
          </p>
          <h1 className="mt-2 font-semibold text-3xl">Instructor onboarding</h1>
          <p className="mt-2 max-w-2xl text-white/80">
            Build multi-step onboarding flow in MDX, embed Loom walkthroughs,
            and manage it all without touching Git. Every change is stored in
            Convex so it&apos;s instantly live for instructors.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => startEditing()} type="button">
              Create a new step
            </Button>
            {activeStep ? (
              <Button
                onClick={() => startEditing(activeStep)}
                type="button"
                variant="secondary"
              >
                Edit selected step
              </Button>
            ) : null}
          </div>
        </div>

        {banner ? (
          <div
            aria-live="polite"
            className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900 text-sm"
          >
            {banner}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[320px,1fr]">
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Steps</h2>
              <span className="text-gray-500 text-sm">
                {sortedSteps.length} total
              </span>
            </div>
            <div className="space-y-3">
              {sortedSteps.length === 0 ? (
                <p className="rounded-lg border border-gray-300 border-dashed bg-gray-50 px-4 py-6 text-center text-gray-600 text-sm">
                  Nothing here yet. Create your first step to get started.
                </p>
              ) : (
                sortedSteps.map((step, index) => (
                  <StepListItem
                    isActive={step.id === activeStepId}
                    isFirst={index === 0}
                    isLast={index === sortedSteps.length - 1}
                    key={step.id}
                    onMoveDown={() => moveStep(step.id, "down")}
                    onMoveUp={() => moveStep(step.id, "up")}
                    onSelect={() => setActiveStepId(step.id)}
                    position={index + 1}
                    step={step}
                  />
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {activeStep ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-gray-100 border-b pb-4">
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">
                      Step{" "}
                      {sortedSteps.findIndex(
                        (step) => step.id === activeStep.id
                      ) + 1}
                    </p>
                    <h2 className="font-semibold text-2xl">
                      {activeStep.title}
                    </h2>
                    <p className="mt-1 text-gray-500 text-sm">
                      {activeStep.summary || "No summary provided."}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 font-semibold text-xs ${
                      activeStep.isPublished
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {activeStep.isPublished ? "Published" : "Draft"}
                  </span>
                </div>

                <div className="mt-4 space-y-4 text-gray-500 text-sm">
                  <p>
                    Last updated on {formatDate(activeStep.updatedAt)}
                    {activeStep.updatedByEmail
                      ? ` by ${activeStep.updatedByEmail}`
                      : ""}
                    .
                  </p>
                </div>

                <div className="mt-6">
                  <MdxRenderer
                    components={onboardingMdxComponents}
                    source={activeStep.content}
                  />
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="font-semibold text-gray-800 text-lg">
                  Select a step to preview
                </p>
                <p className="mt-2 text-gray-500">
                  Need a new one? Use the button above to create an onboarding
                  step right from this page.
                </p>
              </div>
            )}
          </section>
        </div>

        {editorDraft ? (
          <div className="mt-10">
            <OnboardingStepEditor
              deleting={deleting}
              initialValue={editorDraft}
              onCancel={() => setEditorDraft(null)}
              onDelete={
                editorDraft.stepId
                  ? () =>
                      handleDelete(editorDraft.stepId as Id<"onboarding_steps">)
                  : undefined
              }
              onSave={handleSave}
              saving={saving}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

type StepListItemProps = {
  step: OnboardingStep;
  position: number;
  isActive: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
};

function StepListItem({
  step,
  position,
  isActive,
  onSelect,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: StepListItemProps) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-left transition-all duration-200 ease-out ${
        isActive
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-gray-200 bg-white"
      }`}
    >
      <button className="w-full text-left" onClick={onSelect} type="button">
        <p className="text-gray-500 text-xs uppercase tracking-wide">
          Step {position}
        </p>
        <p className="mt-1 font-semibold">{step.title}</p>
        <p className="mt-1 text-gray-500 text-sm">
          {step.summary || "No summary yet."}
        </p>
      </button>
      <div className="mt-3 flex items-center justify-between text-gray-500 text-xs">
        <span>{step.isPublished ? "Published" : "Draft"}</span>
        <div className="flex gap-2">
          <button
            className="rounded border border-gray-200 px-2 py-1 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isFirst}
            onClick={onMoveUp}
            type="button"
          >
            Move up
          </button>
          <button
            className="rounded border border-gray-200 px-2 py-1 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLast}
            onClick={onMoveDown}
            type="button"
          >
            Move down
          </button>
        </div>
      </div>
    </div>
  );
}

const formatDate = (iso: string): string => {
  try {
    const date = new Date(iso);
    return Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return iso;
  }
};

function CenteredNotice({ message }: { message: string }) {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex items-center justify-center">
        <p className="text-gray-600 text-lg">{message}</p>
      </div>
    </div>
  );
}

function LoginRequired() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="font-semibold text-3xl">Sign in to continue</h1>
        <p className="mt-3 text-gray-600">
          The onboarding workspace lives behind instructor authentication.
          Please log in to access it.
        </p>
        <Button className="mt-6" href="/login">
          Go to login
        </Button>
      </div>
    </div>
  );
}

function PendingApproval() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
        <h1 className="font-semibold text-3xl text-amber-900">
          Instructor access pending
        </h1>
        <p className="mt-3 text-amber-900">
          This onboarding content is only available to approved instructors.
          Check your{" "}
          <a className="underline hover:no-underline" href="/my-account">
            account dashboard
          </a>{" "}
          to confirm your status or contact the admin team for help.
        </p>
      </div>
    </div>
  );
}
