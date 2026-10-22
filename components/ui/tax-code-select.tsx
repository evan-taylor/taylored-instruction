"use client";
import { useAction } from "convex/react";
import { useEffect, useId, useState } from "react";
import { Field, TextInput } from "@/components/ui/field";
import { api } from "@/convex/_generated/api";
import { DEFAULT_TAX_CODES } from "@/shared/registration/domain";

type TaxCode = { id: string; name: string; description: string };
let cache: TaxCode[] | null = null;

function describe(match: TaxCode | undefined, inherited?: string) {
  if (match) {
    return match.description || match.name;
  }
  return inherited
    ? `Inherits ${inherited} from the template when left blank.`
    : "Leave blank to use the Stripe account's default product tax code.";
}

/**
 * Stripe Tax code picker: a text input backed by a datalist of the account's
 * tax codes (fetched once per page load), with common codes as a fallback.
 */
export function TaxCodeSelect({
  value,
  onChange,
  label = "Stripe tax code",
  hint,
  inherited,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
  inherited?: string;
}) {
  const load = useAction(api.registrationInvoiceActions.taxCodes);
  const [codes, setCodes] = useState<TaxCode[]>(
    cache ?? DEFAULT_TAX_CODES.map((c) => ({ ...c, description: "" }))
  );
  const listId = useId();
  useEffect(() => {
    if (cache) {
      return;
    }
    load({})
      .then((loaded) => {
        cache = loaded;
        setCodes(loaded);
      })
      .catch(() => {
        /* fallback list stays */
      });
  }, [load]);
  const match = codes.find((c) => c.id === value.trim());
  return (
    <Field hint={hint ?? describe(match, inherited)} label={label}>
      {(p) => (
        <>
          <TextInput
            {...p}
            autoComplete="off"
            list={listId}
            onChange={(e) => onChange(e.target.value)}
            placeholder="txcd_20030000"
            value={value}
          />
          <datalist id={listId}>
            {codes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </datalist>
        </>
      )}
    </Field>
  );
}
