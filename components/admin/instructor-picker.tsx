"use client";
import { Search, X } from "lucide-react";
import { useId, useState } from "react";
import { EmptyState } from "@/components/ui/page-header";
import type { Id } from "@/convex/_generated/dataModel";

export type StaffMember = { id: Id<"users">; email: string; name?: string };

export function staffLabel(person: StaffMember) {
  return person.name || person.email;
}

/** Searchable multi-select over the instructor directory, by name or email. */
export function InstructorPicker({
  directory,
  value,
  onChange,
}: {
  directory: StaffMember[];
  value: Id<"users">[];
  onChange: (value: Id<"users">[]) => void;
}) {
  const [search, setSearch] = useState("");
  const searchId = useId();
  const needle = search.trim().toLowerCase();
  const matches = directory
    .filter(
      (person) =>
        !needle ||
        person.email.toLowerCase().includes(needle) ||
        person.name?.toLowerCase().includes(needle)
    )
    .sort((a, b) => staffLabel(a).localeCompare(staffLabel(b)));
  const toggle = (id: Id<"users">) =>
    onChange(
      value.includes(id)
        ? value.filter((entry) => entry !== id)
        : [...value, id]
    );
  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium text-slate-700 text-sm">
          Assigned{value.length ? ` (${value.length})` : ""}
        </p>
        {value.length ? (
          <ul className="mt-2 flex list-none flex-wrap gap-2 p-0">
            {value.map((id) => {
              const person = directory.find((entry) => entry.id === id);
              const label = person ? staffLabel(person) : "Inactive instructor";
              return (
                <li
                  className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 py-1 pr-1 pl-3 text-primary text-sm"
                  key={id}
                >
                  <span className="truncate font-medium">{label}</span>
                  <button
                    aria-label={`Remove ${label}`}
                    className="inline-flex h-6 pointer-coarse:h-9 pointer-coarse:w-9 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-primary/15 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40"
                    onClick={() => toggle(id)}
                    type="button"
                  >
                    <X aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-1 text-slate-500 text-sm">
            Nobody yet. Search below to assign an instructor.
          </p>
        )}
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="relative border-slate-100 border-b">
          <label className="sr-only" htmlFor={searchId}>
            Search instructors by name or email
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            autoComplete="off"
            className="block min-h-11 w-full bg-transparent pr-3 pl-10 text-base text-slate-900 placeholder:text-slate-400 focus-visible:outline-hidden md:pointer-fine:text-sm"
            id={searchId}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") {
                return;
              }
              // Enter picks the top match instead of submitting the session form.
              e.preventDefault();
              const [first] = matches;
              if (needle && first) {
                toggle(first.id);
                setSearch("");
              }
            }}
            placeholder="Search instructors by name or email"
            type="search"
            value={search}
          />
        </div>
        {matches.length ? (
          <ul className="max-h-64 list-none divide-y divide-slate-100 overflow-y-auto p-0">
            {matches.map((person) => (
              <li key={person.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3.5 py-2 transition-colors hover:bg-slate-50">
                  <input
                    checked={value.includes(person.id)}
                    className="h-4 pointer-coarse:h-5 pointer-coarse:w-5 w-4 shrink-0 rounded-sm border-slate-300 accent-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                    onChange={() => toggle(person.id)}
                    type="checkbox"
                  />
                  <span className="min-w-0 text-sm">
                    <span className="block truncate font-medium text-slate-900">
                      {staffLabel(person)}
                    </span>
                    {person.name ? (
                      <span className="block truncate text-slate-500 text-xs">
                        {person.email}
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            className="rounded-none border-0 py-8"
            description="Check the spelling, or invite them from the Instructors page."
            title={`No instructor matches “${search.trim()}”`}
          />
        )}
        <p className="border-slate-100 border-t bg-slate-50/70 px-3.5 py-2 text-slate-500 text-xs">
          {needle
            ? `${matches.length} of ${directory.length} instructors`
            : `${directory.length} approved instructors`}
          {needle && matches.length ? " · Enter adds the first match" : ""}
        </p>
      </div>
    </div>
  );
}
