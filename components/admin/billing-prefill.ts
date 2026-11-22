import { type Dispatch, type SetStateAction, useEffect, useRef } from "react";
import type { Doc } from "@/convex/_generated/dataModel";
import type { InvoiceDraft } from "./invoices";

export type OrganizationBilling = Pick<
  Doc<"registrationOrganizations">,
  | "name"
  | "contactName"
  | "contactEmail"
  | "address"
  | "city"
  | "state"
  | "postalCode"
  | "country"
>;
export type Purchaser = { name: string; email: string };
export type OrganizationBillingPatch = {
  contactEmail?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

function filled(fields: Record<string, string | undefined>) {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    const trimmed = value?.trim();
    if (trimmed) {
      result[key] = trimmed;
    }
  }
  return result;
}

/** Invoice bill-to fields an organization can supply. */
export function invoicePrefill(
  organization: OrganizationBilling | null | undefined
): Partial<InvoiceDraft> {
  if (!organization) {
    return {};
  }
  return filled({
    billToName: organization.name,
    billToEmail: organization.contactEmail,
    billToAddress: organization.address,
    city: organization.city,
    state: organization.state,
    postalCode: organization.postalCode,
    country: organization.country,
  });
}

/** Purchaser fields an organization's billing contact can supply. */
export function purchaserPrefill(
  organization: OrganizationBilling | null | undefined
): Partial<Purchaser> {
  if (!organization) {
    return {};
  }
  return filled({
    name: organization.contactName,
    email: organization.contactEmail,
  });
}

/**
 * Applies a new prefill without touching what the person typed. A field is
 * replaced only while it is empty or still holds the previous prefill (or the
 * default when nothing was prefilled), so switching organizations swaps the
 * prefilled values and keeps every edit.
 */
export function applyPrefill<T extends object>(
  current: T,
  defaults: T,
  previous: Partial<T>,
  next: Partial<T>
): T {
  const result = { ...current };
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  for (const key of keys as Set<keyof T>) {
    const untouched =
      current[key] === "" || current[key] === (previous[key] ?? defaults[key]);
    if (untouched) {
      result[key] = next[key] ?? defaults[key];
    }
  }
  return result;
}

/** Keeps a form value in step with a prefill source as it changes, preserving edits. */
export function usePrefill<T extends object>(
  prefill: Partial<T>,
  setValue: Dispatch<SetStateAction<T>>,
  defaults: T
) {
  const previous = useRef<Partial<T>>({});
  const key = JSON.stringify(prefill);
  useEffect(() => {
    const prior = previous.current;
    const next = JSON.parse(key) as Partial<T>;
    previous.current = next;
    setValue((current) => applyPrefill(current, defaults, prior, next));
  }, [key, setValue, defaults]);
}

const SAVABLE: [keyof OrganizationBillingPatch, keyof InvoiceDraft, string][] =
  [
    ["contactEmail", "billToEmail", "billing email"],
    ["address", "billToAddress", "street address"],
    ["city", "city", "city"],
    ["state", "state", "state"],
    ["postalCode", "postalCode", "ZIP"],
    ["country", "country", "country"],
  ];

/** Invoice values the organization lacks, which "Save to organization" would add. */
export function missingOrganizationBilling(
  organization: OrganizationBilling | null | undefined,
  invoice: InvoiceDraft
): { patch: OrganizationBillingPatch; labels: string[] } {
  const patch: OrganizationBillingPatch = {};
  const labels: string[] = [];
  if (!organization) {
    return { patch, labels };
  }
  for (const [field, source, label] of SAVABLE) {
    const value = String(invoice[source]).trim();
    if (value && !organization[field]?.trim()) {
      patch[field] = value;
      labels.push(label);
    }
  }
  return { patch, labels };
}
