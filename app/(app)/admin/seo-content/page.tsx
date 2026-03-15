"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useProfile } from "@/hooks/useProfile";

const ADMIN_EMAILS: readonly string[] = [
  "admin@tayloredinstruction.com",
  "evan@tayloredinstruction.com",
];

type GenerationResult = {
  totalTemplates: number;
  inserted: number;
  updated: number;
  skipped: number;
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function AdminSeoContentPage() {
  const { loading: profileLoading, session, email } = useProfile();
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [workingMode, setWorkingMode] = useState<
    "generate" | "overwrite" | null
  >(null);

  const isAdmin = email ? ADMIN_EMAILS.includes(email) : false;

  const pages = useQuery(
    api.seoContent.listPagesForAdmin,
    !profileLoading && !!session && isAdmin ? {} : "skip"
  );
  const generateContent = useMutation(api.seoContent.generateSeoContentBatch);

  const runGeneration = async (overwriteExisting: boolean) => {
    setErrorMessage(null);
    setResultMessage(null);
    setWorkingMode(overwriteExisting ? "overwrite" : "generate");

    try {
      const result = (await generateContent({
        overwriteExisting,
      })) as GenerationResult;
      setResultMessage(
        `Generated ${result.totalTemplates} templates · inserted ${result.inserted} · updated ${result.updated} · skipped ${result.skipped}`
      );
    } catch (_error) {
      setErrorMessage(
        "Content generation failed. Confirm you are logged in as an admin account and try again."
      );
    } finally {
      setWorkingMode(null);
    }
  };

  if (profileLoading) {
    return (
      <div className="container mx-auto flex items-center justify-center px-4 py-10">
        <p className="text-lg">Loading admin access…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-bold text-3xl">Admin access required</h1>
        <p className="mt-3 text-gray-700">
          Please log in with an admin account to generate and manage SEO
          content.
        </p>
        <Link
          className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 font-medium text-white hover:bg-primary-dark"
          href="/login"
        >
          Log in
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-bold text-3xl">Access denied</h1>
        <p className="mt-3 text-gray-700">
          This page is restricted to admin users.
        </p>
      </div>
    );
  }

  let pagesContent: ReactNode;
  if (!pages) {
    pagesContent = <p className="text-gray-600">Loading pages…</p>;
  } else if (pages.length === 0) {
    pagesContent = (
      <p className="text-gray-600">
        No pages found yet. Click “Generate missing pages” to create the initial
        SEO batch.
      </p>
    );
  } else {
    pagesContent = (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
              <th className="px-2 py-2">Title</th>
              <th className="px-2 py-2">Location</th>
              <th className="px-2 py-2">Service</th>
              <th className="px-2 py-2">Updated</th>
              <th className="px-2 py-2">Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pages.map((page) => (
              <tr key={page._id}>
                <td className="px-2 py-2 text-gray-900 text-sm">
                  {page.title}
                </td>
                <td className="px-2 py-2 text-gray-700 text-sm">
                  {page.locationLabel}
                </td>
                <td className="px-2 py-2 text-gray-700 text-sm">
                  {page.serviceLine}
                </td>
                <td className="px-2 py-2 text-gray-600 text-sm">
                  {formatDate(page.updatedAt)}
                </td>
                <td className="px-2 py-2 text-sm">
                  <Link
                    className="font-medium text-primary hover:underline"
                    href={`/resources/${page.slug}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="font-bold text-3xl">SEO Content Generator</h1>
        <p className="mt-3 text-gray-700">
          Generate and publish a large batch of Vancouver-first SEO pages (plus
          supporting San Luis Obispo pages) backed by Convex.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="rounded-md bg-primary px-4 py-2 font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            disabled={workingMode !== null}
            onClick={() => runGeneration(false)}
            type="button"
          >
            {workingMode === "generate"
              ? "Generating missing pages…"
              : "Generate missing pages"}
          </button>
          <button
            className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={workingMode !== null}
            onClick={() => runGeneration(true)}
            type="button"
          >
            {workingMode === "overwrite"
              ? "Regenerating all pages…"
              : "Regenerate all templates"}
          </button>
          <Link
            className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-100"
            href="/resources"
            rel="noopener noreferrer"
            target="_blank"
          >
            Open public resource hub
          </Link>
        </div>
        {resultMessage ? (
          <p className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-green-800 text-sm">
            {resultMessage}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-xl">Published pages</h2>
          <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700 text-xs">
            {pages ? pages.length : 0} pages
          </span>
        </div>
        {pagesContent}
      </div>
    </div>
  );
}
