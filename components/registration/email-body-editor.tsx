"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Field, TextArea } from "@/components/ui/field";

const LINE_START = /^/gmu;
const INDENT = /^ {1,4}/gmu;
const FORMATS = [
  { label: "Bold", before: "**", after: "**" },
  { label: "Italic", before: "*", after: "*" },
  { label: "Underline", before: "++", after: "++" },
  { label: "Link", before: "[", after: "](https://example.com)" },
] as const;

export function EmailBodyEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const replace = (start: number, end: number, text: string) => {
    onChange(value.slice(0, start) + text + value.slice(end));
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(start, start + text.length);
    });
  };
  const format = (before: string, after: string) => {
    const start = ref.current?.selectionStart ?? value.length;
    const end = ref.current?.selectionEnd ?? start;
    replace(start, end, before + (value.slice(start, end) || "text") + after);
  };
  const lines = (prefix: string, outdent = false) => {
    const selectionStart = ref.current?.selectionStart ?? 0;
    const selectionEnd = ref.current?.selectionEnd ?? selectionStart;
    const start =
      selectionStart === 0
        ? 0
        : value.lastIndexOf("\n", selectionStart - 1) + 1;
    const nextLine = value.indexOf("\n", selectionEnd);
    const end = nextLine < 0 ? value.length : nextLine;
    const selected = value.slice(start, end);
    replace(
      start,
      end,
      outdent
        ? selected.replace(INDENT, "")
        : selected.replace(LINE_START, prefix)
    );
  };
  return (
    <Field
      hint="Select text to format. Use Indent and Outdent for nested lists. Formatting uses Markdown; ++text++ adds underline."
      label="Body"
      required
    >
      {(props) => (
        <div className="space-y-2">
          <fieldset
            aria-label="Email formatting"
            className="flex flex-wrap gap-1"
          >
            {FORMATS.map(({ label, before, after }) => (
              <Button
                key={label}
                onClick={() => format(before, after)}
                size="xs"
                type="button"
                variant="secondary"
              >
                {label}
              </Button>
            ))}
            <Button
              onClick={() => lines("- ")}
              size="xs"
              type="button"
              variant="secondary"
            >
              Bulleted list
            </Button>
            <Button
              onClick={() => lines("1. ")}
              size="xs"
              type="button"
              variant="secondary"
            >
              Numbered list
            </Button>
            <Button
              onClick={() => lines("    ")}
              size="xs"
              type="button"
              variant="secondary"
            >
              Indent
            </Button>
            <Button
              onClick={() => lines("", true)}
              size="xs"
              type="button"
              variant="secondary"
            >
              Outdent
            </Button>
          </fieldset>
          <TextArea
            {...props}
            className="min-h-40"
            onChange={(event) => onChange(event.target.value)}
            ref={ref}
            value={value}
          />
        </div>
      )}
    </Field>
  );
}
