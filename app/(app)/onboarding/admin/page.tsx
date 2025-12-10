"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useProfile } from "@/hooks/useProfile";

const ADMIN_EMAILS = [
  "admin@tayloredinstruction.com",
  "evan@tayloredinstruction.com",
];

type OnboardingStep = {
  _id: Id<"onboarding_steps">;
  title: string;
  content: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

type EditingStep = {
  id: Id<"onboarding_steps"> | null;
  title: string;
  content: string;
  order: number;
};

export default function OnboardingAdminPage() {
  const { loading: profileLoading, session, email } = useProfile();
  const [editingStep, setEditingStep] = useState<EditingStep | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] =
    useState<Id<"onboarding_steps"> | null>(null);

  const isAdmin = email && ADMIN_EMAILS.includes(email);
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
      <div className="container mx-auto flex items-center justify-center px-4 py-8">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-4 font-bold text-3xl">Admin Access Required</h1>
          <p className="mb-6 text-gray-600">
            Please log in to access the admin panel.
          </p>
          <a
            className="inline-flex items-center justify-center rounded bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary-dark"
            href="/login"
          >
            Log In
          </a>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-4 font-bold text-3xl">Access Denied</h1>
          <p className="text-gray-600">
            You do not have permission to access this page. Admin access is
            required.
          </p>
        </div>
      </div>
    );
  }

  const handleCreateNew = () => {
    const nextOrder = steps ? Math.max(...steps.map((s) => s.order), 0) + 1 : 1;
    setEditingStep({
      id: null,
      title: "",
      content: "",
      order: nextOrder,
    });
    setIsCreating(true);
    setErrorMessage(null);
  };

  const handleEdit = (step: OnboardingStep) => {
    setEditingStep({
      id: step._id,
      title: step.title,
      content: step.content,
      order: step.order,
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

    if (!trimmedTitle) {
      setErrorMessage("Title is required.");
      return;
    }

    if (!trimmedContent) {
      setErrorMessage("Content is required.");
      return;
    }

    try {
      if (isCreating) {
        await createStep({
          title: trimmedTitle,
          content: trimmedContent,
          order: editingStep.order,
        });
      } else if (editingStep.id) {
        await updateStep({
          id: editingStep.id,
          title: trimmedTitle,
          content: trimmedContent,
          order: editingStep.order,
        });
      }
      setEditingStep(null);
      setIsCreating(false);
      setErrorMessage(null);
    } catch (_error) {
      setErrorMessage("Failed to save step. Please try again.");
    }
  };

  const handleDeleteClick = (id: Id<"onboarding_steps">) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) {
      return;
    }

    try {
      await deleteStep({ id: deleteConfirmId });
      setDeleteConfirmId(null);
    } catch (_error) {
      setErrorMessage("Failed to delete step. Please try again.");
      setDeleteConfirmId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

  const handleCancel = () => {
    setEditingStep(null);
    setIsCreating(false);
    setErrorMessage(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-bold text-3xl">Manage Onboarding Steps</h1>
          <button
            className="rounded-lg bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary-dark"
            onClick={handleCreateNew}
            type="button"
          >
            + New Step
          </button>
        </div>

        {editingStep && (
          <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-xl">
              {isCreating ? "Create New Step" : "Edit Step"}
            </h2>

            <div className="mb-4">
              <label
                className="mb-1 block font-medium text-gray-700"
                htmlFor="title"
              >
                Title
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                id="title"
                onChange={(e) =>
                  setEditingStep({ ...editingStep, title: e.target.value })
                }
                placeholder="Step title"
                type="text"
                value={editingStep.title}
              />
            </div>

            <div className="mb-4">
              <label
                className="mb-1 block font-medium text-gray-700"
                htmlFor="order"
              >
                Order
              </label>
              <input
                className="w-32 rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                id="order"
                min="1"
                onChange={(e) =>
                  setEditingStep({
                    ...editingStep,
                    order: Number.parseInt(e.target.value, 10) || 1,
                  })
                }
                type="number"
                value={editingStep.order}
              />
            </div>

            <div className="mb-4">
              <label
                className="mb-1 block font-medium text-gray-700"
                htmlFor="content"
              >
                Content (MDX)
              </label>
              <div className="mb-2 rounded-lg bg-gray-50 p-3 text-gray-600 text-sm">
                <p className="mb-2 font-medium">Available embed components:</p>
                <code className="mb-1 block">{`<LoomEmbed url="https://www.loom.com/share/..." />`}</code>
                <code className="mb-1 block">{`<TypeformEmbed formId="abc123" />`}</code>
                <code className="block">{`<CalComButton username="yourname" eventType="30min" buttonText="Book Now" />`}</code>
              </div>
              <textarea
                className="h-96 w-full rounded-lg border border-gray-300 px-4 py-2 font-mono text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                id="content"
                onChange={(e) =>
                  setEditingStep({ ...editingStep, content: e.target.value })
                }
                placeholder="Enter MDX content here..."
                value={editingStep.content}
              />
            </div>

            <div className="flex gap-3">
              <button
                className="rounded-lg bg-primary px-6 py-2 font-medium text-white transition-colors hover:bg-primary-dark"
                onClick={handleSave}
                type="button"
              >
                Save
              </button>
              <button
                className="rounded-lg bg-gray-100 px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200"
                onClick={handleCancel}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
            {errorMessage}
            <button
              className="ml-4 text-red-800 underline"
              onClick={() => setErrorMessage(null)}
              type="button"
            >
              Dismiss
            </button>
          </div>
        )}

        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="rounded-lg bg-white p-6 shadow-xl">
              <h3 className="mb-4 font-bold text-lg">Confirm Delete</h3>
              <p className="mb-6 text-gray-600">
                Are you sure you want to delete this step? This action cannot be
                undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200"
                  onClick={handleDeleteCancel}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
                  onClick={handleDeleteConfirm}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {steps ? (
            steps.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                <p className="mb-4 text-gray-600">No onboarding steps yet.</p>
                <button
                  className="rounded-lg bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary-dark"
                  onClick={handleCreateNew}
                  type="button"
                >
                  Create Your First Step
                </button>
              </div>
            ) : (
              steps.map((step) => (
                <div
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                  key={step._id}
                >
                  <div>
                    <span className="mr-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary font-medium text-sm text-white">
                      {step.order}
                    </span>
                    <span className="font-medium">{step.title}</span>
                    <span className="ml-3 text-gray-500 text-sm">
                      Updated: {new Date(step.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded px-3 py-1 font-medium text-primary text-sm transition-colors hover:bg-primary hover:text-white"
                      onClick={() => handleEdit(step)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="rounded px-3 py-1 font-medium text-red-600 text-sm transition-colors hover:bg-red-600 hover:text-white"
                      onClick={() => handleDeleteClick(step._id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            <p className="text-gray-600">Loading steps...</p>
          )}
        </div>
      </div>
    </div>
  );
}
