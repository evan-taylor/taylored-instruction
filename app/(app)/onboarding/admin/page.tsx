"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import {
  EmptyState,
  Notice,
  PageHeader,
  Skeleton,
} from "@/components/ui/page-header";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useProfile } from "@/hooks/useProfile";
import { isAdminEmail } from "@/lib/admin";

interface OnboardingStep {
  _id: Id<"onboarding_steps">;
  content: string;
  createdAt: string;
  order: number;
  title: string;
  updatedAt: string;
}

interface EditingStep {
  content: string;
  id: Id<"onboarding_steps"> | null;
  order: number;
  title: string;
}

const EMBED_EXAMPLES = [
  '<CapEmbed url="https://cap.so/embed/..." />',
  '<LoomEmbed url="https://www.loom.com/share/..." />',
  '<TypeformEmbed formId="abc123" />',
  '<CalComButton username="evan-taylor" eventType="taylored-instruction" namespace="taylored-instruction" buttonText="Book Now" />',
];

function StepList({
  steps,
  busy,
  onCreate,
  onEdit,
  onDelete,
}: {
  steps: OnboardingStep[] | undefined;
  busy: boolean;
  onCreate: () => void;
  onEdit: (step: OnboardingStep) => void;
  onDelete: (id: Id<"onboarding_steps">) => void;
}) {
  if (steps === undefined) {
    return <Skeleton className="h-40" />;
  }
  if (steps.length === 0) {
    return (
      <EmptyState
        action={
          <Button onClick={onCreate} size="sm" type="button">
            Create the first step
          </Button>
        }
        description="Add the first thing a new instructor should see."
        title="No onboarding steps yet"
      />
    );
  }
  return (
    <ul className="list-none space-y-3 p-0">
      {steps.map((step) => (
        <li key={step._id}>
          <Card className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-medium text-sm text-white tabular-nums">
                {step.order}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">
                  {step.title}
                </p>
                <p className="text-slate-500 text-xs">
                  Updated {new Date(step.updatedAt).toLocaleDateString("en-US")}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                aria-label={`Edit ${step.title}`}
                disabled={busy}
                onClick={() => onEdit(step)}
                size="xs"
                type="button"
                variant="secondary"
              >
                Edit
              </Button>
              <Button
                aria-label={`Delete ${step.title}`}
                disabled={busy}
                onClick={() => onDelete(step._id)}
                size="xs"
                type="button"
                variant="ghost"
              >
                Delete
              </Button>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export default function OnboardingAdminPage() {
  const { loading: profileLoading, session, email } = useProfile();
  const [editingStep, setEditingStep] = useState<EditingStep | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] =
    useState<Id<"onboarding_steps"> | null>(null);

  const isAdmin = isAdminEmail(email);
  const shouldFetchSteps = !profileLoading && !!session && !!isAdmin;

  const steps = useQuery(
    api.onboarding.getStepsForAdmin,
    shouldFetchSteps ? {} : "skip"
  ) as OnboardingStep[] | undefined;
  const createStep = useMutation(api.onboarding.createStep);
  const updateStep = useMutation(api.onboarding.updateStep);
  const deleteStep = useMutation(api.onboarding.deleteStep);

  if (profileLoading) {
    return (
      <div
        aria-busy="true"
        className="mx-auto max-w-4xl space-y-4 px-4 py-10 sm:px-6"
        role="status"
      >
        <span className="sr-only">Loading…</span>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="font-bold text-2xl">Staff sign-in required</h1>
        <p className="mt-2 text-slate-600">
          Sign in with an administrator account to edit onboarding.
        </p>
        <div className="mt-6">
          <Button href="/login">Sign in</Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="font-bold text-2xl">Access restricted</h1>
        <p className="mt-2 text-slate-600">
          Only administrators can edit onboarding steps.
        </p>
      </div>
    );
  }

  const handleCreateNew = () => {
    const nextOrder = steps ? Math.max(...steps.map((s) => s.order), 0) + 1 : 1;
<<<<<<< HEAD
    setEditingStep({
      content: "",
      id: null,
      order: nextOrder,
      title: "",
    });
=======
    setEditingStep({ id: null, title: "", content: "", order: nextOrder });
>>>>>>> origin/master
    setIsCreating(true);
    setErrorMessage(null);
  };

  const handleEdit = (step: OnboardingStep) => {
    setEditingStep({
      content: step.content,
      id: step._id,
      order: step.order,
      title: step.title,
    });
    setIsCreating(false);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    if (!editingStep) {
      return;
    }
    const trimmedTitle = editingStep.title.trim();
    const trimmedContent = editingStep.content.trim();
    if (!(trimmedTitle && trimmedContent)) {
      setErrorMessage("Enter a title and content before saving.");
      return;
    }
    setBusy(true);
    try {
      if (isCreating) {
        await createStep({
          content: trimmedContent,
          order: editingStep.order,
          title: trimmedTitle,
        });
      } else if (editingStep.id) {
        await updateStep({
          content: trimmedContent,
          id: editingStep.id,
          order: editingStep.order,
          title: trimmedTitle,
        });
      }
      setEditingStep(null);
      setIsCreating(false);
      setErrorMessage(null);
    } catch {
<<<<<<< HEAD
      setErrorMessage("Failed to save step. Please try again.");
=======
      setErrorMessage("The step couldn’t be saved. Try again.");
    } finally {
      setBusy(false);
>>>>>>> origin/master
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) {
      return;
    }
    setBusy(true);
    try {
      await deleteStep({ id: deleteConfirmId });
<<<<<<< HEAD
      setDeleteConfirmId(null);
    } catch {
      setErrorMessage("Failed to delete step. Please try again.");
=======
    } catch {
      setErrorMessage("The step couldn’t be deleted. Try again.");
    } finally {
      setBusy(false);
>>>>>>> origin/master
      setDeleteConfirmId(null);
    }
  };

  const handleCancel = () => {
    setEditingStep(null);
    setIsCreating(false);
    setErrorMessage(null);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:py-12">
      <PageHeader
        actions={
          <Button onClick={handleCreateNew} size="sm" type="button">
            New step
          </Button>
        }
        description="Steps appear to instructors in order after their first sign-in."
        title="Onboarding steps"
      />

      {editingStep ? (
        <Card>
          <CardHeader>
            <CardTitle>{isCreating ? "New step" : "Edit step"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              <fieldset
                className="min-w-0 space-y-4 border-0 p-0"
                disabled={busy}
              >
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
                  <Field label="Title" required>
                    {(props) => (
                      <TextInput
                        {...props}
                        onChange={(e) =>
                          setEditingStep({
                            ...editingStep,
                            title: e.target.value,
                          })
                        }
                        required
                        value={editingStep.title}
                      />
                    )}
                  </Field>
                  <Field label="Order" required>
                    {(props) => (
                      <TextInput
                        {...props}
                        inputMode="numeric"
                        min={1}
                        onChange={(e) =>
                          setEditingStep({
                            ...editingStep,
                            order: Number.parseInt(e.target.value, 10) || 1,
                          })
                        }
                        required
                        type="number"
                        value={editingStep.order}
                      />
                    )}
                  </Field>
                </div>
                <Field
                  hint={
                    <span>
                      Embeds available:{" "}
                      {EMBED_EXAMPLES.map((example) => (
                        <code className="mr-2 block" key={example}>
                          {example}
                        </code>
                      ))}
                    </span>
                  }
                  label="Content (MDX)"
                  required
                >
                  {(props) => (
                    <TextArea
                      {...props}
                      className="min-h-96 font-mono text-base sm:text-sm"
                      onChange={(e) =>
                        setEditingStep({
                          ...editingStep,
                          content: e.target.value,
                        })
                      }
                      required
                      value={editingStep.content}
                    />
                  )}
                </Field>
              </fieldset>
              {errorMessage ? (
                <Notice tone="danger">{errorMessage}</Notice>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <Button disabled={busy} size="sm" type="submit">
                  {busy ? "Saving…" : "Save step"}
                </Button>
                <Button
                  disabled={busy}
                  onClick={handleCancel}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {errorMessage && !editingStep ? (
        <Notice tone="danger">{errorMessage}</Notice>
      ) : null}

      <ConfirmDialog
        busy={busy}
        confirmLabel="Delete step"
        danger
        description="Instructors who haven’t finished onboarding will no longer see this step."
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDeleteConfirm}
        open={deleteConfirmId !== null}
        title="Delete this step?"
      />

      <StepList
        busy={busy}
        onCreate={handleCreateNew}
        onDelete={setDeleteConfirmId}
        onEdit={handleEdit}
        steps={steps}
      />
    </div>
  );
}
