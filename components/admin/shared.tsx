"use client";
import type { Settings } from "@/shared/registration/domain";

export const emptySettings: Settings = {
  tuition: 0,
  materials: [],
  questions: [],
  outcomes: [],
  emails: [],
  cutoffMinutes: 0,
};

/** Common US zones offered in session editors; the current value is always appended. */
export const US_TIME_ZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Phoenix",
  "America/Chicago",
  "America/New_York",
  "America/Anchorage",
  "Pacific/Honolulu",
] as const;

/** Replaces one item in an id-keyed list with a patched copy. */
export function patchById<T extends { id: string }>(
  list: T[],
  id: string,
  patch: Partial<T>
) {
  return list.map((entry) =>
    entry.id === id ? { ...entry, ...patch } : entry
  );
}

/** Turns a title into a URL-safe slug suggestion. */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "");
}

/** @deprecated Legacy control styling; new screens use primitives from components/ui/field. */
export const inputStyle =
  "block w-full rounded border border-slate-400 bg-white p-2 text-slate-950";
/** @deprecated Legacy status message; new screens use ResultNotice. */
export function Message({ text }: { text: string }) {
  return text ? (
    <p className="rounded bg-slate-100 p-3 text-slate-950" role="status">
      {text}
    </p>
  ) : null;
}
