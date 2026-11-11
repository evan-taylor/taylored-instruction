"use client";

import { useMutation } from "convex/react";
import { useRef, useState } from "react";
import { Field, Select, TextInput } from "@/components/ui/field";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { errorText } from "./errors";

export function OutcomeField({
  seatId,
  definition,
  current,
}: {
  seatId: Id<"registrationSeats">;
  definition: Doc<"registrationSeats">["outcomeDefinitions"][number];
  current: string | number | undefined;
}) {
  const record = useMutation(api.registrationOperations.recordOutcome);
  const [draft, setDraft] = useState<string>();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const saving = useRef(false);
  const percentage = definition.type === "percentage";
  const value = draft ?? String(current ?? "");

  async function save(next: string | number) {
    if (saving.current || next === current) {
      return;
    }
    saving.current = true;
    setError("");
    setStatus("Saving…");
    try {
      await record({ seatId, fieldId: definition.id, value: next });
      setDraft(undefined);
      setStatus("Saved");
    } catch (failure) {
      if (!percentage) {
        setDraft(undefined);
      }
      setStatus("");
      setError(`Couldn’t save outcome. ${errorText(failure)}`);
    } finally {
      saving.current = false;
    }
  }

  async function saveScore(input: HTMLInputElement) {
    if (draft === undefined || saving.current) {
      return;
    }
    if (input.validity.badInput || (input.value && !input.validity.valid)) {
      setError("Enter a score from 0 to 100.");
      return;
    }
    if (!input.value || input.valueAsNumber === current) {
      setDraft(undefined);
      setError("");
      return;
    }
    await save(input.valueAsNumber);
  }

  return (
    <div>
      <Field
        error={error}
        hint={
          percentage && definition.minimum !== undefined
            ? `Passing score: ${definition.minimum}% or higher`
            : undefined
        }
        label={`${definition.title} ${definition.required ? "(required)" : "(informational)"}`}
      >
        {(props) =>
          percentage ? (
            <TextInput
              {...props}
              max={100}
              min={0}
              onBlur={(event) => saveScore(event.currentTarget)}
              onChange={(event) => {
                setDraft(event.target.value);
                setError("");
                setStatus("");
              }}
              onKeyDown={async (event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  await saveScore(event.currentTarget);
                }
              }}
              readOnly={status === "Saving…"}
              step="any"
              type="number"
              value={value}
            />
          ) : (
            <Select
              {...props}
              disabled={status === "Saving…"}
              onChange={async (event) => {
                const choice = event.target.value;
                setDraft(choice);
                await save(choice);
              }}
              value={value}
            >
              <option disabled value="">
                Choose…
              </option>
              {definition.options.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </Select>
          )
        }
      </Field>
      <span aria-live="polite" className="text-slate-500 text-xs">
        {status}
      </span>
    </div>
  );
}
